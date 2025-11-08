import { prisma } from '../lib/prisma';

/**
 * 計算當前週期編號
 * @param cycleType 週期類型
 * @param customStartDate 自定義起始日期（用於個人化週期）
 */
function getCurrentCycle(
  cycleType: string | null,
  customStartDate?: Date
): { year: number; cycleNumber: number | null; periodEnd: Date | null } {
  const now = new Date();

  // 如果有自定義起始日期，使用它作為基準計算週期
  const baseDate = customStartDate || now;
  const year = customStartDate ? baseDate.getFullYear() : now.getFullYear();
  const month = baseDate.getMonth() + 1; // 1-12
  const day = baseDate.getDate();

  if (!cycleType) {
    // 一次性福利，無週期
    return { year: now.getFullYear(), cycleNumber: null, periodEnd: null };
  }

  let cycleNumber: number | null = null;
  let periodEnd: Date | null = null;

  if (customStartDate) {
    // 個人化週期：基於自定義起始日期計算
    const daysSinceStart = Math.floor((now.getTime() - customStartDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (cycleType) {
      case 'MONTHLY':
        // 計算已經過了幾個月
        const monthsSinceStart = Math.floor(daysSinceStart / 30);
        cycleNumber = (monthsSinceStart % 12) + 1; // 1-12
        // 下一個月的同一天（減1天）
        const nextMonthDate = new Date(customStartDate);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + monthsSinceStart + 1);
        nextMonthDate.setDate(day - 1);
        nextMonthDate.setHours(23, 59, 59, 999);
        periodEnd = nextMonthDate;
        break;

      case 'QUARTERLY':
        // 計算已經過了幾季
        const quartersSinceStart = Math.floor(daysSinceStart / 90);
        cycleNumber = (quartersSinceStart % 4) + 1; // 1-4
        // 下一季的前一天
        const nextQuarterDate = new Date(customStartDate);
        nextQuarterDate.setMonth(nextQuarterDate.getMonth() + (quartersSinceStart + 1) * 3);
        nextQuarterDate.setDate(day - 1);
        nextQuarterDate.setHours(23, 59, 59, 999);
        periodEnd = nextQuarterDate;
        break;

      case 'YEARLY':
        // 計算已經過了幾年
        const yearsSinceStart = Math.floor(daysSinceStart / 365);
        cycleNumber = 1;
        // 下一年的同一天（減1天）
        const nextYearDate = new Date(customStartDate);
        nextYearDate.setFullYear(nextYearDate.getFullYear() + yearsSinceStart + 1);
        nextYearDate.setDate(day - 1);
        nextYearDate.setHours(23, 59, 59, 999);
        periodEnd = nextYearDate;
        break;
    }
  } else {
    // 標準週期：基於當前日期計算
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
  }

  return { year: customStartDate ? now.getFullYear() : year, cycleNumber, periodEnd };
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
export async function createCurrentCycleBenefits(
  userId: number,
  cardId: number,
  benefitStartDates?: Record<number, string>
) {
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

    // Check if this benefit has a custom start date
    const customStartDate = benefitStartDates && benefitStartDates[benefit.id]
      ? new Date(benefitStartDates[benefit.id])
      : undefined;

    const { year, cycleNumber, periodEnd } = benefit.isPersonalCycle && customStartDate
      ? getCurrentCycle(benefit.cycleType, customStartDate)
      : getCurrentCycle(benefit.cycleType);

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
          customStartDate: customStartDate || null,
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
