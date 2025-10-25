import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { body, validationResult } from 'express-validator';

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

export default router;
