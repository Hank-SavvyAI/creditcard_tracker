import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import { pushLineMessage } from './lineWebhook';

const router = Router();

// Login/Register with Telegram ID
router.post('/telegram',
  body('telegramId').isString().notEmpty(),
  body('username').optional().isString(),
  body('firstName').optional().isString(),
  body('lastName').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { telegramId, username, firstName, lastName } = req.body;

      let user = await prisma.user.findUnique({
        where: { telegramId },
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
          lastName: true,
          language: true,
          tier: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            telegramId,
            username,
            firstName,
            lastName,
          },
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
            language: true,
            tier: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      }

      const token = jwt.sign(
        { userId: user.id, telegramId: user.telegramId },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );

      res.json({ token, user });
    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
);

// LINE Login - Initiate OAuth flow
router.get('/line', (req, res) => {
  const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
  const LINE_CALLBACK_URL = process.env.LINE_CALLBACK_URL;
  const state = Math.random().toString(36).substring(7);

  const authUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
    `response_type=code` +
    `&client_id=${LINE_CHANNEL_ID}` +
    `&redirect_uri=${encodeURIComponent(LINE_CALLBACK_URL!)}` +
    `&state=${state}` +
    `&scope=profile%20openid%20email`;

  res.redirect(authUrl);
});

// LINE Login - Callback handler
router.get('/line/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
    const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
    const LINE_CALLBACK_URL = process.env.LINE_CALLBACK_URL;
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:9000';

    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://api.line.me/oauth2/v2.1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: LINE_CALLBACK_URL!,
        client_id: LINE_CHANNEL_ID!,
        client_secret: LINE_CHANNEL_SECRET!,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // Get user profile
    const profileResponse = await axios.get('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const lineProfile = profileResponse.data;
    const { userId: lineId, displayName, pictureUrl } = lineProfile;

    console.log('🔍 DEBUG - LINE OAuth Login:');
    console.log('  LINE ID from OAuth:', lineId);
    console.log('  Display Name:', displayName);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { lineId },
      select: {
        id: true,
        telegramId: true,
        googleId: true,
        lineId: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        language: true,
        tier: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const isNewUser = !user;

    if (!user) {
      user = await prisma.user.create({
        data: {
          lineId,
          username: displayName,
          firstName: displayName,
          avatar: pictureUrl,
        },
        select: {
          id: true,
          telegramId: true,
          googleId: true,
          lineId: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          language: true,
          tier: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, lineId: user.lineId },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    // Send welcome message to LINE Bot (push message)
    try {
      await pushLineMessage(lineId, [
        {
          type: 'text',
          text: isNewUser
            ? `🎉 歡迎 ${displayName}！\n\n您已成功完成 LINE 登入！\n現在可以使用以下功能：`
            : `👋 歡迎回來，${displayName}！\n\nLINE 登入成功！`,
          quickReply: {
            items: [
              {
                type: 'action',
                action: {
                  type: 'message',
                  label: '💳 我的信用卡',
                  text: '我的信用卡'
                }
              },
              {
                type: 'action',
                action: {
                  type: 'message',
                  label: '📅 7天內到期',
                  text: '7天內到期'
                }
              },
              {
                type: 'action',
                action: {
                  type: 'message',
                  label: '📆 當月到期',
                  text: '當月到期'
                }
              },
              {
                type: 'action',
                action: {
                  type: 'message',
                  label: '📆 當季到期',
                  text: '當季到期'
                }
              }
            ]
          }
        }
      ]);
    } catch (error) {
      console.error('Failed to send welcome message to LINE:', error);
      // Continue even if push message fails
    }

    // Redirect to frontend with token and user data (like Google OAuth)
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
  } catch (error) {
    console.error('LINE auth error:', error);
    res.status(500).json({ error: 'LINE authentication failed' });
  }
});

export default router;
