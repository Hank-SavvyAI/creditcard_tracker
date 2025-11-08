import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all unique banks (public, no auth required)
router.get('/banks', async (req, res) => {
  try {
    const language = req.query.language as string || 'zh';

    const cards = await prisma.creditCard.findMany({
      where: { isActive: true },
      select: {
        bank: true,
        bankEn: true,
      },
    });

    // Get unique banks using a Map to deduplicate
    const uniqueBanksMap = new Map<string, { bank: string; bankEn: string }>();
    cards.forEach(card => {
      if (!uniqueBanksMap.has(card.bank)) {
        uniqueBanksMap.set(card.bank, {
          bank: card.bank,
          bankEn: (card.bankEn && card.bankEn.trim()) ? card.bankEn : card.bank,
        });
      }
    });

    // Extract unique banks based on language
    const banks = Array.from(uniqueBanksMap.values())
      .map(bank => {
        const displayName = language === 'en'
          ? bank.bankEn
          : bank.bank;
        return {
          value: bank.bank, // Always use Chinese bank name as the value for filtering
          label: displayName,
          bank: bank.bank,
          bankEn: bank.bankEn,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    res.json(banks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch banks' });
  }
});

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
    const { cardId, nickname, benefitStartDates } = req.body;

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

    // Create UserBenefit records for active benefits on this card
    const { createCurrentCycleBenefits } = await import('../services/archive');
    await createCurrentCycleBenefits(req.user!.id, cardId, benefitStartDates || {});

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
