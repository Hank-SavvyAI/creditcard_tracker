import { Router, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { authenticate, isAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Track page view (public, no auth required)
router.post('/pageview', async (req, res) => {
  try {
    const {
      userId,
      sessionId,
      page,
      referrer,
      userAgent,
      device,
    } = req.body;

    // Validation
    if (!page) {
      return res.status(400).json({ error: 'Page path is required' });
    }

    // Generate sessionId if not provided
    const finalSessionId = sessionId || randomUUID();

    // Create page view record
    const pageView = await prisma.pageView.create({
      data: {
        userId: userId || null,
        sessionId: finalSessionId,
        page,
        referrer: referrer || null,
        userAgent: userAgent || null,
        device: device || null,
      },
    });

    res.json({
      success: true,
      sessionId: finalSessionId,
      pageViewId: pageView.id,
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
    res.status(500).json({ error: 'Failed to track page view' });
  }
});

// Get analytics data (admin only)
router.get('/stats', authenticate as RequestHandler, isAdmin as RequestHandler, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, page } = req.query;

    // Build filter conditions
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    if (page) {
      where.page = page;
    }

    // Get total page views
    const totalViews = await prisma.pageView.count({ where });

    // Get unique sessions
    const uniqueSessions = await prisma.pageView.findMany({
      where,
      select: { sessionId: true },
      distinct: ['sessionId'],
    });

    // Get page view breakdown
    const pageBreakdown = await prisma.pageView.groupBy({
      by: ['page'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // Get device breakdown
    const deviceBreakdown = await prisma.pageView.groupBy({
      by: ['device'],
      where,
      _count: {
        id: true,
      },
    });

    // Get daily views (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyViews = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT
        DATE("createdAt") as date,
        COUNT(*) as count
      FROM "PageView"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    res.json({
      success: true,
      data: {
        totalViews,
        uniqueSessions: uniqueSessions.length,
        pageBreakdown: pageBreakdown.map(item => ({
          page: item.page,
          count: item._count.id,
        })),
        deviceBreakdown: deviceBreakdown.map(item => ({
          device: item.device || 'unknown',
          count: item._count.id,
        })),
        dailyViews: dailyViews.map(item => ({
          date: item.date,
          count: Number(item.count),
        })),
      },
    });
  } catch (error) {
    console.error('Failed to get analytics stats:', error);
    res.status(500).json({ error: 'Failed to get analytics stats' });
  }
});

// Get recent page views (admin only)
router.get('/recent', authenticate as RequestHandler, isAdmin as RequestHandler, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;

    const recentViews = await prisma.pageView.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: recentViews,
    });
  } catch (error) {
    console.error('Failed to get recent page views:', error);
    res.status(500).json({ error: 'Failed to get recent page views' });
  }
});

export default router;
