import { prisma } from '../lib/prisma';
import { sendNotification } from './notificationService';

/**
 * 檢查並發送即將到期的福利提醒
 */
export async function checkAndNotifyExpiringBenefits() {
  console.log('🔍 Checking for expiring benefits...');

  try {
    const now = new Date();

    // 查詢所有啟用通知且未完成的福利
    const userBenefits = await prisma.userBenefit.findMany({
      where: {
        notificationEnabled: true,
        isCompleted: false,
        periodEnd: {
          not: null,
        },
      },
      include: {
        user: true,
        benefit: {
          include: {
            card: true,
          },
        },
      },
    });

    let notificationsSent = 0;
    let errors = 0;

    for (const userBenefit of userBenefits) {
      if (!userBenefit.periodEnd) continue;

      // Skip custom benefits or benefits without associated benefit data
      if (userBenefit.isCustom || !userBenefit.benefit || !userBenefit.benefitId) {
        continue;
      }

      // Type guard: at this point we know benefit and benefitId exist
      const benefit = userBenefit.benefit;
      const benefitId = userBenefit.benefitId;

      // 計算提醒天數（使用自訂值或 Benefit 預設值）
      const reminderDays = userBenefit.reminderDays ?? benefit.reminderDays;

      // 計算提醒日期
      const reminderDate = new Date(userBenefit.periodEnd);
      reminderDate.setDate(reminderDate.getDate() - reminderDays);

      // 如果現在已經到了提醒日期，且還沒超過到期日
      if (now >= reminderDate && now <= userBenefit.periodEnd) {
        const daysRemaining = Math.ceil(
          (userBenefit.periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        const title = '💳 信用卡福利即將到期';
        const body = `您的 ${benefit.card.name} - ${benefit.title} 還有 ${daysRemaining} 天到期（${userBenefit.periodEnd.toLocaleDateString('zh-TW')}）`;

        try {
          const result = await sendNotification({
            userId: userBenefit.userId,
            title,
            body,
            benefitId: benefitId,
            data: {
              userBenefitId: userBenefit.id,
              benefitId: benefitId,
              daysRemaining,
            },
          });

          if (result.success) {
            notificationsSent++;
            console.log(`✅ Sent notification to user ${userBenefit.userId} for benefit ${benefit.title}`);
          } else {
            errors++;
            console.error(`❌ Failed to send notification to user ${userBenefit.userId}:`, result.results?.errors);
          }
        } catch (error) {
          errors++;
          console.error(`❌ Error sending notification to user ${userBenefit.userId}:`, error);
        }
      }
    }

    console.log(`✅ Benefit expiration check complete: ${notificationsSent} notifications sent, ${errors} errors`);

    return {
      success: true,
      notificationsSent,
      errors,
      totalChecked: userBenefits.length,
    };
  } catch (error) {
    console.error('❌ Failed to check expiring benefits:', error);
    return {
      success: false,
      error: 'Failed to check expiring benefits',
    };
  }
}

/**
 * 歸檔已過期的福利記錄
 */
export async function archiveExpiredBenefits() {
  console.log('📦 Archiving expired benefits...');

  try {
    const now = new Date();

    // 查詢已過期的福利（periodEnd 已過且未完成）
    const expiredBenefits = await prisma.userBenefit.findMany({
      where: {
        periodEnd: {
          lt: now,
        },
        isCompleted: false,
      },
      include: {
        usages: true,
      },
    });

    let archivedCount = 0;

    for (const benefit of expiredBenefits) {
      // Skip custom benefits (they don't have benefitId and don't need archiving)
      if (benefit.isCustom || !benefit.benefitId) {
        continue;
      }

      try {
        // 創建歷史記錄
        await prisma.userBenefitHistory.create({
          data: {
            userId: benefit.userId,
            userCardId: benefit.userCardId,
            benefitId: benefit.benefitId,
            year: benefit.year,
            cycleNumber: benefit.cycleNumber ?? undefined,
            periodEnd: benefit.periodEnd,
            isCompleted: benefit.isCompleted,
            completedAt: benefit.completedAt,
            notes: benefit.notes,
            reminderDays: benefit.reminderDays,
            notificationEnabled: benefit.notificationEnabled,
            usedAmount: benefit.usedAmount,
            createdAt: benefit.createdAt,
            updatedAt: benefit.updatedAt,
            usages: {
              create: benefit.usages.map(usage => ({
                amount: usage.amount,
                usedAt: usage.usedAt,
                note: usage.note,
                createdAt: usage.createdAt,
                updatedAt: usage.updatedAt,
              })),
            },
          },
        });

        // 刪除原始記錄（包含使用記錄，因為有 onDelete: Cascade）
        await prisma.userBenefit.delete({
          where: { id: benefit.id },
        });

        archivedCount++;
      } catch (error) {
        console.error(`❌ Failed to archive benefit ${benefit.id}:`, error);
      }
    }

    console.log(`✅ Archived ${archivedCount} expired benefits`);

    return {
      success: true,
      archivedCount,
    };
  } catch (error) {
    console.error('❌ Failed to archive expired benefits:', error);
    return {
      success: false,
      error: 'Failed to archive expired benefits',
    };
  }
}
