import { Router } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { generateLineLoginToken } from './lineAuth';

const router = Router();

/**
 * Verify LINE webhook signature
 * Implementation based on official LINE Bot SDK for Node.js:
 * https://github.com/line/line-bot-sdk-nodejs/blob/master/lib/validate-signature.ts
 *
 * Uses timingSafeEqual to prevent timing attacks
 */
function verifyLineSignature(body: string, signature: string): boolean {
  if (!process.env.LINE_MESSAGING_CHANNEL_SECRET) {
    console.warn('LINE_MESSAGING_CHANNEL_SECRET not configured');
    return false;
  }

  const channelSecret = process.env.LINE_MESSAGING_CHANNEL_SECRET;

  // Calculate HMAC-SHA256 digest
  const digest = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest();

  // Convert base64 signature to Buffer
  const signatureBuffer = Buffer.from(signature, 'base64');

  // Use timing-safe comparison to prevent timing attacks
  if (digest.length !== signatureBuffer.length) {
    console.log('🔐 Signature verification failed: length mismatch');
    return false;
  }

  const isValid = crypto.timingSafeEqual(digest, signatureBuffer);

  // Debug logging
  console.log('🔐 Signature verification:');
  console.log('  Body length:', body.length);
  console.log('  Digest (base64):', digest.toString('base64'));
  console.log('  Received signature:', signature);
  console.log('  Match:', isValid);

  return isValid;
}

/**
 * Parse user message to extract days from benefit query
 */
function parseDaysFromMessage(message: string): number | null {
  // Match patterns like: 7天, 7日, 一週, 本週, 本月, 30天
  const patterns = [
    { regex: /(\d+)\s*天/, multiplier: 1 },
    { regex: /(\d+)\s*日/, multiplier: 1 },
    { regex: /一週|本週|這週/, days: 7 },
    { regex: /兩週/, days: 14 },
    { regex: /一個月|本月|這個月/, days: 30 },
    { regex: /三個月/, days: 90 },
  ];

  const lowerMessage = message.toLowerCase();

  for (const pattern of patterns) {
    const match = lowerMessage.match(pattern.regex);
    if (match) {
      if (pattern.days) {
        return pattern.days;
      }
      if (pattern.multiplier && match[1]) {
        return parseInt(match[1]) * pattern.multiplier;
      }
    }
  }

  // Default to 30 days if no specific time mentioned
  return 30;
}

/**
 * Format benefit information for LINE message
 */
function formatBenefitsMessage(benefits: any[], days: number): string {
  if (benefits.length === 0) {
    return `📊 未來 ${days} 天內沒有即將到期的福利！\n\n繼續享受您的信用卡福利吧 ✨`;
  }

  let message = `🔔 未來 ${days} 天內即將到期的福利：\n\n`;

  benefits.forEach((benefit, index) => {
    message += `${index + 1}. ${benefit.card.bank} - ${benefit.card.name}\n`;
    message += `   📌 ${benefit.title}\n`;

    if (benefit.expiryDate) {
      const expiryDate = new Date(benefit.expiryDate);
      const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      message += `   ⏰ 到期日：${expiryDate.toLocaleDateString('zh-TW')}\n`;
      message += `   ⚠️ 剩餘 ${daysLeft} 天\n`;
    }

    if (benefit.description) {
      const shortDesc = benefit.description.length > 50
        ? benefit.description.substring(0, 50) + '...'
        : benefit.description;
      message += `   💡 ${shortDesc}\n`;
    }

    message += '\n';
  });

  message += `\n💻 查看完整詳情：${process.env.FRONTEND_URL}/dashboard`;

  return message;
}

/**
 * LINE Webhook endpoint
 */
router.post('/webhook', async (req, res) => {
  try {
    // Get raw body (Buffer) for signature verification
    const rawBody = req.body as Buffer;
    const bodyString = rawBody.toString('utf-8');
    const signature = req.headers['x-line-signature'] as string;

    // Verify signature
    if (!signature) {
      console.error('❌ Missing x-line-signature header');
      return res.status(401).json({ error: 'Missing signature' });
    }

    if (!verifyLineSignature(bodyString, signature)) {
      console.error('❌ Invalid LINE webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Signature verified');

    // Respond quickly to LINE
    res.sendStatus(200);

    // Parse body for processing
    const body = JSON.parse(bodyString);
    const events = body.events || [];

    for (const event of events) {
      console.log('📨 Received LINE event:', event.type);

      // Handle text messages
      if (event.type === 'message' && event.message.type === 'text') {
        const lineUserId = event.source.userId;
        const userMessage = event.message.text;
        const replyToken = event.replyToken;

        console.log(`💬 Message from ${lineUserId}: ${userMessage}`);

        // Find user by LINE ID
        const user = await prisma.user.findUnique({
          where: { lineId: lineUserId },
        });

        if (!user) {
          // User not found - ask them to login first
          await replyLineMessage(replyToken, [
            {
              type: 'text',
              text: '👋 您好！\n\n請先使用 LINE 登入我們的系統，即可查詢您的信用卡福利到期資訊！',
              quickReply: {
                items: [
                  {
                    type: 'action',
                    action: {
                      type: 'uri',
                      label: '🔐 LINE 登入',
                      uri: process.env.FRONTEND_URL || 'https://cards.savvyaihelper.com'
                    }
                  }
                ]
              }
            }
          ]);
          continue;
        }

        // Check if message is asking about expiring benefits
        const isBenefitQuery = /福利|到期|過期|提醒|查詢/.test(userMessage);

        if (isBenefitQuery) {
          // Parse days from message
          const days = parseDaysFromMessage(userMessage) ?? 30;

          console.log(`🔍 Querying benefits expiring within ${days} days for user ${user.id}`);

          // Query expiring benefits
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + days);

          const expiringBenefits = await prisma.userBenefit.findMany({
            where: {
              userId: user.id,
              isCompleted: false,
              periodEnd: {
                lte: expiryDate,
                gte: new Date(), // Not expired yet
              },
            },
            include: {
              benefit: {
                include: {
                  card: true,
                },
              },
            },
            orderBy: {
              periodEnd: 'asc',
            },
          });

          // Format benefits for display
          const benefitsData = expiringBenefits.map(ub => ({
            ...ub.benefit,
            card: ub.benefit.card,
            expiryDate: ub.periodEnd,
          }));

          const replyText = formatBenefitsMessage(benefitsData, days);

          // Generate auto-login token for quick access
          const loginToken = await generateLineLoginToken(user.id);
          const autoLoginUrl = `${process.env.BACKEND_URL || 'https://api.savvyaihelper.com'}/api/line/auth?token=${loginToken}`;

          await replyLineMessage(replyToken, [
            {
              type: 'text',
              text: replyText + '\n\n━━━━━━━━━━━━━━━\n📌 要查詢多久到期的福利？',
              quickReply: {
                items: [
                  {
                    type: 'action',
                    action: {
                      type: 'message',
                      label: '📅 7天內',
                      text: '查詢7天內到期的福利'
                    }
                  },
                  {
                    type: 'action',
                    action: {
                      type: 'message',
                      label: '📊 30天內',
                      text: '30天內到期的福利'
                    }
                  },
                  {
                    type: 'action',
                    action: {
                      type: 'message',
                      label: '📆 本季',
                      text: '三個月內到期的福利'
                    }
                  },
                  {
                    type: 'action',
                    action: {
                      type: 'uri',
                      label: '💻 網站',
                      uri: autoLoginUrl
                    }
                  }
                ]
              }
            }
          ]);
        } else {
          // Generic help message with quick reply buttons
          // Generate auto-login token for quick access
          const loginToken = await generateLineLoginToken(user.id);
          const autoLoginUrl = `${process.env.BACKEND_URL || 'https://api.savvyaihelper.com'}/api/line/auth?token=${loginToken}`;

          await replyLineMessage(replyToken, [
            {
              type: 'text',
              text: '👋 您好！我是信用卡福利追蹤小幫手！\n\n' +
                    '📌 要查詢多久到期的福利？',
              quickReply: {
                items: [
                  {
                    type: 'action',
                    action: {
                      type: 'message',
                      label: '📅 7天內',
                      text: '查詢7天內到期的福利'
                    }
                  },
                  {
                    type: 'action',
                    action: {
                      type: 'message',
                      label: '📊 30天內',
                      text: '30天內到期的福利'
                    }
                  },
                  {
                    type: 'action',
                    action: {
                      type: 'message',
                      label: '📆 本季',
                      text: '三個月內到期的福利'
                    }
                  },
                  {
                    type: 'action',
                    action: {
                      type: 'uri',
                      label: '💻 開啟網站',
                      uri: autoLoginUrl
                    }
                  }
                ]
              }
            }
          ]);
        }
      }

      // Handle friend add event
      if (event.type === 'follow') {
        const lineUserId = event.source.userId;
        console.log(`➕ User ${lineUserId} added bot as friend`);

        // Check if user exists
        const user = await prisma.user.findUnique({
          where: { lineId: lineUserId },
        });

        let websiteUrl = process.env.FRONTEND_URL || 'https://cards.savvyaihelper.com';

        // If user exists, generate auto-login token
        if (user) {
          const loginToken = await generateLineLoginToken(user.id);
          websiteUrl = `${process.env.BACKEND_URL || 'https://api.savvyaihelper.com'}/api/line/auth?token=${loginToken}`;
        }

        // Send welcome message with quick reply buttons
        await pushLineMessage(lineUserId, [
          {
            type: 'text',
            text: '🎉 歡迎使用信用卡福利追蹤小幫手！\n\n' +
                  '📌 要查詢多久到期的福利？',
            quickReply: {
              items: [
                {
                  type: 'action',
                  action: {
                    type: 'message',
                    label: '📅 7天內',
                    text: '查詢7天內到期的福利'
                  }
                },
                {
                  type: 'action',
                  action: {
                    type: 'message',
                    label: '📊 30天內',
                    text: '30天內到期的福利'
                  }
                },
                {
                  type: 'action',
                  action: {
                    type: 'message',
                    label: '📆 本季',
                    text: '三個月內到期的福利'
                  }
                },
                {
                  type: 'action',
                  action: {
                    type: 'uri',
                    label: '💻 開啟網站',
                    uri: websiteUrl
                  }
                }
              ]
            }
          }
        ]);
      }

      // Handle unfollow event
      if (event.type === 'unfollow') {
        const lineUserId = event.source.userId;
        console.log(`➖ User ${lineUserId} unfollowed bot`);
      }
    }
  } catch (error) {
    console.error('❌ LINE webhook error:', error);
  }
});

/**
 * Reply to LINE message (uses Reply API - FREE!)
 */
async function replyLineMessage(replyToken: string, messages: any[]) {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN not configured');
    return;
  }

  try {
    await axios.post(
      'https://api.line.me/v2/bot/message/reply',
      {
        replyToken,
        messages,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );
    console.log('✅ Reply message sent successfully');
  } catch (error: any) {
    console.error('❌ Failed to reply LINE message:', error.response?.data || error.message);
  }
}

/**
 * Push LINE message (uses Push API - counts toward quota)
 */
async function pushLineMessage(userId: string, messages: any[]) {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN not configured');
    return;
  }

  try {
    await axios.post(
      'https://api.line.me/v2/bot/message/push',
      {
        to: userId,
        messages,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );
    console.log('✅ Push message sent successfully');
  } catch (error: any) {
    console.error('❌ Failed to push LINE message:', error.response?.data || error.message);
  }
}

export default router;
