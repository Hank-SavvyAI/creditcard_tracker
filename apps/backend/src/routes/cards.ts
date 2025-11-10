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

    // Find all existing instances of this card for this user
    const existingCards = await prisma.userCard.findMany({
      where: {
        userId: req.user!.id,
        cardId,
      },
      orderBy: {
        cardInstance: 'desc',
      },
    });

    // Determine the next card instance number
    const nextInstance = existingCards.length > 0 ? existingCards[0].cardInstance + 1 : 1;

    const userCard = await prisma.userCard.create({
      data: {
        userId: req.user!.id,
        cardId,
        cardInstance: nextInstance,
        nickname,
      },
      include: {
        card: true,
      },
    });

    // Create UserBenefit records for active benefits on this card
    const { createCurrentCycleBenefits } = await import('../services/archive');
    await createCurrentCycleBenefits(req.user!.id, userCard.id, benefitStartDates || {});

    res.json(userCard);
  } catch (error) {
    console.error('Failed to add card:', error);
    res.status(500).json({ error: 'Failed to add card' });
  }
});

// Update user card settings
router.patch('/my/:cardId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { nickname, afChargeMonth, afChargeDay } = req.body;
    const cardId = parseInt(req.params.cardId);

    // Validate afChargeMonth and afChargeDay if provided
    if (afChargeMonth !== undefined && afChargeMonth !== null && (afChargeMonth < 1 || afChargeMonth > 12)) {
      return res.status(400).json({ error: 'Invalid month (must be 1-12)' });
    }
    if (afChargeDay !== undefined && afChargeDay !== null && (afChargeDay < 1 || afChargeDay > 31)) {
      return res.status(400).json({ error: 'Invalid day (must be 1-31)' });
    }

    const userCard = await prisma.userCard.update({
      where: {
        userId_cardId: {
          userId: req.user!.id,
          cardId,
        },
      },
      data: {
        nickname,
        afChargeMonth,
        afChargeDay,
      },
      include: {
        card: true,
      },
    });

    res.json(userCard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update card settings' });
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
