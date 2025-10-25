/**
 * 日期和週期相關的工具函數
 */

/**
 * 根據福利頻率計算當前週期的到期日
 * @param frequency 福利頻率 (MONTHLY, QUARTERLY, YEARLY, ONCE)
 * @param endMonth 結束月份 (1-12)
 * @param endDay 結束日期
 * @returns 到期日的 Date 物件，如果無法計算則返回 null
 */
export function calculatePeriodEnd(
  frequency: string | null,
  endMonth?: number,
  endDay?: number
): Date | null {
  if (!frequency) return null

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12

  switch (frequency) {
    case 'MONTHLY':
      // 當月最後一天
      // new Date(year, month, 0) 會回傳上個月的最後一天
      // 所以要用 currentMonth (不是 currentMonth - 1)
      const monthEnd = new Date(currentYear, currentMonth, 0)
      return monthEnd

    case 'QUARTERLY':
      // 當前季度最後一天
      const quarter = Math.ceil(currentMonth / 3) // 1, 2, 3, 4
      const quarterEndMonth = quarter * 3 // 3, 6, 9, 12
      const quarterEnd = new Date(currentYear, quarterEndMonth, 0)
      return quarterEnd

    case 'YEARLY':
      // 使用 benefit 定義的結束月日，或預設12/31
      const yearEndMonth = endMonth || 12
      const yearEndDay = endDay || 31
      const yearEnd = new Date(currentYear, yearEndMonth - 1, yearEndDay)
      return yearEnd

    case 'ONCE':
      // 一次性福利，使用定義的結束日期
      if (endMonth && endDay) {
        return new Date(currentYear, endMonth - 1, endDay)
      }
      return null

    default:
      return null
  }
}

/**
 * 格式化日期為本地化字串
 * @param dateString ISO 日期字串或 null
 * @param language 語言 ('zh-TW' 或 'en')
 * @returns 格式化的日期字串，無效日期返回 '-'
 */
export function formatDate(
  dateString: string | Date | null,
  language: 'zh-TW' | 'en' = 'zh-TW'
): string {
  if (!dateString) return '-'

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString

  // 檢查是否為有效日期
  if (isNaN(date.getTime())) return '-'

  return date.toLocaleDateString(language === 'zh-TW' ? 'zh-TW' : 'en-US')
}

/**
 * 獲取週期類型的本地化標籤
 * @param frequency 福利頻率
 * @param language 語言
 * @returns 本地化的週期標籤
 */
export function getCycleLabel(
  frequency: string | null,
  language: 'zh-TW' | 'en' = 'zh-TW'
): string {
  const labels = {
    'zh-TW': {
      MONTHLY: '每月',
      QUARTERLY: '每季',
      YEARLY: '每年',
      ONCE: '一次性',
    },
    en: {
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      YEARLY: 'Yearly',
      ONCE: 'One-time',
    },
  }

  if (!frequency) {
    return labels[language].ONCE
  }

  return labels[language][frequency as keyof typeof labels['zh-TW']] || labels[language].ONCE
}

/**
 * 計算當前月份所屬的季度
 * @param month 月份 (1-12)
 * @returns 季度 (1-4)
 */
export function getQuarter(month: number = new Date().getMonth() + 1): number {
  return Math.ceil(month / 3)
}

/**
 * 獲取當前週期的標籤（例如：本月、本季、本年度）
 * @param frequency 福利頻率
 * @param language 語言
 * @returns 當前週期標籤
 */
export function getCurrentCycleLabel(
  frequency: string | null,
  language: 'zh-TW' | 'en' = 'zh-TW'
): string | null {
  if (!frequency) return null

  const now = new Date()
  const month = now.getMonth() + 1

  switch (frequency) {
    case 'MONTHLY':
      return language === 'zh-TW' ? `本月 (${month}月)` : `This Month (${month})`

    case 'QUARTERLY':
      const quarter = getQuarter(month)
      return language === 'zh-TW' ? `本季 (Q${quarter})` : `This Quarter (Q${quarter})`

    case 'YEARLY':
      return language === 'zh-TW' ? '本年度' : 'This Year'

    default:
      return null
  }
}
