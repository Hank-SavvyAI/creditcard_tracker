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

// Helper function to calculate period end date for a given date and frequency
function calculatePeriodEnd(date: Date, frequency: string, cycleNumber: number): Date | null {
  const year = date.getFullYear();

  if (frequency === 'MONTHLY') {
    // End of the month
    return new Date(year, cycleNumber, 0, 23, 59, 59, 999);
  } else if (frequency === 'QUARTERLY') {
    // End of the quarter (Q1:3/31, Q2:6/30, Q3:9/30, Q4:12/31)
    const quarterEndMonth = cycleNumber * 3;
    return new Date(year, quarterEndMonth, 0, 23, 59, 59, 999);
  } else if (frequency === 'SEMI_ANNUAL') {
    // End of half year (H1:6/30, H2:12/31)
    const halfYearEndMonth = cycleNumber * 6;
    return new Date(year, halfYearEndMonth, 0, 23, 59, 59, 999);
  } else if (frequency === 'YEARLY') {
    // End of year
    return new Date(year, 12, 0, 23, 59, 59, 999);
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
        // Get regular card benefits
        const benefits = await Promise.all(
          userCard.card.benefits.map(async (benefit) => {
            const userBenefits = await prisma.userBenefit.findMany({
              where: {
                userCardId: userCard.id,
                benefitId: benefit.id,
                year,
              },
              include: {
                usages: {
                  orderBy: {
                    usedAt: 'desc'
                  }
                }
              }
            });
            return {
              ...benefit,
              userBenefits,
            };
          })
        );

        // Get custom benefits for this card
        const customUserBenefits = await prisma.userBenefit.findMany({
          where: {
            userCardId: userCard.id,
            userId: req.user!.id,
            isCustom: true,
          },
          include: {
            usages: {
              orderBy: {
                usedAt: 'desc'
              }
            }
          }
        });

        // Transform custom benefits to match the Benefit structure
        const customBenefits = customUserBenefits.map((ub) => ({
          id: ub.id, // Use userBenefit id as benefit id for custom benefits
          title: ub.customTitle || 'Custom Benefit',
          titleEn: ub.customTitleEn || ub.customTitle || 'Custom Benefit',
          category: 'Custom',
          categoryEn: 'Custom',
          amount: ub.customAmount || 0,
          currency: ub.customCurrency || 'USD',
          frequency: null,
          reminderDays: 30,
          endMonth: null,
          endDay: null,
          cardId: userCard.card.id,
          isActive: true,
          createdAt: ub.createdAt,
          updatedAt: ub.updatedAt,
          userBenefits: [ub], // Include the custom userBenefit itself
        }));

        // Combine regular and custom benefits
        const allBenefits = [...benefits, ...customBenefits];

        return {
          ...userCard,
          card: {
            ...userCard.card,
            benefits: allBenefits,
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

    // Check if this is a custom benefit (benefitId is actually userBenefit.id)
    const existingUserBenefit = await prisma.userBenefit.findFirst({
      where: {
        id: parseInt(benefitId),
        userId: req.user!.id,
        isCustom: true,
      },
    });

    let userBenefit;
    if (existingUserBenefit) {
      // This is a custom benefit, update it directly
      userBenefit = existingUserBenefit;
    } else {
      // This is a regular benefit, find or create userBenefit
      userBenefit = await findOrCreateUserBenefit(
        req.user!.id,
        parseInt(benefitId),
        currentYear,
        userCardId
      );
    }

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

    // Check if this is a custom benefit (benefitId is actually userBenefit.id)
    const existingUserBenefit = await prisma.userBenefit.findFirst({
      where: {
        id: parseInt(benefitId),
        userId: req.user!.id,
        isCustom: true,
      },
    });

    let userBenefit;
    if (existingUserBenefit) {
      // This is a custom benefit, update it directly
      userBenefit = existingUserBenefit;
    } else {
      // This is a regular benefit, find or create userBenefit
      userBenefit = await findOrCreateUserBenefit(
        req.user!.id,
        parseInt(benefitId),
        currentYear,
        userCardId
      );
    }

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

    // Check if this is a custom benefit
    const existingUserBenefit = await prisma.userBenefit.findFirst({
      where: {
        id: parseInt(benefitId),
        userId: req.user!.id,
        isCustom: true,
      },
    });

    let userBenefit;
    if (existingUserBenefit) {
      userBenefit = existingUserBenefit;
    } else {
      userBenefit = await findOrCreateUserBenefit(
        req.user!.id,
        parseInt(benefitId),
        currentYear,
        userCardId
      );
    }

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

    // Parse date as local time (not UTC)
    let usageDate: Date;
    if (usedAt) {
      // If usedAt is provided, parse it as local date (YYYY-MM-DD)
      const [y, m, d] = usedAt.split('-').map(Number);
      usageDate = new Date(y, m - 1, d, 12, 0, 0); // Set to noon local time to avoid timezone issues
    } else {
      usageDate = new Date();
    }
    const currentYear = year || usageDate.getFullYear();

    // Check if this is a custom benefit
    const customUserBenefit = await prisma.userBenefit.findFirst({
      where: {
        id: parseInt(benefitId),
        userId: req.user!.id,
        isCustom: true,
      },
    });

    if (customUserBenefit) {
      // Handle custom benefit usage
      const usage = await prisma.benefitUsage.create({
        data: {
          userBenefitId: customUserBenefit.id,
          amount,
          usedAt: usageDate,
          note,
        },
      });

      // Update used amount
      const totalUsed = await prisma.benefitUsage.aggregate({
        where: { userBenefitId: customUserBenefit.id },
        _sum: { amount: true },
      });

      const newUsedAmount = totalUsed._sum.amount || 0;
      const updated = await prisma.userBenefit.update({
        where: { id: customUserBenefit.id },
        data: {
          usedAmount: newUsedAmount,
          isCompleted: newUsedAmount >= (customUserBenefit.customAmount || 0),
        },
      });

      return res.json({ usage, userBenefit: updated });
    }

    // Get benefit to check frequency and calculate period
    const benefit = await prisma.benefit.findUnique({
      where: { id: parseInt(benefitId) },
      include: { card: true },
    });

    if (!benefit) {
      return res.status(404).json({ error: 'Benefit not found' });
    }

    // Calculate cycle number and period end for the usage date
    const cycleNumber = calculateCycleNumber(usageDate, benefit.frequency);
    const periodEnd = cycleNumber ? calculatePeriodEnd(usageDate, benefit.frequency, cycleNumber) : null;
    const now = new Date();
    const isPeriodExpired = periodEnd && now > periodEnd;

    console.log(`Adding usage for ${benefit.title}:`);
    console.log(`- Usage date: ${usageDate.toLocaleDateString()}`);
    console.log(`- Cycle number: ${cycleNumber}`);
    console.log(`- Period end: ${periodEnd?.toLocaleDateString()}`);
    console.log(`- Is expired: ${isPeriodExpired}`);

    if (isPeriodExpired) {
      // Period is expired - create directly in history
      console.log('⚠️  Period is expired, creating in UserBenefitHistory...');

      // Find userCard
      let targetUserCardId = userCardId;
      if (!targetUserCardId) {
        const userCards = await prisma.userCard.findMany({
          where: {
            userId: req.user!.id,
            cardId: benefit.cardId,
          },
        });

        if (userCards.length === 0) {
          return res.status(400).json({ error: 'User does not have this card' });
        }

        if (userCards.length > 1) {
          return res.status(400).json({ error: 'Multiple cards found. Please specify userCardId' });
        }

        targetUserCardId = userCards[0].id;
      }

      // Check if history record already exists
      let historyRecord = await prisma.userBenefitHistory.findFirst({
        where: {
          userId: req.user!.id,
          userCardId: targetUserCardId,
          benefitId: parseInt(benefitId),
          year: currentYear,
          cycleNumber: cycleNumber || undefined,
        },
      });

      // Create history record if not exists
      if (!historyRecord) {
        const now = new Date();
        historyRecord = await prisma.userBenefitHistory.create({
          data: {
            userId: req.user!.id,
            userCardId: targetUserCardId,
            benefitId: parseInt(benefitId),
            year: currentYear,
            cycleNumber,
            periodEnd,
            isCompleted: false,
            usedAmount: 0,
            notificationEnabled: false,
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      // Create usage record in history
      const usage = await prisma.benefitUsageHistory.create({
        data: {
          historyId: historyRecord.id,
          amount: parseFloat(amount),
          usedAt: usageDate,
          note,
          createdAt: usageDate,
          updatedAt: usageDate,
        },
      });

      // Update usedAmount in history
      const updatedHistory = await prisma.userBenefitHistory.update({
        where: { id: historyRecord.id },
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

      console.log(`✅ Added to history: ${updatedHistory.id}`);

      return res.json({
        ...updatedHistory,
        isHistorical: true,
        message: '此報銷記錄已添加到歷史記錄（該週期已過期）',
      });
    }

    // Period is not expired - use normal flow
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
    const allCycles = req.query.allCycles === 'true'; // If true, return all cycles, not just current

    // Get benefit to check frequency
    const benefit = await prisma.benefit.findUnique({
      where: { id: parseInt(benefitId) },
    });

    if (!benefit) {
      return res.status(404).json({ error: 'Benefit not found' });
    }

    // Calculate current cycle number based on today's date
    const now = new Date();
    const currentCycleNumber = calculateCycleNumber(now, benefit.frequency);

    const where: any = {
      userId: req.user!.id,
      benefitId: parseInt(benefitId),
      year,
    };

    if (userCardId) {
      where.userCardId = userCardId;
    }

    // Filter by current cycle number if benefit has frequency (unless allCycles is requested)
    if (!allCycles && currentCycleNumber !== null) {
      where.cycleNumber = currentCycleNumber;
    }

    if (allCycles) {
      // For spreadsheet view: get all UserBenefit records and aggregate usages
      const userBenefits = await prisma.userBenefit.findMany({
        where,
        include: {
          usages: {
            orderBy: { usedAt: 'desc' },
          },
          benefit: true,
        },
      });

      if (userBenefits.length === 0) {
        return res.json({
          usedAmount: 0,
          usages: [],
          benefit: null,
        });
      }

      // Aggregate all usages and usedAmount from all cycles
      const allUsages = userBenefits.flatMap(ub => ub.usages);
      const totalUsedAmount = userBenefits.reduce((sum, ub) => sum + (ub.usedAmount || 0), 0);

      return res.json({
        ...userBenefits[0], // Use first record as base
        usedAmount: totalUsedAmount,
        usages: allUsages.sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime()),
      });
    } else {
      // For card view: get current cycle only
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

      return res.json(userBenefit);
    }
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

// Create custom benefit (signup bonus, renewal bonus, etc.)
router.post('/custom', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userCardId, customTitle, customTitleEn, customAmount, customCurrency, periodEnd } = req.body;

    if (!userCardId || !customTitle || !customAmount || !customCurrency || !periodEnd) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user owns this card
    const userCard = await prisma.userCard.findFirst({
      where: {
        id: userCardId,
        userId: req.user!.id,
      },
    });

    if (!userCard) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const year = new Date(periodEnd).getFullYear();

    const customBenefit = await prisma.userBenefit.create({
      data: {
        userId: req.user!.id,
        userCardId,
        benefitId: null,
        year,
        cycleNumber: null,
        periodEnd: new Date(periodEnd),
        isCustom: true,
        customTitle,
        customTitleEn: customTitleEn || customTitle,
        customAmount,
        customCurrency,
        isCompleted: false,
        usedAmount: 0,
      },
    });

    res.json(customBenefit);
  } catch (error) {
    console.error('Failed to create custom benefit:', error);
    res.status(500).json({ error: 'Failed to create custom benefit' });
  }
});

// Update custom benefit
router.put('/custom/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { customTitle, customTitleEn, customAmount, customCurrency, periodEnd } = req.body;

    // Verify this is a custom benefit owned by the user
    const existingBenefit = await prisma.userBenefit.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user!.id,
        isCustom: true,
      },
    });

    if (!existingBenefit) {
      return res.status(404).json({ error: 'Custom benefit not found' });
    }

    const updateData: any = {};
    if (customTitle !== undefined) updateData.customTitle = customTitle;
    if (customTitleEn !== undefined) updateData.customTitleEn = customTitleEn;
    if (customAmount !== undefined) updateData.customAmount = customAmount;
    if (customCurrency !== undefined) updateData.customCurrency = customCurrency;
    if (periodEnd !== undefined) {
      updateData.periodEnd = new Date(periodEnd);
      updateData.year = new Date(periodEnd).getFullYear();
    }

    const updated = await prisma.userBenefit.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update custom benefit:', error);
    res.status(500).json({ error: 'Failed to update custom benefit' });
  }
});

// Delete custom benefit
router.delete('/custom/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Verify this is a custom benefit owned by the user
    const existingBenefit = await prisma.userBenefit.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user!.id,
        isCustom: true,
      },
    });

    if (!existingBenefit) {
      return res.status(404).json({ error: 'Custom benefit not found' });
    }

    // Delete the custom benefit (will cascade delete usages)
    await prisma.userBenefit.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Custom benefit deleted successfully' });
  } catch (error) {
    console.error('Failed to delete custom benefit:', error);
    res.status(500).json({ error: 'Failed to delete custom benefit' });
  }
});

export default router;
