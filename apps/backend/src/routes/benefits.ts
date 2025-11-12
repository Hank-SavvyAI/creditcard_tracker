import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { archiveExpiredBenefits, getUserBenefitHistory } from '../services/archive';

const router = Router();

// Helper function to calculate cycleNumber based on date and frequency
function calculateCycleNumber(date: Date, frequency: string): number | null {
  if (frequency === 'MONTHLY') {
    return date.getMonth() + 1; // 1-12
  } else if (frequency === 'QUARTERLY') {
    return Math.floor(date.getMonth() / 3) + 1; // 1-4
  } else if (frequency === 'SEMI_ANNUAL') {
    return Math.floor(date.getMonth() / 6) + 1; // 1-2
  } else if (frequency === 'YEARLY' || frequency === 'ONE_TIME') {
    return 1;
  }
  return null;
}

// Helper function to find or create UserBenefit
async function findOrCreateUserBenefit(
  userId: number,
  benefitId: number,
  year: number,
  userCardId?: number,
  usedAt?: Date
) {
  // Get benefit to check frequency
  const benefit = await prisma.benefit.findUnique({
    where: { id: benefitId },
  });

  if (!benefit) {
    throw new Error('Benefit not found');
  }

  // Calculate cycleNumber if usedAt is provided and benefit has a frequency
  const cycleNumber = usedAt && benefit.frequency
    ? calculateCycleNumber(usedAt, benefit.frequency)
    : null;

  // If userCardId is provided, use it
  if (userCardId) {
    const where: any = { userCardId, benefitId, year };
    if (cycleNumber !== null) {
      where.cycleNumber = cycleNumber;
    }

    let userBenefit = await prisma.userBenefit.findFirst({
      where,
    });

    if (!userBenefit) {
      const createData: any = {
        userId,
        userCardId,
        benefitId,
        year,
        isCompleted: false,
        notificationEnabled: true,
      };
      if (cycleNumber !== null) {
        createData.cycleNumber = cycleNumber;
      }

      userBenefit = await prisma.userBenefit.create({
        data: createData,
      });
    }

    return userBenefit;
  }

  // Find user's cards that have this benefit (benefit already fetched above)
  const userCards = await prisma.userCard.findMany({
    where: {
      userId,
      cardId: benefit.cardId,
    },
  });

  if (userCards.length === 0) {
    throw new Error('User does not have this card');
  }

  // If user has multiple instances of this card, we need userCardId
  if (userCards.length > 1) {
    throw new Error('Multiple cards found. Please specify userCardId');
  }

  // Use the single UserCard
  const userCard = userCards[0];

  const where: any = { userCardId: userCard.id, benefitId, year };
  if (cycleNumber !== null) {
    where.cycleNumber = cycleNumber;
  }

  let userBenefit = await prisma.userBenefit.findFirst({
    where,
  });

  if (!userBenefit) {
    const createData: any = {
      userId,
      userCardId: userCard.id,
      benefitId,
      year,
      isCompleted: false,
      notificationEnabled: true,
    };
    if (cycleNumber !== null) {
      createData.cycleNumber = cycleNumber;
    }

    userBenefit = await prisma.userBenefit.create({
      data: createData,
    });
  }

  return userBenefit;
}

// Get user's benefits (from their cards)
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const userCards = await prisma.userCard.findMany({
      where: { userId: req.user!.id },
      include: {
        card: {
          include: {
            benefits: {
              where: { isActive: true },
              include: {
                userBenefits: {
                  where: {
                    userCardId: undefined, // Will be set below
                    year,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Fix the userBenefits for each card to only show benefits for that specific UserCard
    const fixedUserCards = await Promise.all(
      userCards.map(async (userCard) => {
        const benefits = await Promise.all(
          userCard.card.benefits.map(async (benefit) => {
            const userBenefits = await prisma.userBenefit.findMany({
              where: {
                userCardId: userCard.id,
                benefitId: benefit.id,
                year,
              },
            });
            return {
              ...benefit,
              userBenefits,
            };
          })
        );

        return {
          ...userCard,
          card: {
            ...userCard.card,
            benefits,
          },
        };
      })
    );

    res.json(fixedUserCards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch benefits' });
  }
});

// Mark benefit as completed
router.post('/:benefitId/complete', authenticate, async (req: AuthRequest, res) => {
  try {
    const { benefitId } = req.params;
    const { year, notes, userCardId } = req.body;
    const currentYear = year || new Date().getFullYear();

    const userBenefit = await findOrCreateUserBenefit(
      req.user!.id,
      parseInt(benefitId),
      currentYear,
      userCardId
    );

    const updated = await prisma.userBenefit.update({
      where: { id: userBenefit.id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        notes,
      },
    });

    res.json(updated);
  } catch (error: any) {
    const message = error.message || 'Failed to mark benefit as completed';
    res.status(500).json({ error: message });
  }
});

// Unmark benefit
router.post('/:benefitId/uncomplete', authenticate, async (req: AuthRequest, res) => {
  try {
    const { benefitId } = req.params;
    const { year, userCardId } = req.body;
    const currentYear = year || new Date().getFullYear();

    const userBenefit = await findOrCreateUserBenefit(
      req.user!.id,
      parseInt(benefitId),
      currentYear,
      userCardId
    );

    const updated = await prisma.userBenefit.update({
      where: { id: userBenefit.id },
      data: {
        isCompleted: false,
        completedAt: null,
      },
    });

    res.json(updated);
  } catch (error: any) {
    const message = error.message || 'Failed to unmark benefit';
    res.status(500).json({ error: message });
  }
});

// Update notification settings
router.patch('/:benefitId/settings', authenticate, async (req: AuthRequest, res) => {
  try {
    const { benefitId } = req.params;
    const { year, reminderDays, notificationEnabled, userCardId } = req.body;
    const currentYear = year || new Date().getFullYear();

    const userBenefit = await findOrCreateUserBenefit(
      req.user!.id,
      parseInt(benefitId),
      currentYear,
      userCardId
    );

    const updated = await prisma.userBenefit.update({
      where: { id: userBenefit.id },
      data: {
        reminderDays: reminderDays !== undefined ? reminderDays : undefined,
        notificationEnabled: notificationEnabled !== undefined ? notificationEnabled : undefined,
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update notification settings:', error);
    const message = error.message || 'Failed to update notification settings';
    res.status(500).json({ error: message });
  }
});

// Add benefit usage record
router.post('/:benefitId/usage', authenticate, async (req: AuthRequest, res) => {
  try {
    const { benefitId } = req.params;
    const { year, amount, usedAt, note, userCardId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const usageDate = usedAt ? new Date(usedAt) : new Date();
    const currentYear = year || usageDate.getFullYear();

    // Get or create UserBenefit with cycleNumber based on usedAt
    const userBenefit = await findOrCreateUserBenefit(
      req.user!.id,
      parseInt(benefitId),
      currentYear,
      userCardId,
      usageDate
    );

    // Create usage record
    const usage = await prisma.benefitUsage.create({
      data: {
        userBenefitId: userBenefit.id,
        amount: parseFloat(amount),
        usedAt: usageDate,
        note,
      },
    });

    // Update usedAmount
    const updatedUserBenefit = await prisma.userBenefit.update({
      where: { id: userBenefit.id },
      data: {
        usedAmount: {
          increment: parseFloat(amount),
        },
      },
      include: {
        usages: {
          orderBy: { usedAt: 'desc' },
        },
        benefit: true,
      },
    });

    res.json(updatedUserBenefit);
  } catch (error: any) {
    console.error('Failed to add usage:', error);
    const message = error.message || 'Failed to add usage record';
    res.status(500).json({ error: message });
  }
});

// Get benefit usage records
router.get('/:benefitId/usage', authenticate, async (req: AuthRequest, res) => {
  try {
    const { benefitId } = req.params;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const userCardId = req.query.userCardId ? parseInt(req.query.userCardId as string) : undefined;

    const where: any = {
      userId: req.user!.id,
      benefitId: parseInt(benefitId),
      year,
    };

    if (userCardId) {
      where.userCardId = userCardId;
    }

    const userBenefit = await prisma.userBenefit.findFirst({
      where,
      include: {
        usages: {
          orderBy: { usedAt: 'desc' },
        },
        benefit: true,
      },
    });

    if (!userBenefit) {
      return res.json({
        usedAmount: 0,
        usages: [],
        benefit: null,
      });
    }

    res.json(userBenefit);
  } catch (error) {
    console.error('Failed to fetch usage records:', error);
    res.status(500).json({ error: 'Failed to fetch usage records' });
  }
});

// Delete benefit usage record
router.delete('/:benefitId/usage/:usageId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { benefitId, usageId } = req.params;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    // Get the usage record
    const usage = await prisma.benefitUsage.findUnique({
      where: { id: parseInt(usageId) },
      include: {
        userBenefit: true,
      },
    });

    if (!usage) {
      return res.status(404).json({ error: 'Usage record not found' });
    }

    // Verify ownership
    if (usage.userBenefit.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete usage record
    await prisma.benefitUsage.delete({
      where: { id: parseInt(usageId) },
    });

    // Update usedAmount
    const updatedUserBenefit = await prisma.userBenefit.update({
      where: { id: usage.userBenefitId },
      data: {
        usedAmount: {
          decrement: usage.amount,
        },
      },
      include: {
        usages: {
          orderBy: { usedAt: 'desc' },
        },
        benefit: true,
      },
    });

    res.json(updatedUserBenefit);
  } catch (error) {
    console.error('Failed to delete usage:', error);
    res.status(500).json({ error: 'Failed to delete usage record' });
  }
});

// Archive expired benefits (can be called manually or via cron)
router.post('/archive', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await archiveExpiredBenefits();
    res.json(result);
  } catch (error) {
    console.error('Failed to archive benefits:', error);
    res.status(500).json({ error: 'Failed to archive benefits' });
  }
});

// Get benefit history
router.get('/history', authenticate, async (req: AuthRequest, res) => {
  try {
    const benefitId = req.query.benefitId ? parseInt(req.query.benefitId as string) : undefined;
    const history = await getUserBenefitHistory(req.user!.id, benefitId);
    res.json(history);
  } catch (error) {
    console.error('Failed to fetch benefit history:', error);
    res.status(500).json({ error: 'Failed to fetch benefit history' });
  }
});

export default router;
