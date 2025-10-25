import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import { prisma } from './lib/prisma';
import { startTelegramBot } from './bot';
import { startReminderCron } from './services/reminder';
import { startScheduledTasks } from './services/scheduledTasks';

// Routes
import authRoutes from './routes/auth';
import cardRoutes from './routes/cards';
import benefitRoutes from './routes/benefits';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import googleAuthRoutes from './routes/googleAuth';
import pushNotificationRoutes from './routes/pushNotifications';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:9000',
    'http://poioit.tplinkdns.com:9000',
    'http://poioit.tplinkdns.com',
    'https://benefits.savvyaihelper.com',
    process.env.FRONTEND_URL
  ].filter(Boolean) as string[],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(passport.initialize());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/benefits', benefitRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/push', pushNotificationRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Start Telegram bot
    if (process.env.BOT_TOKEN) {
      await startTelegramBot();
      console.log('🤖 Telegram bot started');
    }

    // Start reminder cron job
    startReminderCron();
    console.log('⏰ Reminder cron started');

    // Start scheduled tasks (benefit expiration checks and archiving)
    startScheduledTasks();
    console.log('📅 Scheduled tasks started');

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main();
