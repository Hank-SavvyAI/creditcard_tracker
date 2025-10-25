import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    telegramId: string;
    tier: string;
    role: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Skip authentication in development if SKIP_AUTH is true
  if (process.env.SKIP_AUTH === 'true') {
    req.user = {
      id: 1,
      telegramId: 'dev_user',
      tier: 'VIP',
      role: 'ADMIN',
    };
    return next();
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id?: number;
      userId?: number;
      telegramId?: string;
    };

    // Support both 'id' (from Google OAuth) and 'userId' (from Telegram auth)
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid token: missing user ID' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, telegramId: true, tier: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Skip admin check in development if SKIP_AUTH is true
  if (process.env.SKIP_AUTH === 'true') {
    return next();
  }

  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};
