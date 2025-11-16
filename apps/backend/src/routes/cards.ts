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
      orderBy: {
        displayPriority: 'asc', // Lower number = higher priority
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
      orderBy: [
        { displayOrder: 'asc' }, // User's custom order first
        { card: { displayPriority: 'asc' } }, // Then by card's default priority
      ],
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
    try {
      const { createCurrentCycleBenefits } = await import('../services/archive');
      await createCurrentCycleBenefits(req.user!.id, userCard.id, benefitStartDates || {});
    } catch (benefitError) {
      console.error('Warning: Failed to create benefits for new card, but card was added successfully:', benefitError);
      // Card is already added, so we return success
      // Benefits can be created later automatically
    }

    res.json(userCard);
  } catch (error) {
    console.error('Failed to add card:', error);
    res.status(500).json({ error: 'Failed to add card' });
  }
});

// Update user cards display order
router.patch('/my/order', authenticate, async (req: AuthRequest, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Invalid updates format' });
    }

    // Verify all cards belong to the user
    const userCardIds = updates.map((u: any) => u.id);
    const userCards = await prisma.userCard.findMany({
      where: {
        id: { in: userCardIds },
        userId: req.user!.id,
      },
    });

    if (userCards.length !== userCardIds.length) {
      return res.status(403).json({ error: 'Some cards do not belong to you' });
    }

    // Update all card orders in a transaction
    await prisma.$transaction(
      updates.map((update: { id: number; displayOrder: number }) =>
        prisma.userCard.update({
          where: { id: update.id },
          data: { displayOrder: update.displayOrder },
        })
      )
    );

    res.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error('Failed to update card order:', error);
    res.status(500).json({ error: 'Failed to update card order' });
  }
});

// Update user card settings
router.patch('/my/:userCardId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { nickname, afChargeMonth, afChargeDay, openedAt } = req.body;
    const userCardId = parseInt(req.params.userCardId);

    // Validate afChargeMonth and afChargeDay if provided
    if (afChargeMonth !== undefined && afChargeMonth !== null && (afChargeMonth < 1 || afChargeMonth > 12)) {
      return res.status(400).json({ error: 'Invalid month (must be 1-12)' });
    }
    if (afChargeDay !== undefined && afChargeDay !== null && (afChargeDay < 1 || afChargeDay > 31)) {
      return res.status(400).json({ error: 'Invalid day (must be 1-31)' });
    }

    // First verify the UserCard belongs to this user
    const existingCard = await prisma.userCard.findUnique({
      where: { id: userCardId },
    });

    if (!existingCard || existingCard.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const updateData: any = {
      nickname,
      afChargeMonth,
      afChargeDay,
    };

    // Add openedAt if provided
    if (openedAt !== undefined) {
      updateData.openedAt = openedAt ? new Date(openedAt) : null;
    }

    const userCard = await prisma.userCard.update({
      where: {
        id: userCardId,
      },
      data: updateData,
      include: {
        card: true,
      },
    });

    res.json(userCard);
  } catch (error) {
    console.error('Failed to update card settings:', error);
    res.status(500).json({ error: 'Failed to update card settings' });
  }
});

// Remove card from user
router.delete('/my/:userCardId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userCardId = parseInt(req.params.userCardId);

    // First verify the UserCard belongs to this user
    const existingCard = await prisma.userCard.findUnique({
      where: { id: userCardId },
    });

    if (!existingCard || existingCard.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Card not found' });
    }

    await prisma.userCard.delete({
      where: {
        id: userCardId,
      },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to remove card:', error);
    res.status(500).json({ error: 'Failed to remove card' });
  }
});

// Get 5/24 status (cards opened in past 24 months)
router.get('/524-status', authenticate, async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const twentyFourMonthsAgo = new Date();
    twentyFourMonthsAgo.setMonth(now.getMonth() - 24);

    // Find all cards opened in the past 24 months
    const recentCards = await prisma.userCard.findMany({
      where: {
        userId: req.user!.id,
        openedAt: {
          gte: twentyFourMonthsAgo,
          lte: now,
        },
      },
      include: {
        card: true,
      },
      orderBy: {
        openedAt: 'desc',
      },
    });

    const count = recentCards.length;
    const isOver524 = count >= 5;

    res.json({
      count,
      isOver524,
      cards: recentCards.map(uc => ({
        id: uc.id,
        cardName: uc.card.name,
        nickname: uc.nickname,
        openedAt: uc.openedAt,
        cardInstance: uc.cardInstance,
      })),
      calculatedAt: now,
      periodStart: twentyFourMonthsAgo,
    });
  } catch (error) {
    console.error('Failed to get 5/24 status:', error);
    res.status(500).json({ error: 'Failed to get 5/24 status' });
  }
});

export default router;
