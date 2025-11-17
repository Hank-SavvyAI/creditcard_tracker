import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * Generate a one-time login token for users
 * @param userId User ID
 * @param source Token source: "LINE" | "TELEGRAM" | "GOOGLE"
 */
export async function generateLoginToken(userId: number, source: string = 'LINE'): Promise<string> {
  // Generate random token
  const token = crypto.randomBytes(32).toString('hex');

  // Token expires in 5 minutes
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5);

  // Save token to database
  await prisma.loginToken.create({
    data: {
      userId,
      token,
      expiresAt,
      source,
    },
  });

  return token;
}

// Alias for backward compatibility
export const generateLineLoginToken = (userId: number) => generateLoginToken(userId, 'LINE');

/**
 * Auto-login endpoint using one-time token
 * GET /api/auth/token?token=xxx
 * Works for LINE, Telegram, and Google auto-login
 */
router.get('/token', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Missing token' });
    }

    // Find token in database
    const loginToken = await prisma.loginToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!loginToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Allow token to be used multiple times (like LINE OAuth)
    // This allows users to re-login with the same QR code link
    if (loginToken.used) {
      console.log('Token already used, but allowing re-login');
      // Regenerate JWT and redirect
      const jwtToken = jwt.sign(
        {
          id: loginToken.user.id,
          username: loginToken.user.username,
          role: loginToken.user.role
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );

      // Redirect with token in query parameter
      const frontendUrl = process.env.FRONTEND_URL || 'https://cards.savvyaihelper.com';
      return res.redirect(`${frontendUrl}/auth/auto-login?token=${jwtToken}`);
    }

    // Mark token as used
    await prisma.loginToken.update({
      where: { id: loginToken.id },
      data: { used: true },
    });

    // Generate JWT for the user
    const jwtToken = jwt.sign(
      {
        id: loginToken.user.id,
        username: loginToken.user.username,
        role: loginToken.user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    // Redirect with token in query parameter
    // Token will be cleared from URL immediately after being read by frontend
    const frontendUrl = process.env.FRONTEND_URL || 'https://cards.savvyaihelper.com';
    res.redirect(`${frontendUrl}/auth/auto-login?token=${jwtToken}`);
  } catch (error) {
    console.error('❌ LINE auto-login error:', error);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});

export default router;
