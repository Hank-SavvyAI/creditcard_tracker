import { Telegraf, Context, Markup } from 'telegraf';
import { prisma } from '../lib/prisma';
import { i18next, initI18n } from '../lib/i18n';
import jwt from 'jsonwebtoken';
import { generateLoginToken } from '../routes/lineAuth';
import { calculateBenefitDeadline } from '../lib/benefitDeadline';

initI18n();

const bot = new Telegraf(process.env.BOT_TOKEN!);

// Helper function to get user language
async function getUserLanguage(telegramId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: { language: true },
  });
  return user?.language || 'zh-TW';
}

// Start command
bot.command('start', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const language = await getUserLanguage(telegramId);

  // 檢查是否是從網頁登入連結過來的 (參數為 "login")
  const startPayload = ctx.message.text.split(' ')[1];

  let user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
      },
    });
  }

  // 如果是網頁登入流程
  if (startPayload === 'login') {
    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegramId },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // 建立跳轉連結 (使用環境變數中的前端網址)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:9000';
    const loginUrl = `${frontendUrl}/auth/callback?token=${token}`;

    await ctx.reply(
      language === 'zh-TW'
        ? `✅ 登入成功！\n\n請點擊下方連結返回網頁：\n${loginUrl}\n\n或直接在瀏覽器中開啟該連結。`
        : `✅ Login successful!\n\nClick the link below to return to the web:\n${loginUrl}\n\nOr open this link in your browser.`,
      Markup.inlineKeyboard([
        [Markup.button.url(language === 'zh-TW' ? '🌐 返回網頁' : '🌐 Back to Web', loginUrl)]
      ])
    );

    return;
  }

  // 一般的 /start 指令
  // Generate auto-login token for website button
  const token = await generateLoginToken(user.id, 'TELEGRAM');
  const backendUrl = process.env.BACKEND_URL || 'https://api.savvyaihelper.com';
  const autoLoginUrl = `${backendUrl}/api/auth/token?token=${token}`;

  await ctx.reply(
    language === 'zh-TW'
      ? '🎉 歡迎使用信用卡福利追蹤系統！\n\n您可以使用下方選單查詢即將到期的福利，或是開啟網站進行完整管理。'
      : '🎉 Welcome to Credit Card Benefits Tracker!\n\nUse the menu below to check expiring benefits, or open the website for full management.',
    {
      reply_markup: {
        keyboard: [
          [i18next.t('commands.mycards', { lng: language })],
          [language === 'zh-TW' ? '📅 7天內到期' : '📅 Due in 7 days'],
          [language === 'zh-TW' ? '📆 當月到期福利' : '📆 This month', language === 'zh-TW' ? '📆 當季到期福利' : '📆 This quarter'],
          [i18next.t('commands.settings', { lng: language })],
        ],
        resize_keyboard: true,
      }
    }
  );

  // Send website button as separate message
  await ctx.reply(
    language === 'zh-TW' ? '💻 點擊下方按鈕開啟網站：' : '💻 Click below to open website:',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: language === 'zh-TW' ? '💻 開啟網站' : '💻 Open Website', web_app: { url: autoLoginUrl } }]
        ]
      }
    }
  );
});

// My cards command
bot.hears(/我的信用卡|My Cards/, async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const language = await getUserLanguage(telegramId);

  const user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user) {
    return ctx.reply('Please start the bot first with /start');
  }

  const userCards = await prisma.userCard.findMany({
    where: { userId: user.id },
    include: {
      card: {
        include: {
          benefits: {
            where: {
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (userCards.length === 0) {
    return ctx.reply(language === 'zh-TW' ? '您還沒有新增任何信用卡' : 'You have no cards yet');
  }

  let message = language === 'zh-TW' ? '📇 您的信用卡：\n\n' : '📇 Your Cards:\n\n';
  userCards.forEach((uc, index) => {
    const cardName = language === 'zh-TW' ? uc.card.name : (uc.card.nameEn || uc.card.name);
    const bank = uc.card.bank;
    message += `${index + 1}. ${bank} - ${cardName}\n`;
    if (uc.nickname) {
      message += `   ${language === 'zh-TW' ? '別名' : 'Nickname'}: ${uc.nickname}\n`;
    }

    // List benefits for this card
    if (uc.card.benefits.length > 0) {
      message += `   ${language === 'zh-TW' ? '福利' : 'Benefits'}:\n`;
      uc.card.benefits.forEach((benefit, idx) => {
        const benefitTitle = language === 'zh-TW' ? benefit.title : (benefit.titleEn || benefit.title);
        message += `   ${idx + 1}. ${benefitTitle}`;

        // Add cycle type info
        if (benefit.cycleType) {
          const cycleMap = {
            'MONTHLY': language === 'zh-TW' ? '每月' : 'Monthly',
            'QUARTERLY': language === 'zh-TW' ? '每季' : 'Quarterly',
            'SEMI_ANNUALLY': language === 'zh-TW' ? '半年' : 'Semi-annually',
            'ANNUALLY': language === 'zh-TW' ? '每年' : 'Annually',
          };
          message += ` [${cycleMap[benefit.cycleType as keyof typeof cycleMap] || benefit.cycleType}]`;
        }

        // Add amount if available
        if (benefit.amount) {
          message += ` - ${benefit.currency} ${benefit.amount}`;
        }

        message += '\n';
      });
    } else {
      message += `   ${language === 'zh-TW' ? '(尚無福利)' : '(No benefits)'}\n`;
    }

    message += '\n';
  });

  // Generate auto-login token
  const token = await generateLoginToken(user.id, 'TELEGRAM');
  const backendUrl = process.env.BACKEND_URL || 'https://api.savvyaihelper.com';
  const autoLoginUrl = `${backendUrl}/api/auth/token?token=${token}`;

  await ctx.reply(
    message,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: language === 'zh-TW' ? '💻 開啟網站管理' : '💻 Open Website', web_app: { url: autoLoginUrl } }]
        ]
      }
    }
  );
});

// Helper function to query benefits expiring within time range
async function queryExpiringBenefits(
  userId: number,
  range: '7' | 'month' | 'quarter',
  language: string
) {
  const year = new Date().getFullYear();
  const now = new Date();

  const userCards = await prisma.userCard.findMany({
    where: { userId },
    include: {
      card: {
        include: {
          benefits: {
            where: {
              isActive: true,
              notifiable: true,
            },
            include: {
              userBenefits: {
                where: {
                  userId,
                  year,
                },
              },
            },
          },
        },
      },
    },
  });

  if (userCards.length === 0) {
    return {
      message: language === 'zh-TW' ? '您還沒有新增任何信用卡' : 'You have no cards yet',
      hasCards: false,
    };
  }

  // Calculate time range
  let endDate: Date;
  let rangeLabel: string;

  if (range === '7') {
    endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    rangeLabel = language === 'zh-TW' ? '7天內到期' : 'Due in 7 days';
  } else if (range === 'month') {
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    rangeLabel = language === 'zh-TW' ? '當月到期' : 'This month';
  } else if (range === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    const quarterEndMonth = (quarter + 1) * 3;
    endDate = new Date(now.getFullYear(), quarterEndMonth, 0, 23, 59, 59, 999);
    rangeLabel = language === 'zh-TW' ? '當季到期' : 'This quarter';
  } else {
    return {
      message: 'Invalid range',
      hasCards: true,
    };
  }

  let message = language === 'zh-TW' ? `📊 ${rangeLabel}福利：\n\n` : `📊 ${rangeLabel} Benefits:\n\n`;
  let foundBenefits = false;

  for (const uc of userCards) {
    const cardName = language === 'zh-TW' ? uc.card.name : (uc.card.nameEn || uc.card.name);
    let cardBenefits = '';

    for (const benefit of uc.card.benefits) {
      const userBenefit = benefit.userBenefits[0];

      // Skip completed benefits
      if (userBenefit?.isCompleted) {
        continue;
      }

      // Calculate deadline
      const deadline = calculateBenefitDeadline({
        cycleType: benefit.cycleType,
        isPersonalCycle: benefit.isPersonalCycle,
        customStartDate: userBenefit?.customStartDate,
        year,
        cycleNumber: userBenefit?.cycleNumber,
      });

      // Check if benefit is within range
      if (deadline && deadline >= now && deadline <= endDate) {
        const title = language === 'zh-TW' ? benefit.title : (benefit.titleEn || benefit.title);
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        cardBenefits += `  ⏳ ${title}`;
        if (benefit.amount) {
          cardBenefits += ` (${benefit.currency} ${benefit.amount})`;
        }
        cardBenefits += `\n     ⏰ ${language === 'zh-TW' ? '剩餘' : 'Days left'}: ${daysLeft} ${language === 'zh-TW' ? '天' : 'days'}\n`;
        foundBenefits = true;
      }
    }

    if (cardBenefits) {
      message += `🏦 ${cardName}\n${cardBenefits}\n`;
    }
  }

  if (!foundBenefits) {
    message += language === 'zh-TW'
      ? '✨ 目前沒有即將到期的福利！'
      : '✨ No benefits expiring soon!';
  }

  return {
    message,
    hasCards: true,
  };
}

// Handle keyboard button presses for benefit queries
bot.hears(/📅 7天內到期|📅 Due in 7 days/, async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const language = await getUserLanguage(telegramId);

  const user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user) {
    return ctx.reply('Please start the bot first with /start');
  }

  const result = await queryExpiringBenefits(user.id, '7', language);

  const token = await generateLoginToken(user.id, 'TELEGRAM');
  const backendUrl = process.env.BACKEND_URL || 'https://api.savvyaihelper.com';
  const autoLoginUrl = `${backendUrl}/api/auth/token?token=${token}`;

  await ctx.reply(
    result.message,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: language === 'zh-TW' ? '💻 開啟網站查看詳情' : '💻 Open Website', web_app: { url: autoLoginUrl } }]
        ]
      }
    }
  );
});

bot.hears(/📆 當月(到期)?福利|📆 This month/, async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const language = await getUserLanguage(telegramId);

  const user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user) {
    return ctx.reply('Please start the bot first with /start');
  }

  const result = await queryExpiringBenefits(user.id, 'month', language);

  const token = await generateLoginToken(user.id, 'TELEGRAM');
  const backendUrl = process.env.BACKEND_URL || 'https://api.savvyaihelper.com';
  const autoLoginUrl = `${backendUrl}/api/auth/token?token=${token}`;

  await ctx.reply(
    result.message,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: language === 'zh-TW' ? '💻 開啟網站查看詳情' : '💻 Open Website', web_app: { url: autoLoginUrl } }]
        ]
      }
    }
  );
});

bot.hears(/📆 當季(到期)?福利|📆 This quarter/, async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const language = await getUserLanguage(telegramId);

  const user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user) {
    return ctx.reply('Please start the bot first with /start');
  }

  const result = await queryExpiringBenefits(user.id, 'quarter', language);

  const token = await generateLoginToken(user.id, 'TELEGRAM');
  const backendUrl = process.env.BACKEND_URL || 'https://api.savvyaihelper.com';
  const autoLoginUrl = `${backendUrl}/api/auth/token?token=${token}`;

  await ctx.reply(
    result.message,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: language === 'zh-TW' ? '💻 開啟網站查看詳情' : '💻 Open Website', web_app: { url: autoLoginUrl } }]
        ]
      }
    }
  );
});

// Settings command
bot.hears(/設定|Settings/, async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const language = await getUserLanguage(telegramId);

  await ctx.reply(
    language === 'zh-TW' ? '請選擇語言 / Please select language:' : 'Please select language / 請選擇語言:',
    Markup.inlineKeyboard([
      [Markup.button.callback('繁體中文', 'lang_zh-TW')],
      [Markup.button.callback('English', 'lang_en')],
    ])
  );
});

// Language selection callback
bot.action(/lang_(.+)/, async (ctx) => {
  const language = ctx.match[1];
  const telegramId = ctx.from!.id.toString();

  await prisma.user.update({
    where: { telegramId },
    data: { language },
  });

  await ctx.answerCbQuery(language === 'zh-TW' ? '語言已更新' : 'Language updated');
  await ctx.reply(
    language === 'zh-TW' ? '語言已設定為繁體中文' : 'Language set to English',
    Markup.keyboard([
      [i18next.t('commands.mycards', { lng: language })],
      [language === 'zh-TW' ? '📅 7天內到期' : '📅 Due in 7 days'],
      [language === 'zh-TW' ? '📆 當月到期福利' : '📆 This month', language === 'zh-TW' ? '📆 當季到期福利' : '📆 This quarter'],
      [i18next.t('commands.settings', { lng: language })],
    ]).resize()
  );
});

export const startTelegramBot = async () => {
  await bot.launch();
  console.log('🤖 Telegram bot started');
};

// Export bot instance for use in notification service
export { bot };

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
