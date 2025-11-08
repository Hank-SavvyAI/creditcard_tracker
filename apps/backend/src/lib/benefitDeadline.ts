/**
 * Utility functions for calculating benefit deadlines
 */

interface BenefitDeadlineParams {
  cycleType: string | null;
  isPersonalCycle: boolean;
  customStartDate?: Date | null;
  year: number;
  cycleNumber?: number | null;
}

/**
 * Calculate the deadline for a benefit based on its cycle type
 */
export function calculateBenefitDeadline(params: BenefitDeadlineParams): Date | null {
  const { cycleType, isPersonalCycle, customStartDate, year, cycleNumber } = params;

  if (!cycleType) {
    // One-time benefits don't have deadlines
    return null;
  }

  // For personal cycle benefits, calculate based on custom start date
  if (isPersonalCycle && customStartDate) {
    const startDate = new Date(customStartDate);

    switch (cycleType) {
      case 'MONTHLY':
      case 'CALENDAR_MONTH':
        // Add 1 month, then subtract 1 day to get end of period
        const monthEnd = new Date(startDate);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(monthEnd.getDate() - 1);
        monthEnd.setHours(23, 59, 59, 999);
        return monthEnd;

      case 'QUARTERLY':
        // Add 3 months, then subtract 1 day
        const quarterEnd = new Date(startDate);
        quarterEnd.setMonth(quarterEnd.getMonth() + 3);
        quarterEnd.setDate(quarterEnd.getDate() - 1);
        quarterEnd.setHours(23, 59, 59, 999);
        return quarterEnd;

      case 'SEMI_ANNUALLY':
        // Add 6 months, then subtract 1 day
        const semiEnd = new Date(startDate);
        semiEnd.setMonth(semiEnd.getMonth() + 6);
        semiEnd.setDate(semiEnd.getDate() - 1);
        semiEnd.setHours(23, 59, 59, 999);
        return semiEnd;

      case 'ANNUALLY':
        // Add 1 year, then subtract 1 day
        const yearEnd = new Date(startDate);
        yearEnd.setFullYear(yearEnd.getFullYear() + 1);
        yearEnd.setDate(yearEnd.getDate() - 1);
        yearEnd.setHours(23, 59, 59, 999);
        return yearEnd;

      default:
        return null;
    }
  }

  // For fixed cycle benefits, calculate based on calendar periods
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();

  switch (cycleType) {
    case 'MONTHLY':
    case 'CALENDAR_MONTH':
      // End of the specified month in the year
      if (cycleNumber && cycleNumber >= 1 && cycleNumber <= 12) {
        return new Date(year, cycleNumber, 0, 23, 59, 59, 999); // Last day of month
      }
      // If no cycle number, use current month
      return new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    case 'QUARTERLY':
      // Q1: Jan-Mar (end Mar 31), Q2: Apr-Jun (end Jun 30)
      // Q3: Jul-Sep (end Sep 30), Q4: Oct-Dec (end Dec 31)
      if (cycleNumber && cycleNumber >= 1 && cycleNumber <= 4) {
        const quarterEndMonth = cycleNumber * 3; // 3, 6, 9, 12
        return new Date(year, quarterEndMonth, 0, 23, 59, 59, 999);
      }
      // If no cycle number, calculate current quarter
      const quarter = Math.floor(currentMonth / 3) + 1;
      const quarterEndMonth = quarter * 3;
      return new Date(currentYear, quarterEndMonth, 0, 23, 59, 59, 999);

    case 'SEMI_ANNUALLY':
      // First half: Jan-Jun (end Jun 30), Second half: Jul-Dec (end Dec 31)
      if (cycleNumber === 1) {
        return new Date(year, 6, 0, 23, 59, 59, 999); // Jun 30
      } else if (cycleNumber === 2) {
        return new Date(year, 12, 0, 23, 59, 59, 999); // Dec 31
      }
      // If no cycle number, calculate current half
      const isFirstHalf = currentMonth < 6;
      return isFirstHalf
        ? new Date(currentYear, 6, 0, 23, 59, 59, 999)  // Jun 30
        : new Date(currentYear, 12, 0, 23, 59, 59, 999); // Dec 31

    case 'ANNUALLY':
      // End of year
      return new Date(year, 12, 0, 23, 59, 59, 999); // Dec 31

    default:
      return null;
  }
}

/**
 * Check if a benefit is expiring within the given number of days
 */
export function isBenefitExpiringWithin(deadline: Date | null, days: number): boolean {
  if (!deadline) {
    return false;
  }

  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Check if deadline is in the future but before futureDate
  return deadline >= now && deadline <= futureDate;
}

/**
 * Calculate days remaining until deadline
 */
export function getDaysRemaining(deadline: Date | null): number | null {
  if (!deadline) {
    return null;
  }

  const now = new Date();
  if (deadline < now) {
    return 0; // Already expired
  }

  const diffMs = deadline.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
