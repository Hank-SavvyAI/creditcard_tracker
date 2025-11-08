import { Telegraf, Context, Markup } from 'telegraf';
import { prisma } from '../lib/prisma';
import { i18next, initI18n } from '../lib/i18n';
import jwt from 'jsonwebtoken';
import { generateLoginToken } from '../routes/lineAuth';

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
  await ctx.reply(
    i18next.t('welcome', { lng: language }),
    Markup.keyboard([
      [i18next.t('commands.mycards', { lng: language }), i18next.t('commands.benefits', { lng: language })],
      [i18next.t('commands.addcard', { lng: language }), i18next.t('commands.settings', { lng: language })],
    ]).resize()
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
      card: true,
    },
  });

  if (userCards.length === 0) {
    return ctx.reply(language === 'zh-TW' ? '您還沒有新增任何信用卡' : 'You have no cards yet');
  }

  let message = language === 'zh-TW' ? '📇 您的信用卡：\n\n' : '📇 Your Cards:\n\n';
  userCards.forEach((uc, index) => {
    const cardName = language === 'zh-TW' ? uc.card.name : (uc.card.nameEn || uc.card.name);
    message += `${index + 1}. ${cardName}\n`;
    if (uc.nickname) {
      message += `   ${language === 'zh-TW' ? '別名' : 'Nickname'}: ${uc.nickname}\n`;
    }
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

// View benefits command
bot.hears(/查看福利|View Benefits/, async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const language = await getUserLanguage(telegramId);
  const year = new Date().getFullYear();

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
            where: { isActive: true },
            include: {
              userBenefits: {
                where: {
                  userId: user.id,
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
    return ctx.reply(language === 'zh-TW' ? '您還沒有新增任何信用卡' : 'You have no cards yet');
  }

  let message = language === 'zh-TW' ? `📊 ${year} 年度福利：\n\n` : `📊 ${year} Benefits:\n\n`;

  userCards.forEach((uc) => {
    const cardName = language === 'zh-TW' ? uc.card.name : (uc.card.nameEn || uc.card.name);
    message += `🏦 ${cardName}\n`;

    uc.card.benefits.forEach((benefit) => {
      const title = language === 'zh-TW' ? benefit.title : (benefit.titleEn || benefit.title);
      const completed = benefit.userBenefits.length > 0 && benefit.userBenefits[0].isCompleted;
      const status = completed ? '✅' : '⏳';

      message += `  ${status} ${title}`;
      if (benefit.amount) {
        message += ` (${benefit.currency} ${benefit.amount})`;
      }
      message += '\n';
    });
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
      [i18next.t('commands.mycards', { lng: language }), i18next.t('commands.benefits', { lng: language })],
      [i18next.t('commands.addcard', { lng: language }), i18next.t('commands.settings', { lng: language })],
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
