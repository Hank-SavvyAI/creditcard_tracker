import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user language
router.patch('/me/language', authenticate, async (req: AuthRequest, res) => {
  try {
    const { language } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { language },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update language' });
  }
});

export default router;
