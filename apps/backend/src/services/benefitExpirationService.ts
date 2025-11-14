import { prisma } from '../lib/prisma';
import { sendNotification } from './notificationService';

/**
 * 檢查並發送即將到期的福利提醒
 */
export async function checkAndNotifyExpiringBenefits() {
  console.log('🔍 Checking for expiring benefits...');
  const startTime = new Date();

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
    const errorMessages: string[] = [];

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
            notificationType: 'benefit-expiration',
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
            const errorMsg = `User ${userBenefit.userId}: ${result.results?.errors?.join(', ') || 'Unknown error'}`;
            errorMessages.push(errorMsg);
            console.error(`❌ Failed to send notification to user ${userBenefit.userId}:`, result.results?.errors);
          }
        } catch (error: any) {
          errors++;
          const errorMsg = `User ${userBenefit.userId}: ${error.message}`;
          errorMessages.push(errorMsg);
          console.error(`❌ Error sending notification to user ${userBenefit.userId}:`, error);
        }
      }
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const status = errors === 0 ? 'SUCCESS' : (notificationsSent > 0 ? 'PARTIAL' : 'FAILED');

    // 記錄到 CronJobLog
    await prisma.cronJobLog.create({
      data: {
        jobName: 'benefit-expiration-check',
        status,
        startedAt: startTime,
        completedAt: endTime,
        durationMs,
        itemsProcessed: userBenefits.length,
        successCount: notificationsSent,
        failureCount: errors,
        errorMessage: errorMessages.length > 0 ? errorMessages.join('\n') : null,
        details: JSON.stringify({
          totalBenefits: userBenefits.length,
          notificationsSent,
          errors,
        }),
      },
    });

    console.log(`✅ Benefit expiration check complete: ${notificationsSent} notifications sent, ${errors} errors`);

    return {
      success: true,
      notificationsSent,
      errors,
      totalChecked: userBenefits.length,
    };
  } catch (error: any) {
    console.error('❌ Failed to check expiring benefits:', error);

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    // 記錄失敗的任務
    await prisma.cronJobLog.create({
      data: {
        jobName: 'benefit-expiration-check',
        status: 'FAILED',
        startedAt: startTime,
        completedAt: endTime,
        durationMs,
        itemsProcessed: 0,
        successCount: 0,
        failureCount: 1,
        errorMessage: error.message,
        details: JSON.stringify({ error: error.stack }),
      },
    });

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
  const startTime = new Date();

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
    let failedCount = 0;
    const errorMessages: string[] = [];

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
      } catch (error: any) {
        failedCount++;
        const errorMsg = `Benefit ${benefit.id}: ${error.message}`;
        errorMessages.push(errorMsg);
        console.error(`❌ Failed to archive benefit ${benefit.id}:`, error);
      }
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const status = failedCount === 0 ? 'SUCCESS' : (archivedCount > 0 ? 'PARTIAL' : 'FAILED');

    // 記錄到 CronJobLog
    await prisma.cronJobLog.create({
      data: {
        jobName: 'benefit-archiving',
        status,
        startedAt: startTime,
        completedAt: endTime,
        durationMs,
        itemsProcessed: expiredBenefits.length,
        successCount: archivedCount,
        failureCount: failedCount,
        errorMessage: errorMessages.length > 0 ? errorMessages.join('\n') : null,
        details: JSON.stringify({
          totalExpired: expiredBenefits.length,
          archived: archivedCount,
          failed: failedCount,
        }),
      },
    });

    console.log(`✅ Archived ${archivedCount} expired benefits`);

    return {
      success: true,
      archivedCount,
    };
  } catch (error: any) {
    console.error('❌ Failed to archive expired benefits:', error);

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    // 記錄失敗的任務
    await prisma.cronJobLog.create({
      data: {
        jobName: 'benefit-archiving',
        status: 'FAILED',
        startedAt: startTime,
        completedAt: endTime,
        durationMs,
        itemsProcessed: 0,
        successCount: 0,
        failureCount: 1,
        errorMessage: error.message,
        details: JSON.stringify({ error: error.stack }),
      },
    });

    return {
      success: false,
      error: 'Failed to archive expired benefits',
    };
  }
}
