import cron from 'node-cron';
import { checkAndNotifyExpiringBenefits, archiveExpiredBenefits } from './benefitExpirationService';

/**
 * 啟動定時任務
 */
export function startScheduledTasks() {
  // 每天早上 9:00 檢查即將到期的福利並發送通知
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running daily benefit expiration check...');
    await checkAndNotifyExpiringBenefits();
  }, {
    timezone: 'Asia/Taipei'
  });

  // 每天凌晨 2:00 歸檔已過期的福利
  cron.schedule('0 2 * * *', async () => {
    console.log('📦 Running daily benefit archiving...');
    await archiveExpiredBenefits();
  }, {
    timezone: 'Asia/Taipei'
  });

  console.log('✅ Scheduled tasks initialized:');
  console.log('  - Daily benefit expiration check: 9:00 AM (Asia/Taipei)');
  console.log('  - Daily benefit archiving: 2:00 AM (Asia/Taipei)');
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
