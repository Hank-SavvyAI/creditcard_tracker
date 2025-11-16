// Set DATABASE_URL
process.env.DATABASE_URL = 'postgresql://postgres.irzrxbgcbraujrwnghdv:JuQWbSwL*8ZyMe_@aws-1-us-east-1.pooler.supabase.com:5432/postgres';

// Import the manual trigger functions
const { manualCheckExpiringBenefits, manualArchiveExpiredBenefits } = require('./src/services/scheduledTasks');

async function main() {
  console.log('🔧 Manually triggering cron jobs...\n');

  console.log('1️⃣ Running benefit expiration check...');
  const checkResult = await manualCheckExpiringBenefits();
  console.log('Result:', JSON.stringify(checkResult, null, 2));

  console.log('\n2️⃣ Running benefit archiving...');
  const archiveResult = await manualArchiveExpiredBenefits();
  console.log('Result:', JSON.stringify(archiveResult, null, 2));

  console.log('\n✅ Done! Check the database for CronJobLog records.');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
