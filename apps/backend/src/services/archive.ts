import { prisma } from '../lib/prisma';

/**
 * 計算當前週期編號
 */
function getCurrentCycle(cycleType: string | null): { year: number; cycleNumber: number | null; periodEnd: Date | null } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  if (!cycleType) {
    // 一次性福利，無週期
    return { year, cycleNumber: null, periodEnd: null };
  }

  let cycleNumber: number | null = null;
  let periodEnd: Date | null = null;

  switch (cycleType) {
    case 'MONTHLY':
      cycleNumber = month; // 1-12
      // 月底
      periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
      break;

    case 'QUARTERLY':
      cycleNumber = Math.ceil(month / 3); // 1-4
      // 季度最後一天
      const quarterEndMonth = cycleNumber * 3;
      periodEnd = new Date(year, quarterEndMonth, 0, 23, 59, 59, 999);
      break;

    case 'YEARLY':
      cycleNumber = 1;
      // 年底
      periodEnd = new Date(year, 11, 31, 23, 59, 59, 999);
      break;
  }

  return { year, cycleNumber, periodEnd };
}

/**
 * 歸檔過期的福利記錄
 * 使用交易將 periodEnd < NOW() 的記錄移到歷史表
 */
export async function archiveExpiredBenefits() {
  const now = new Date();

  try {
    // 查找所有過期的 UserBenefit
    const expiredBenefits = await prisma.userBenefit.findMany({
      where: {
        periodEnd: {
          lt: now,
        },
      },
      include: {
        usages: true,
      },
    });

    if (expiredBenefits.length === 0) {
      console.log('No expired benefits to archive');
      return { archived: 0 };
    }

    // 使用交易處理歸檔
    const result = await prisma.$transaction(async (tx) => {
      let archivedCount = 0;

      for (const benefit of expiredBenefits) {
        // 1. 插入到歷史表
        const history = await tx.userBenefitHistory.create({
          data: {
            userId: benefit.userId,
            benefitId: benefit.benefitId,
            year: benefit.year,
            cycleNumber: benefit.cycleNumber,
            periodEnd: benefit.periodEnd,
            isCompleted: benefit.isCompleted,
            completedAt: benefit.completedAt,
            notes: benefit.notes,
            reminderDays: benefit.reminderDays,
            notificationEnabled: benefit.notificationEnabled,
            usedAmount: benefit.usedAmount,
            createdAt: benefit.createdAt,
            updatedAt: benefit.updatedAt,
          },
        });

        // 2. 複製使用記錄到歷史表
        if (benefit.usages.length > 0) {
          await tx.benefitUsageHistory.createMany({
            data: benefit.usages.map((usage) => ({
              historyId: history.id,
              amount: usage.amount,
              usedAt: usage.usedAt,
              note: usage.note,
              createdAt: usage.createdAt,
              updatedAt: usage.updatedAt,
            })),
          });
        }

        // 3. 刪除使用記錄（因為有 onDelete: Cascade，會自動刪除）
        // 4. 刪除主表記錄
        await tx.userBenefit.delete({
          where: { id: benefit.id },
        });

        archivedCount++;
      }

      return { archived: archivedCount };
    });

    console.log(`Archived ${result.archived} expired benefits`);
    return result;
  } catch (error) {
    console.error('Failed to archive expired benefits:', error);
    throw error;
  }
}

/**
 * 為用戶創建當前週期的福利記錄
 * 當用戶追蹤一張卡片時調用
 */
export async function createCurrentCycleBenefits(userId: number, cardId: number) {
  const card = await prisma.creditCard.findUnique({
    where: { id: cardId },
    include: { benefits: true },
  });

  if (!card) {
    throw new Error('Card not found');
  }

  const results = [];

  for (const benefit of card.benefits) {
    if (!benefit.isActive) continue;

    const { year, cycleNumber, periodEnd } = getCurrentCycle(benefit.cycleType);

    // 檢查是否已存在當前週期的記錄
    const existing = await prisma.userBenefit.findFirst({
      where: {
        userId,
        benefitId: benefit.id,
        year,
        cycleNumber,
      },
    });

    if (!existing) {
      const created = await prisma.userBenefit.create({
        data: {
          userId,
          benefitId: benefit.id,
          year,
          cycleNumber,
          periodEnd,
        },
      });
      results.push(created);
    }
  }

  return results;
}

/**
 * 獲取用戶的福利歷史記錄
 */
export async function getUserBenefitHistory(userId: number, benefitId?: number) {
  const where: any = { userId };
  if (benefitId) {
    where.benefitId = benefitId;
  }

  const history = await prisma.userBenefitHistory.findMany({
    where,
    include: {
      benefit: {
        include: {
          card: true,
        },
      },
      usages: true,
    },
    orderBy: [{ year: 'desc' }, { cycleNumber: 'desc' }],
  });

  return history;
}
