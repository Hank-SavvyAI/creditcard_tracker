import { Router, RequestHandler } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, isAdmin, AuthRequest } from '../middleware/auth';
import { manualCheckExpiringBenefits, manualArchiveExpiredBenefits } from '../services/scheduledTasks';
import { sendNotification } from '../services/notificationService';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate as RequestHandler, isAdmin as RequestHandler);

// Get all unique benefit categories
router.get('/benefit-categories', async (req: AuthRequest, res) => {
  try {
    // Get all benefits with their categories
    const benefits = await prisma.benefit.findMany({
      select: {
        category: true,
        categoryEn: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });

    // Extract unique categories
    const categories = benefits.map(b => ({
      zh: b.category,
      en: b.categoryEn || b.category,
    }));

    res.json(categories);
  } catch (error) {
    console.error('Failed to fetch benefit categories:', error);
    res.status(500).json({ error: 'Failed to fetch benefit categories' });
  }
});

// Create new credit card
router.post('/cards', async (req: AuthRequest, res) => {
  try {
    const card = await prisma.creditCard.create({
      data: req.body,
    });
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Update credit card
router.patch('/cards/:id', async (req: AuthRequest, res) => {
  try {
    const card = await prisma.creditCard.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Delete credit card
router.delete('/cards/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.creditCard.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Create benefit for a card
router.post('/cards/:cardId/benefits', async (req: AuthRequest, res) => {
  try {
    console.log('Creating benefit for card:', req.params.cardId);
    console.log('Request body:', req.body);

    // 自動設定 cycleType（如果前端沒有提供）
    let cycleType = req.body.cycleType;

    if (!cycleType && req.body.frequency) {
      // 根據 frequency 自動設定 cycleType
      switch (req.body.frequency) {
        case 'MONTHLY':
        case 'QUARTERLY':
        case 'YEARLY':
          cycleType = req.body.frequency;
          break;
        case 'SEMI_ANNUALLY':
          cycleType = 'YEARLY'; // 半年視為年度週期的一種
          break;
        case 'ONE_TIME':
          cycleType = null; // 一次性福利沒有週期
          break;
        default:
          cycleType = null;
      }
    }

    const benefit = await prisma.benefit.create({
      data: {
        ...req.body,
        cycleType,
        cardId: parseInt(req.params.cardId),
      },
    });
    res.json(benefit);
  } catch (error: any) {
    console.error('Failed to create benefit:', error);
    res.status(500).json({
      error: 'Failed to create benefit',
      message: error.message,
      details: error
    });
  }
});

// Update benefit
router.patch('/benefits/:id', async (req: AuthRequest, res) => {
  try {
    console.log('Updating benefit:', req.params.id);
    console.log('Request body:', req.body);

    // 自動設定 cycleType（如果 frequency 有變更）
    let updateData = { ...req.body };

    if (req.body.frequency && !req.body.cycleType) {
      switch (req.body.frequency) {
        case 'MONTHLY':
        case 'QUARTERLY':
        case 'YEARLY':
          updateData.cycleType = req.body.frequency;
          break;
        case 'SEMI_ANNUALLY':
          updateData.cycleType = 'YEARLY';
          break;
        case 'ONE_TIME':
          updateData.cycleType = null;
          break;
      }
    }

    const benefit = await prisma.benefit.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });
    res.json(benefit);
  } catch (error: any) {
    console.error('Failed to update benefit:', error);
    res.status(500).json({
      error: 'Failed to update benefit',
      message: error.message,
      details: error
    });
  }
});

// Delete benefit
router.delete('/benefits/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.benefit.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete benefit' });
  }
});

// 手動觸發福利到期檢查（僅供測試）
router.post('/manual/check-expiring-benefits', async (req: AuthRequest, res) => {
  try {
    const result = await manualCheckExpiringBenefits();
    res.json(result);
  } catch (error: any) {
    console.error('Error in manual check:', error);
    res.status(500).json({ error: error.message });
  }
});

// 手動觸發福利歸檔（僅供測試）
router.post('/manual/archive-expired-benefits', async (req: AuthRequest, res) => {
  try {
    const result = await manualArchiveExpiredBenefits();
    res.json(result);
  } catch (error: any) {
    console.error('Error in manual archive:', error);
    res.status(500).json({ error: error.message });
  }
});

// 測試通知功能（僅供測試）
router.post('/manual/test-notification', async (req: AuthRequest, res) => {
  try {
    const { userId, title, body } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await sendNotification({
      userId: parseInt(userId),
      title: title || '測試通知',
      body: body || '這是一則測試通知訊息'
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error in test notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users (admin only)
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        telegramId: true,
        googleId: true,
        lineId: true,
        role: true,
        language: true,
        createdAt: true,
        _count: {
          select: {
            cards: true,
            benefits: true,
            pushSubscriptions: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the response to match frontend expectations
    const formattedUsers = users.map(user => ({
      ...user,
      _count: {
        userCards: user._count.cards,
        userBenefits: user._count.benefits,
        pushSubscriptions: user._count.pushSubscriptions,
      }
    }));

    res.json(formattedUsers);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific user's tracked credit cards (admin only)
router.get('/users/:userId/cards', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const userCards = await prisma.userCard.findMany({
      where: {
        userId: userId
      },
      include: {
        card: {
          include: {
            benefits: true
          }
        }
      },
      orderBy: {
        addedAt: 'desc'
      }
    });

    // Return userCards with card details
    const formattedCards = userCards.map(uc => ({
      id: uc.id,
      card: {
        id: uc.card.id,
        name: uc.card.name,
        nameEn: uc.card.nameEn,
        bank: uc.card.bank,
        bankEn: uc.card.bankEn,
        region: uc.card.region,
        _count: {
          benefits: uc.card.benefits.length
        }
      },
      addedAt: uc.addedAt
    }));

    res.json(formattedCards);
  } catch (error: any) {
    console.error('Error fetching user cards:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get CronJob statistics (admin only)
router.get('/cronjob-stats', async (req: AuthRequest, res) => {
  try {
    const { days = 7 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    // Get recent cron job logs
    const logs = await prisma.cronJobLog.findMany({
      where: {
        startedAt: {
          gte: daysAgo
        }
      },
      orderBy: {
        startedAt: 'desc'
      },
      take: 100
    });

    // Calculate statistics by job name
    const statsByJob = logs.reduce((acc, log) => {
      if (!acc[log.jobName]) {
        acc[log.jobName] = {
          jobName: log.jobName,
          totalRuns: 0,
          successRuns: 0,
          failedRuns: 0,
          partialRuns: 0,
          totalItemsProcessed: 0,
          totalSuccessCount: 0,
          totalFailureCount: 0,
          avgDurationMs: 0,
          lastRun: null as Date | null,
          lastStatus: null as string | null,
        };
      }

      const stats = acc[log.jobName];
      stats.totalRuns++;
      stats.totalItemsProcessed += log.itemsProcessed;
      stats.totalSuccessCount += log.successCount;
      stats.totalFailureCount += log.failureCount;

      if (log.status === 'SUCCESS') stats.successRuns++;
      else if (log.status === 'FAILED') stats.failedRuns++;
      else if (log.status === 'PARTIAL') stats.partialRuns++;

      if (!stats.lastRun || log.startedAt > stats.lastRun) {
        stats.lastRun = log.startedAt;
        stats.lastStatus = log.status;
      }

      return acc;
    }, {} as Record<string, any>);

    // Calculate average duration
    Object.keys(statsByJob).forEach(jobName => {
      const jobLogs = logs.filter(l => l.jobName === jobName);
      const totalDuration = jobLogs.reduce((sum, l) => sum + l.durationMs, 0);
      statsByJob[jobName].avgDurationMs = Math.round(totalDuration / jobLogs.length);
    });

    res.json({
      stats: Object.values(statsByJob),
      recentLogs: logs.slice(0, 20),
    });
  } catch (error: any) {
    console.error('Error fetching cronjob stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Notification statistics (admin only)
router.get('/notification-stats', async (req: AuthRequest, res) => {
  try {
    const { days = 7 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    // Get notification logs
    const logs = await prisma.notificationLog.findMany({
      where: {
        sentAt: {
          gte: daysAgo
        }
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: 1000
    });

    // Statistics by channel
    const statsByChannel = logs.reduce((acc, log) => {
      if (!acc[log.channel]) {
        acc[log.channel] = {
          channel: log.channel,
          total: 0,
          success: 0,
          failed: 0,
          successRate: 0,
        };
      }

      acc[log.channel].total++;
      if (log.status === 'SUCCESS') acc[log.channel].success++;
      else acc[log.channel].failed++;

      return acc;
    }, {} as Record<string, any>);

    // Calculate success rates
    Object.values(statsByChannel).forEach((stat: any) => {
      stat.successRate = stat.total > 0 ? Math.round((stat.success / stat.total) * 100) : 0;
    });

    // Statistics by type
    const statsByType = logs.reduce((acc, log) => {
      if (!acc[log.notificationType]) {
        acc[log.notificationType] = {
          type: log.notificationType,
          total: 0,
          success: 0,
          failed: 0,
        };
      }

      acc[log.notificationType].total++;
      if (log.status === 'SUCCESS') acc[log.notificationType].success++;
      else acc[log.notificationType].failed++;

      return acc;
    }, {} as Record<string, any>);

    // Daily statistics
    const dailyStats = logs.reduce((acc, log) => {
      const date = log.sentAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          total: 0,
          success: 0,
          failed: 0,
        };
      }

      acc[date].total++;
      if (log.status === 'SUCCESS') acc[date].success++;
      else acc[date].failed++;

      return acc;
    }, {} as Record<string, any>);

    res.json({
      totalNotifications: logs.length,
      totalSuccess: logs.filter(l => l.status === 'SUCCESS').length,
      totalFailed: logs.filter(l => l.status === 'FAILED').length,
      successRate: logs.length > 0 ? Math.round((logs.filter(l => l.status === 'SUCCESS').length / logs.length) * 100) : 0,
      statsByChannel: Object.values(statsByChannel),
      statsByType: Object.values(statsByType),
      dailyStats: Object.values(dailyStats).sort((a: any, b: any) => b.date.localeCompare(a.date)),
      recentLogs: logs.slice(0, 50).map(log => ({
        id: log.id,
        userId: log.userId,
        type: log.notificationType,
        channel: log.channel,
        status: log.status,
        title: log.title,
        sentAt: log.sentAt,
        errorMessage: log.errorMessage,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
