import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { archiveExpiredBenefits, getUserBenefitHistory } from '../services/archive';

const router = Router();

// Helper function to find or create UserBenefit
async function findOrCreateUserBenefit(userId: number, benefitId: number, year: number) {
  let userBenefit = await prisma.userBenefit.findFirst({
    where: { userId, benefitId, year },
  });

  if (!userBenefit) {
    userBenefit = await prisma.userBenefit.create({
      data: {
        userId,
        benefitId,
        year,
        isCompleted: false,
        notificationEnabled: true,
      },
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
                    userId: req.user!.id,
                    year,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.json(userCards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch benefits' });
  }
});

// Mark benefit as completed
router.post('/:benefitId/complete', authenticate, async (req: AuthRequest, res) => {
  try {
    const { benefitId } = req.params;
    const { year, notes } = req.body;
    const currentYear = year || new Date().getFullYear();

    const userBenefit = await findOrCreateUserBenefit(req.user!.id, parseInt(benefitId), currentYear);

    const updated = await prisma.userBenefit.update({
      where: { id: userBenefit.id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        notes,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark benefit as completed' });
  }
});

// Unmark benefit
router.post('/:benefitId/uncomplete', authenticate, async (req: AuthRequest, res) => {
  try {
    const { benefitId } = req.params;
    const { year } = req.body;
    const currentYear = year || new Date().getFullYear();

    const userBenefit = await findOrCreateUserBenefit(req.user!.id, parseInt(benefitId), currentYear);

    const updated = await prisma.userBenefit.update({
      where: { id: userBenefit.id },
      data: {
        isCompleted: false,
        completedAt: null,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to unmark benefit' });
  }
});

// Update notification settings
router.patch('/:benefitId/settings', authenticate, async (req: AuthRequest, res) => {
  try {
    const { benefitId } = req.params;
    const { year, reminderDays, notificationEnabled } = req.body;
    const currentYear = year || new Date().getFullYear();

    const userBenefit = await findOrCreateUserBenefit(req.user!.id, parseInt(benefitId), currentYear);

    const updated = await prisma.userBenefit.update({
      where: { id: userBenefit.id },
      data: {
        reminderDays: reminderDays !== undefined ? reminderDays : undefined,
        notificationEnabled: notificationEnabled !== undefined ? notificationEnabled : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// Add benefit usage record
router.post('/:benefitId/usage', authenticate, async (req: AuthRequest, res) => {
  try {
    const { benefitId } = req.params;
    const { year, amount, usedAt, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const currentYear = year || new Date().getFullYear();

    // Get or create UserBenefit
    const userBenefit = await findOrCreateUserBenefit(req.user!.id, parseInt(benefitId), currentYear);

    // Create usage record
    const usage = await prisma.benefitUsage.create({
      data: {
        userBenefitId: userBenefit.id,
        amount: parseFloat(amount),
        usedAt: usedAt ? new Date(usedAt) : new Date(),
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
  } catch (error) {
    console.error('Failed to add usage:', error);
    res.status(500).json({ error: 'Failed to add usage record' });
  }
});

// Get benefit usage records
router.get('/:benefitId/usage', authenticate, async (req: AuthRequest, res) => {
  try {
    const { benefitId } = req.params;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const userBenefit = await prisma.userBenefit.findFirst({
      where: {
        userId: req.user!.id,
        benefitId: parseInt(benefitId),
        year,
      },
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
