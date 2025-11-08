import { Router } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { generateLineLoginToken } from './lineAuth';
import { calculateBenefitDeadline } from '../lib/benefitDeadline';

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
 * Parse user message to extract time range for benefit query
 * Returns: { type: 'days' | 'month' | 'quarter', value: number }
 */
function parseTimeRangeFromMessage(message: string): { type: 'days' | 'month' | 'quarter', value: number } {
  const lowerMessage = message.toLowerCase();

  // Check for month-based queries
  if (/當月|本月|這個月/.test(lowerMessage)) {
    // Calculate days until end of current month
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const daysUntilEndOfMonth = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { type: 'month', value: daysUntilEndOfMonth };
  }

  // Check for quarter-based queries
  if (/當季|本季|這一季/.test(lowerMessage)) {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const quarterEndMonth = (quarter + 1) * 3;
    const endOfQuarter = new Date(now.getFullYear(), quarterEndMonth, 0, 23, 59, 59, 999);
    const daysUntilEndOfQuarter = Math.ceil((endOfQuarter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { type: 'quarter', value: daysUntilEndOfQuarter };
  }

  // Match patterns for specific days
  const patterns = [
    { regex: /(\d+)\s*天/, multiplier: 1 },
    { regex: /(\d+)\s*日/, multiplier: 1 },
    { regex: /一週|本週|這週/, days: 7 },
    { regex: /兩週/, days: 14 },
  ];

  for (const pattern of patterns) {
    const match = lowerMessage.match(pattern.regex);
    if (match) {
      if (pattern.days) {
        return { type: 'days', value: pattern.days };
      }
      if (pattern.multiplier && match[1]) {
        return { type: 'days', value: parseInt(match[1]) * pattern.multiplier };
      }
    }
  }

  // Default to current month if no specific time mentioned
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const daysUntilEndOfMonth = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { type: 'month', value: daysUntilEndOfMonth };
}

/**
 * Format benefit information for LINE message
 */
function formatBenefitsMessage(benefits: any[], timeRange: { type: 'days' | 'month' | 'quarter', value: number }): string {
  let rangeText: string;
  if (timeRange.type === 'month') {
    rangeText = '當月到期';
  } else if (timeRange.type === 'quarter') {
    rangeText = '當季到期';
  } else {
    rangeText = `${timeRange.value} 天內`;
  }

  if (benefits.length === 0) {
    return `📊 ${rangeText}沒有即將到期的福利！\n\n繼續享受您的信用卡福利吧 ✨`;
  }

  let message = `🔔 ${rangeText}即將到期的福利：\n\n`;

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
          // User not found - direct them to LINE OAuth login
          const backendUrl = process.env.BACKEND_URL || 'https://api.savvyaihelper.com';
          const lineLoginUrl = `${backendUrl}/api/auth/line`;

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
                      uri: lineLoginUrl  // Direct to LINE OAuth
                    }
                  }
                ]
              }
            }
          ]);
          continue;
        }

        // Check if message is asking about user's cards
        const isCardQuery = /我的信用卡|查看我的信用卡|信用卡列表/.test(userMessage);

        if (isCardQuery) {
          console.log(`🔍 Querying user's credit cards for user ${user.id}`);

          // Query user's cards
          const userCards = await prisma.userCard.findMany({
            where: { userId: user.id },
            include: {
              card: {
                include: {
                  benefits: {
                    where: {
                      isActive: true,
                    },
                  },
                },
              },
            },
          });

          let replyText: string;
          if (userCards.length === 0) {
            replyText = '📇 您還沒有新增任何信用卡\n\n請先在網站上新增您的信用卡，即可開始追蹤福利！';
          } else {
            replyText = `📇 您的信用卡 (${userCards.length} 張)：\n\n`;
            userCards.forEach((uc, index) => {
              const cardName = uc.card.name;
              const bank = uc.card.bank;
              replyText += `${index + 1}. ${bank} - ${cardName}\n`;
              if (uc.nickname) {
                replyText += `   別名：${uc.nickname}\n`;
              }

              // List benefits for this card
              if (uc.card.benefits.length > 0) {
                replyText += '   福利：\n';
                uc.card.benefits.forEach((benefit, idx) => {
                  replyText += `   ${idx + 1}. ${benefit.title}`;

                  // Add cycle type info
                  if (benefit.cycleType) {
                    const cycleMap = {
                      'MONTHLY': '每月',
                      'QUARTERLY': '每季',
                      'SEMI_ANNUALLY': '半年',
                      'ANNUALLY': '每年',
                    };
                    replyText += ` [${cycleMap[benefit.cycleType as keyof typeof cycleMap] || benefit.cycleType}]`;
                  }

                  // Add amount if available
                  if (benefit.amount) {
                    replyText += ` - ${benefit.currency} ${benefit.amount}`;
                  }

                  replyText += '\n';
                });
              } else {
                replyText += '   (尚無福利)\n';
              }

              replyText += '\n';
            });
            replyText += '💡 在網站上可以管理您的信用卡和福利';
          }

          // Generate auto-login token for quick access
          const loginToken = await generateLineLoginToken(user.id);
          const autoLoginUrl = `${process.env.BACKEND_URL || 'https://api.savvyaihelper.com'}/api/auth/token?token=${loginToken}`;

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
                      label: '📇 我的信用卡',
                      text: '查看我的信用卡'
                    }
                  },
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
                      label: '📆 當月到期',
                      text: '當月到期的福利'
                    }
                  },
                  {
                    type: 'action',
                    action: {
                      type: 'message',
                      label: '📆 本季到期',
                      text: '本季到期的福利'
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
        }
        // Check if message is asking about expiring benefits
        else if (/福利|到期|過期|提醒|查詢/.test(userMessage)) {
          // Parse time range from message
          const timeRange = parseTimeRangeFromMessage(userMessage);

          console.log(`🔍 Querying benefits expiring within ${timeRange.value} days (${timeRange.type}) for user ${user.id}`);

          const year = new Date().getFullYear();

          // Query all user's cards and benefits
          const userCards = await prisma.userCard.findMany({
            where: { userId: user.id },
            include: {
              card: {
                include: {
                  benefits: {
                    where: {
                      isActive: true,
                      notifiable: true, // Only notifiable benefits
                    },
                    include: {
                      userBenefits: {
                        where: {
                          userId: user.id,
                          year,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          // Calculate deadlines and filter expiring benefits
          const expiringBenefits: any[] = [];

          for (const uc of userCards) {
            for (const benefit of uc.card.benefits) {
              const userBenefit = benefit.userBenefits[0];

              // Skip completed benefits
              if (userBenefit?.isCompleted) {
                continue;
              }

              // Calculate deadline
              const deadline = calculateBenefitDeadline({
                cycleType: benefit.cycleType,
                isPersonalCycle: benefit.isPersonalCycle,
                customStartDate: userBenefit?.customStartDate,
                year,
                cycleNumber: userBenefit?.cycleNumber,
              });

              // Check if expiring within specified time range
              if (deadline) {
                const now = new Date();
                const futureDate = new Date(now.getTime() + timeRange.value * 24 * 60 * 60 * 1000);

                if (deadline >= now && deadline <= futureDate) {
                  expiringBenefits.push({
                    ...benefit,
                    card: uc.card,
                    expiryDate: deadline,
                  });
                }
              }
            }
          }

          // Sort by expiry date
          expiringBenefits.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

          const replyText = formatBenefitsMessage(expiringBenefits, timeRange);

          // Generate auto-login token for quick access
          const loginToken = await generateLineLoginToken(user.id);
          const autoLoginUrl = `${process.env.BACKEND_URL || 'https://api.savvyaihelper.com'}/api/auth/token?token=${loginToken}`;

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
                      label: '📇 我的信用卡',
                      text: '查看我的信用卡'
                    }
                  },
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
                      label: '📆 當月到期',
                      text: '當月到期的福利'
                    }
                  },
                  {
                    type: 'action',
                    action: {
                      type: 'message',
                      label: '📆 本季到期',
                      text: '本季到期的福利'
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
          const autoLoginUrl = `${process.env.BACKEND_URL || 'https://api.savvyaihelper.com'}/api/auth/token?token=${loginToken}`;

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
                      label: '📇 我的信用卡',
                      text: '查看我的信用卡'
                    }
                  },
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
                      label: '📆 當月到期',
                      text: '當月到期的福利'
                    }
                  },
                  {
                    type: 'action',
                    action: {
                      type: 'message',
                      label: '📆 本季到期',
                      text: '本季到期的福利'
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

        const backendUrl = process.env.BACKEND_URL || 'https://api.savvyaihelper.com';
        let websiteUrl: string;
        let websiteButtonLabel: string;

        // If user exists, generate auto-login token
        if (user) {
          const loginToken = await generateLineLoginToken(user.id);
          websiteUrl = `${backendUrl}/api/auth/token?token=${loginToken}`;
          websiteButtonLabel = '💻 開啟網站';
        } else {
          // If user doesn't exist, direct to LINE OAuth login
          websiteUrl = `${backendUrl}/api/auth/line`;
          websiteButtonLabel = '🔐 LINE 登入';
        }

        // Send welcome message with quick reply buttons
        await pushLineMessage(lineUserId, [
          {
            type: 'text',
            text: '🎉 歡迎使用信用卡福利追蹤小幫手！\n\n' +
                  (user ? '📌 要查詢多久到期的福利？' : '📌 請先登入以開始使用：'),
            quickReply: {
              items: [
                {
                  type: 'action',
                  action: {
                    type: 'message',
                    label: '📇 我的信用卡',
                    text: '查看我的信用卡'
                  }
                },
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
                    label: '📆 當月到期',
                    text: '當月到期的福利'
                  }
                },
                {
                  type: 'action',
                  action: {
                    type: 'message',
                    label: '📆 本季到期',
                    text: '本季到期的福利'
                  }
                },
                {
                  type: 'action',
                  action: {
                    type: 'uri',
                    label: websiteButtonLabel,
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
