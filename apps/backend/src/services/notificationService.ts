import { prisma } from '../lib/prisma';
import webpush from 'web-push';
import nodemailer from 'nodemailer';
import axios from 'axios';
import { generateLoginToken } from '../routes/lineAuth';

// Email transporter setup (使用 Gmail SMTP)
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // 你的 Gmail 地址
    pass: process.env.EMAIL_PASSWORD, // Gmail App Password
  },
});

interface NotificationData {
  userId: number;
  title: string;
  body: string;
  benefitId?: number;
  data?: any;
  notificationType?: string; // "benefit-expiration" | "benefit-reminder" | "system" | "test"
}

/**
 * 記錄通知到資料庫
 */
async function logNotification(
  userId: number,
  channel: string,
  status: string,
  title: string,
  body: string,
  notificationType: string = 'system',
  errorMessage?: string,
  metadata?: any
) {
  try {
    await prisma.notificationLog.create({
      data: {
        userId,
        channel,
        status,
        title,
        body,
        notificationType,
        errorMessage,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error('Failed to log notification:', error);
  }
}

/**
 * 發送通知給使用者（自動選擇可用的通知方式）
 */
export async function sendNotification(notificationData: NotificationData) {
  const { userId, title, body, data, notificationType = 'system' } = notificationData;

  try {
    // 取得使用者資訊
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        pushSubscriptions: true,
      },
    });

    if (!user) {
      console.error(`User ${userId} not found`);
      return { success: false, error: 'User not found' };
    }

    const results = {
      telegram: false,
      line: false,
      email: false,
      webPush: false,
      errors: [] as string[],
    };

    // 1. 發送 Telegram 通知（如果有 telegramId）
    if (user.telegramId) {
      try {
        await sendTelegramNotification(user.telegramId, userId, title, body);
        results.telegram = true;
        await logNotification(userId, 'telegram', 'SUCCESS', title, body, notificationType, undefined, data);
        console.log(`✅ Telegram notification sent to user ${userId}`);
      } catch (error: any) {
        console.error(`❌ Telegram notification failed for user ${userId}:`, error.message);
        results.errors.push(`Telegram: ${error.message}`);
        await logNotification(userId, 'telegram', 'FAILED', title, body, notificationType, error.message, data);
      }
    }

    // 2. 發送 LINE 通知（如果有 lineId 且功能已啟用）
    if (user.lineId && process.env.LINE_NOTIFY_ENABLED === 'true') {
      try {
        await sendLineNotification(user.lineId, title, body);
        results.line = true;
        await logNotification(userId, 'line', 'SUCCESS', title, body, notificationType, undefined, data);
        console.log(`✅ LINE notification sent to user ${userId}`);
      } catch (error: any) {
        console.error(`❌ LINE notification failed for user ${userId}:`, error.message);
        results.errors.push(`LINE: ${error.message}`);
        await logNotification(userId, 'line', 'FAILED', title, body, notificationType, error.message, data);
      }
    }

    // 3. 發送 Email 通知（如果有 email）
    if (user.email) {
      try {
        await sendEmailNotification(user.email, user.firstName || user.username || 'User', title, body);
        results.email = true;
        await logNotification(userId, 'email', 'SUCCESS', title, body, notificationType, undefined, data);
        console.log(`✅ Email notification sent to user ${userId}`);
      } catch (error: any) {
        console.error(`❌ Email notification failed for user ${userId}:`, error.message);
        results.errors.push(`Email: ${error.message}`);
        await logNotification(userId, 'email', 'FAILED', title, body, notificationType, error.message, data);
      }
    }

    // 4. 發送 Web Push 通知（如果有訂閱）
    if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
      try {
        const pushResults = await sendWebPushNotification(user.pushSubscriptions, title, body, data);
        results.webPush = pushResults.success;
        if (pushResults.success) {
          await logNotification(userId, 'webpush', 'SUCCESS', title, body, notificationType, undefined, { ...data, successCount: pushResults.successCount, totalSubscriptions: user.pushSubscriptions.length });
        } else {
          await logNotification(userId, 'webpush', 'FAILED', title, body, notificationType, pushResults.error, data);
        }
        if (!pushResults.success && pushResults.error) {
          results.errors.push(`Web Push: ${pushResults.error}`);
        }
        console.log(`✅ Web Push notification sent to user ${userId} (${pushResults.successCount}/${user.pushSubscriptions.length} subscriptions)`);
      } catch (error: any) {
        console.error(`❌ Web Push notification failed for user ${userId}:`, error.message);
        results.errors.push(`Web Push: ${error.message}`);
        await logNotification(userId, 'webpush', 'FAILED', title, body, notificationType, error.message, data);
      }
    }

    return {
      success: results.telegram || results.line || results.email || results.webPush,
      results,
    };
  } catch (error) {
    console.error(`Failed to send notification to user ${userId}:`, error);
    return { success: false, error: 'Failed to send notification' };
  }
}

/**
 * 發送 Telegram 通知
 */
async function sendTelegramNotification(telegramId: string, userId: number, title: string, body: string) {
  // 這裡需要使用你的 Telegram bot
  // 暫時先 import bot，實際使用時需要確保 bot 已初始化
  const { bot } = await import('../bot');

  const message = `🔔 *${title}*\n\n${body}`;

  // Generate auto-login token
  const token = await generateLoginToken(userId, 'TELEGRAM');
  const backendUrl = process.env.BACKEND_URL || 'https://api.savvyaihelper.com';
  const autoLoginUrl = `${backendUrl}/api/auth/token?token=${token}`;

  await bot.telegram.sendMessage(telegramId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💻 開啟網站查看', web_app: { url: autoLoginUrl } }]
      ]
    }
  });
}

/**
 * 發送 Email 通知
 */
async function sendEmailNotification(email: string, name: string, title: string, body: string) {
  // 檢查是否設定了 Email credentials
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('Email credentials not configured, skipping email notification');
    return;
  }

  const mailOptions = {
    from: `"Credit Card Tracker | 信用卡福利追蹤器" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: title,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">🔔 ${title}</h2>
        <p style="font-size: 16px; line-height: 1.6;">
          Hi ${name}，
        </p>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 16px; margin: 0;">${body}</p>
        </div>
        <p style="color: #6B7280; font-size: 14px;">
          此郵件由信用卡福利追蹤器自動發送，請勿直接回覆。
        </p>
      </div>
    `,
  };

  await emailTransporter.sendMail(mailOptions);
}

/**
 * 發送 Web Push 通知
 */
async function sendWebPushNotification(
  subscriptions: any[],
  title: string,
  body: string,
  data?: any
) {
  const payload = JSON.stringify({
    title,
    body,
    data,
  });

  let successCount = 0;
  let failCount = 0;

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
        successCount++;
        return { success: true, endpoint: sub.endpoint };
      } catch (error: any) {
        failCount++;
        // 如果訂閱失效，從資料庫中刪除
        if (error.statusCode === 404 || error.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
        return { success: false, endpoint: sub.endpoint, error: error.message };
      }
    })
  );

  return {
    success: successCount > 0,
    successCount,
    failCount,
    error: failCount === subscriptions.length ? 'All push notifications failed' : undefined,
  };
}

/**
 * 發送 LINE 通知
 */
async function sendLineNotification(lineId: string, title: string, body: string) {
  // 檢查是否設定了 LINE credentials 和啟用狀態
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn('LINE Channel Access Token not configured, skipping LINE notification');
    return;
  }

  if (process.env.LINE_NOTIFY_ENABLED !== 'true') {
    console.log('LINE notifications disabled, skipping');
    return;
  }

  const message = {
    type: 'text',
    text: `🔔 ${title}\n\n${body}`
  };

  try {
    await axios.post(
      'https://api.line.me/v2/bot/message/push',
      {
        to: lineId,
        messages: [message]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
        }
      }
    );
  } catch (error: any) {
    console.error('LINE API error:', error.response?.data || error.message);
    throw new Error(`Failed to send LINE notification: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * 批量發送通知給多個使用者
 */
export async function sendBulkNotifications(notifications: NotificationData[]) {
  const results = await Promise.allSettled(
    notifications.map(notification => sendNotification(notification))
  );

  const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failCount = results.length - successCount;

  console.log(`✅ Sent ${successCount} notifications successfully, ${failCount} failed`);

  return {
    successCount,
    failCount,
    total: results.length,
  };
}
