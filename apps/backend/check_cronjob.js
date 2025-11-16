// Set DATABASE_URL from environment or use default
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.irzrxbgcbraujrwnghdv:JuQWbSwL*8ZyMe_@aws-1-us-east-1.pooler.supabase.com:5432/postgres';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCronJobs() {
  try {
    // Check if CronJobLog table exists and has any records
    const count = await prisma.cronJobLog.count();
    console.log(`Total CronJobLog records: ${count}`);

    if (count > 0) {
      const recent = await prisma.cronJobLog.findMany({
        take: 5,
        orderBy: { startedAt: 'desc' }
      });
      console.log('\nRecent cron jobs:');
      recent.forEach(job => {
        console.log(`- ${job.jobName} (${job.status}) at ${job.startedAt}`);
      });
    } else {
      console.log('\n❌ No CronJobLog records found!');
      console.log('\nPossible reasons:');
      console.log('1. Cron jobs haven\'t run yet (they run at 9:00 AM and 2:00 AM)');
      console.log('2. Server was restarted recently');
      console.log('3. Scheduled tasks are not running');
    }

    // Check current time
    const now = new Date();
    console.log(`\nCurrent time: ${now.toISOString()}`);
    console.log('Next scheduled runs:');
    console.log('- Benefit expiration check: 9:00 AM daily (Asia/Taipei)');
    console.log('- Benefit archiving: 2:00 AM daily (Asia/Taipei)');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCronJobs();
