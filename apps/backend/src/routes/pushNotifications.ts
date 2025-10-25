import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import webpush from 'web-push';

const router = Router();

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Get VAPID public key (for frontend)
router.get('/public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
router.post('/subscribe', authenticate, async (req: AuthRequest, res) => {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.user!.id;
    const userAgent = req.headers['user-agent'] || null;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findFirst({
      where: { userId, endpoint },
    });

    if (existing) {
      return res.json({ message: 'Already subscribed', subscription: existing });
    }

    // Create new subscription
    const subscription = await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
      },
    });

    res.json({ message: 'Subscription created', subscription });
  } catch (error) {
    console.error('Push subscription error:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticate, async (req: AuthRequest, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user!.id;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }

    await prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Get all subscriptions for current user
router.get('/subscriptions', authenticate, async (req: AuthRequest, res) => {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: req.user!.id },
    });

    res.json(subscriptions);
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Failed to get subscriptions' });
  }
});

// Send test notification (for testing purposes)
router.post('/test', authenticate, async (req: AuthRequest, res) => {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: req.user!.id },
    });

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No subscriptions found' });
    }

    const payload = JSON.stringify({
      title: '測試通知',
      body: '這是一則測試通知，表示 Web Push 功能正常運作！',
      icon: 'https://cdn-icons-png.flaticon.com/512/214/214289.png', // 信用卡圖示
      tag: 'test-notification',
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          // If subscription is invalid/expired, remove it
          if (error.statusCode === 404 || error.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
          return { success: false, endpoint: sub.endpoint, error: error.message };
        }
      })
    );

    res.json({
      message: 'Test notifications sent',
      results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' })
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export default router;
