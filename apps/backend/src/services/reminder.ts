import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { prisma } from '../lib/prisma';

const bot = new Telegraf(process.env.BOT_TOKEN!);

function getDeadlineDate(benefit: any, year: number): Date | null {
  if (!benefit.endMonth || !benefit.endDay) return null;

  return new Date(year, benefit.endMonth - 1, benefit.endDay);
}

async function checkAndSendReminders() {
  const today = new Date();
  const currentYear = today.getFullYear();

  // Get all active users
  const users = await prisma.user.findMany({
    where: {
      cards: {
        some: {},
      },
    },
    include: {
      cards: {
        include: {
          card: {
            include: {
              benefits: {
                where: { isActive: true },
              },
            },
          },
        },
      },
      benefits: {
        where: {
          year: currentYear,
          isCompleted: false,
        },
      },
    },
  });

  for (const user of users) {
    // Build a map of user's benefit settings
    const userBenefitMap = new Map(
      user.benefits.map((ub) => [ub.benefitId, ub])
    );

    for (const userCard of user.cards) {
      for (const benefit of userCard.card.benefits) {
        // Skip if benefit doesn't support notifications
        if (!benefit.notifiable) continue;

        const userBenefit = userBenefitMap.get(benefit.id);

        // Skip if already completed
        if (userBenefit?.isCompleted) continue;

        // Skip if user has disabled notifications for this benefit
        if (userBenefit && userBenefit.notificationEnabled === false) continue;

        const deadline = getDeadlineDate(benefit, currentYear);
        if (!deadline) continue;

        const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Use user's custom reminder days if set, otherwise use benefit's default
        const reminderDays = userBenefit?.reminderDays ?? benefit.reminderDays;

        // Send reminder if within reminder days
        if (daysUntilDeadline > 0 && daysUntilDeadline <= reminderDays) {
          const cardName = user.language === 'zh-TW' ? userCard.card.name : (userCard.card.nameEn || userCard.card.name);
          const benefitTitle = user.language === 'zh-TW' ? benefit.title : (benefit.titleEn || benefit.title);

          const message = user.language === 'zh-TW'
            ? `⏰ 提醒：${cardName} 的「${benefitTitle}」將於 ${daysUntilDeadline} 天後到期！`
            : `⏰ Reminder: "${benefitTitle}" for ${cardName} expires in ${daysUntilDeadline} days!`;

          // Only send Telegram messages to users with Telegram IDs
          if (user.telegramId) {
            try {
              await bot.telegram.sendMessage(user.telegramId, message);
            } catch (error) {
              console.error(`Failed to send reminder to user ${user.telegramId}:`, error);
            }
          }
        }
      }
    }
  }
}

export function startReminderCron() {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running reminder check...');
    await checkAndSendReminders();
  });
}
