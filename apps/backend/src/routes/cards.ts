import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all available credit cards (public, no auth required)
router.get('/', async (req, res) => {
  try {
    const cards = await prisma.creditCard.findMany({
      where: { isActive: true },
      include: {
        benefits: {
          where: { isActive: true },
        },
      },
    });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Get user's cards
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const userCards = await prisma.userCard.findMany({
      where: { userId: req.user!.id },
      include: {
        card: {
          include: {
            benefits: {
              where: { isActive: true },
            },
          },
        },
      },
    });
    res.json(userCards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user cards' });
  }
});

// Add card to user
router.post('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const { cardId, nickname } = req.body;

    // Check if card already exists for this user
    const existing = await prisma.userCard.findUnique({
      where: {
        userId_cardId: {
          userId: req.user!.id,
          cardId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Card already tracked' });
    }

    const userCard = await prisma.userCard.create({
      data: {
        userId: req.user!.id,
        cardId,
        nickname,
      },
      include: {
        card: true,
      },
    });

    res.json(userCard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add card' });
  }
});

// Remove card from user
router.delete('/my/:cardId', authenticate, async (req: AuthRequest, res) => {
  try {
    await prisma.userCard.delete({
      where: {
        userId_cardId: {
          userId: req.user!.id,
          cardId: parseInt(req.params.cardId),
        },
      },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove card' });
  }
});

export default router;
