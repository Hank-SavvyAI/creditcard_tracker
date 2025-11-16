import cron from 'node-cron';
import { checkAndNotifyExpiringBenefits, archiveExpiredBenefits } from './benefitExpirationService';

/**
 * 啟動定時任務
 */
export function startScheduledTasks() {
  // 檢查是否啟用 cron
  const enableCron = process.env.ENABLE_CRON !== 'false';

  console.log('🔧 Initializing scheduled tasks...');
  console.log('   ENABLE_CRON:', enableCron);
  console.log('   Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('   Current time:', new Date().toISOString());
  console.log('   Current time (Asia/Taipei):', new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }));

  if (!enableCron) {
    console.log('⚠️  Node-cron is DISABLED (ENABLE_CRON=false)');
    console.log('   Please use Azure Logic Apps or external scheduler to trigger:');
    console.log('   - POST /api/admin/manual/check-expiring-benefits (daily at 9:00 AM)');
    console.log('   - POST /api/admin/manual/archive-expired-benefits (daily at 2:00 AM)');
    createStartupLog();
    return;
  }

  // 每天早上 9:00 檢查即將到期的福利並發送通知
  const expirationCheck = cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running daily benefit expiration check...');
    await checkAndNotifyExpiringBenefits();
  }, {
    timezone: 'Asia/Taipei'
  });

  // 每天凌晨 2:00 歸檔已過期的福利
  const archiving = cron.schedule('0 2 * * *', async () => {
    console.log('📦 Running daily benefit archiving...');
    await archiveExpiredBenefits();
  }, {
    timezone: 'Asia/Taipei'
  });

  console.log('✅ Scheduled tasks initialized:');
  console.log('  - Daily benefit expiration check: 9:00 AM (Asia/Taipei)');
  console.log('  - Daily benefit archiving: 2:00 AM (Asia/Taipei)');
  console.log('  - Cron task status:', {
    expirationCheck: expirationCheck ? 'running' : 'failed',
    archiving: archiving ? 'running' : 'failed'
  });

  // 新增：在啟動時建立一條測試記錄，確認cronjob logging功能正常
  createStartupLog();
}

/**
 * 建立啟動記錄，用於確認 cronjob logging 功能正常
 */
async function createStartupLog() {
  try {
    const { prisma } = await import('../lib/prisma');
    const startTime = new Date();

    await prisma.cronJobLog.create({
      data: {
        jobName: 'system-startup',
        status: 'SUCCESS',
        startedAt: startTime,
        completedAt: new Date(),
        durationMs: 0,
        itemsProcessed: 0,
        successCount: 0,
        failureCount: 0,
        details: JSON.stringify({
          message: 'Scheduled tasks initialized',
          serverTime: new Date().toISOString(),
          taipeiTime: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      }
    });

    console.log('✅ Startup log created successfully');
  } catch (error) {
    console.error('❌ Failed to create startup log:', error);
  }
}

/**
 * 手動觸發檢查（用於測試或手動執行）
 */
export async function manualCheckExpiringBenefits() {
  console.log('🔧 Manual trigger: checking expiring benefits...');
  return await checkAndNotifyExpiringBenefits();
}

/**
 * 手動觸發歸檔（用於測試或手動執行）
 */
export async function manualArchiveExpiredBenefits() {
  console.log('🔧 Manual trigger: archiving expired benefits...');
  return await archiveExpiredBenefits();
}
