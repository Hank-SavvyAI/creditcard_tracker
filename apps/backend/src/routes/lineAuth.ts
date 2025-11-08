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

    // Check if token is expired
    if (new Date() > loginToken.expiresAt) {
      await prisma.loginToken.delete({ where: { id: loginToken.id } });
      return res.status(401).json({ error: 'Token expired' });
    }

    // Check if token was already used - but if yes, check if it was recent (within 10 seconds)
    // This handles the case where user clicks twice or browser refreshes
    if (loginToken.used) {
      const timeSinceCreation = Date.now() - loginToken.createdAt.getTime();
      if (timeSinceCreation > 10000) { // More than 10 seconds ago
        return res.status(401).json({ error: 'Token already used' });
      }
      // If used within 10 seconds, regenerate the same JWT and redirect
      const jwtToken = jwt.sign(
        {
          id: loginToken.user.id,
          username: loginToken.user.username,
          role: loginToken.user.role
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );
      const frontendUrl = process.env.FRONTEND_URL || 'https://cards.savvyaihelper.com';
      return res.redirect(`${frontendUrl}/auth/line-callback?token=${jwtToken}`);
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

    // Redirect to dashboard with token in URL
    const frontendUrl = process.env.FRONTEND_URL || 'https://cards.savvyaihelper.com';
    res.redirect(`${frontendUrl}/auth/line-callback?token=${jwtToken}`);
  } catch (error) {
    console.error('❌ LINE auto-login error:', error);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});

export default router;
