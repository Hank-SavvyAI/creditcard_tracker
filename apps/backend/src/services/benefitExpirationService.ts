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

    // 第一步：過濾出需要提醒的福利
    const expiringBenefits: Array<{
      userBenefit: any;
      benefit: any;
      benefitId: number;
      daysRemaining: number;
    }> = [];

    console.log(`📋 開始檢查 ${userBenefits.length} 個福利...`);

    for (const userBenefit of userBenefits) {
      const cardName = userBenefit.benefit?.card?.name || 'Unknown';
      const benefitTitle = userBenefit.benefit?.title || 'Unknown';
      const logPrefix = `[UserBenefit ID: ${userBenefit.id}] [Benefit ID: ${userBenefit.benefitId}] [User ID: ${userBenefit.userId}] ${cardName} - ${benefitTitle}:`;

      if (!userBenefit.periodEnd) {
        console.log(`⏭️  ${logPrefix} 跳過 - 沒有 periodEnd`);
        continue;
      }

      // Skip if benefit is hidden or notification is disabled
      if (userBenefit.isHidden) {
        console.log(`⏭️  ${logPrefix} 跳過 - 福利已隱藏`);
        continue;
      }

      if (!userBenefit.notificationEnabled) {
        console.log(`⏭️  ${logPrefix} 跳過 - 通知已關閉`);
        continue;
      }

      // Skip custom benefits or benefits without associated benefit data
      if (userBenefit.isCustom) {
        console.log(`⏭️  ${logPrefix} 跳過 - 自訂福利`);
        continue;
      }

      if (!userBenefit.benefit || !userBenefit.benefitId) {
        console.log(`⏭️  ${logPrefix} 跳過 - 沒有關聯的福利資料`);
        continue;
      }

      const benefit = userBenefit.benefit;
      const benefitId = userBenefit.benefitId;

      // 計算剩餘天數
      const daysUntilExpiry = Math.ceil(
        (userBenefit.periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 使用者設定的提醒天數
      const userReminderDays = userBenefit.reminderDays ?? benefit.reminderDays;

      // 漸進式提醒邏輯：
      // 1. 第一次通知：使用者設定的天數
      // 2. 後續通知：3天 和 1天（只在使用者設定 >= 該天數時才觸發）
      const shouldNotify =
        daysUntilExpiry === userReminderDays ||  // 第一次通知
        (daysUntilExpiry === 3 && userReminderDays >= 3) ||  // 3天提醒
        daysUntilExpiry === 1;  // 最後1天一定提醒

      if (shouldNotify && daysUntilExpiry > 0) {
        let notifyReason = '';
        if (daysUntilExpiry === userReminderDays) {
          notifyReason = `第一次提醒 (使用者設定 ${userReminderDays} 天)`;
        } else if (daysUntilExpiry === 3) {
          notifyReason = '3 天提醒節點';
        } else if (daysUntilExpiry === 1) {
          notifyReason = '最後 1 天提醒';
        }

        console.log(`✅ ${logPrefix} 需要通知 - ${notifyReason}`);
        console.log(`   - 到期日: ${userBenefit.periodEnd.toLocaleDateString('zh-TW')} (還有 ${daysUntilExpiry} 天)`);
        console.log(`   - 使用者設定: ${userReminderDays} 天前開始提醒`);

        expiringBenefits.push({
          userBenefit,
          benefit,
          benefitId,
          daysRemaining: daysUntilExpiry,
        });
      } else if (daysUntilExpiry > userReminderDays) {
        console.log(`⏰ ${logPrefix} 尚未到提醒時間`);
        console.log(`   - 到期日: ${userBenefit.periodEnd.toLocaleDateString('zh-TW')} (還有 ${daysUntilExpiry} 天)`);
        console.log(`   - 使用者設定: ${userReminderDays} 天前開始提醒 (還要等 ${daysUntilExpiry - userReminderDays} 天)`);
      } else if (daysUntilExpiry <= 0) {
        console.log(`⏭️  ${logPrefix} 跳過 - 已超過到期日`);
        console.log(`   - 到期日: ${userBenefit.periodEnd.toLocaleDateString('zh-TW')}`);
      } else {
        // 在提醒時間內，但不在提醒節點
        const nextMilestone = daysUntilExpiry > 3 ? 3 : (daysUntilExpiry > 1 ? 1 : null);
        console.log(`⏭️  ${logPrefix} 不在提醒節點 (下次提醒: ${nextMilestone ? nextMilestone + ' 天' : '無'})`);
        console.log(`   - 到期日: ${userBenefit.periodEnd.toLocaleDateString('zh-TW')} (還有 ${daysUntilExpiry} 天)`);
        console.log(`   - 使用者設定: ${userReminderDays} 天前開始提醒`);
      }
    }

    console.log(`\n📊 檢查完成: ${expiringBenefits.length} 個福利需要通知\n`);

    // 第二步：按使用者分組
    const benefitsByUser = new Map<number, typeof expiringBenefits>();
    for (const item of expiringBenefits) {
      const userId = item.userBenefit.userId;
      if (!benefitsByUser.has(userId)) {
        benefitsByUser.set(userId, []);
      }
      benefitsByUser.get(userId)!.push(item);
    }

    // 第三步：每個使用者發送一次通知（包含所有即將到期的福利）
    let notificationsSent = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    // 🧪 測試模式：只發送給使用者 ID 3
    const TEST_MODE = process.env.NOTIFICATION_TEST_MODE === 'true';
    const TEST_USER_ID = 3;

    if (TEST_MODE) {
      console.log('🧪 TEST MODE: Only sending notifications to user ID 3');
    }

    for (const [userId, benefits] of benefitsByUser.entries()) {
      // 🧪 測試模式：跳過非測試使用者
      if (TEST_MODE && userId !== TEST_USER_ID) {
        console.log(`⏭️  Skipping user ${userId} (test mode enabled, only sending to user ${TEST_USER_ID})`);
        continue;
      }
      try {
        // 建立通知內容
        const title = `💳 ${benefits.length} 個信用卡福利即將到期`;

        // 按到期日排序（最近到期的在前）
        benefits.sort((a, b) => a.daysRemaining - b.daysRemaining);

        // 建立福利清單
        const benefitList = benefits.map(item => {
          const cardName = item.benefit.card.name;
          const benefitTitle = item.benefit.title;
          const days = item.daysRemaining;
          const date = item.userBenefit.periodEnd.toLocaleDateString('zh-TW');
          return `• ${cardName} - ${benefitTitle}\n  還有 ${days} 天到期 (${date})`;
        }).join('\n\n');

        const body = `您有 ${benefits.length} 個福利即將到期：\n\n${benefitList}`;

        // 發送通知
        const result = await sendNotification({
          userId,
          title,
          body,
          benefitId: benefits[0].benefitId, // 使用第一個福利的 ID
          notificationType: 'benefit-expiration',
          data: {
            benefitCount: benefits.length,
            benefits: benefits.map(b => ({
              userBenefitId: b.userBenefit.id,
              benefitId: b.benefitId,
              daysRemaining: b.daysRemaining,
            })),
          },
        });

        if (result.success) {
          notificationsSent++;
          console.log(`✅ Sent notification to user ${userId} for ${benefits.length} expiring benefits`);
        } else {
          errors++;
          const errorMsg = `User ${userId}: ${result.results?.errors?.join(', ') || 'Unknown error'}`;
          errorMessages.push(errorMsg);
          console.error(`❌ Failed to send notification to user ${userId}:`, result.results?.errors);
        }
      } catch (error: any) {
        errors++;
        const errorMsg = `User ${userId}: ${error.message}`;
        errorMessages.push(errorMsg);
        console.error(`❌ Error sending notification to user ${userId}:`, error);
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
        itemsProcessed: expiringBenefits.length, // 即將到期的福利總數
        successCount: notificationsSent, // 成功發送通知的使用者數
        failureCount: errors,
        errorMessage: errorMessages.length > 0 ? errorMessages.join('\n') : null,
        details: JSON.stringify({
          totalBenefitsChecked: userBenefits.length,
          expiringBenefits: expiringBenefits.length,
          usersNotified: notificationsSent,
          errors,
          testMode: TEST_MODE,
          testUserId: TEST_MODE ? TEST_USER_ID : null,
        }),
      },
    });

    console.log(`✅ Benefit expiration check complete:`);
    console.log(`   - Checked: ${userBenefits.length} benefits`);
    console.log(`   - Expiring: ${expiringBenefits.length} benefits`);
    console.log(`   - Users notified: ${notificationsSent}`);
    console.log(`   - Errors: ${errors}`);
    if (TEST_MODE) {
      console.log(`   - 🧪 TEST MODE: Only sent to user ${TEST_USER_ID}`);
    }

    return {
      success: true,
      notificationsSent, // 成功發送通知的使用者數量
      errors, // 失敗的使用者數量
      totalChecked: userBenefits.length, // 檢查的福利總數
      expiringCount: expiringBenefits.length, // 即將到期的福利數量
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
