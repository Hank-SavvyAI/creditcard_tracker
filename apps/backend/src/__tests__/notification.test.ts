/**
 * 通知系統測試
 * 測試各種週期類型的通知計算邏輯
 */

// 測試案例介面
interface TestCase {
  name: string
  description: string
  frequency: string
  startMonth?: number
  startDay?: number
  endMonth?: number
  endDay?: number
  expectedBehavior: string
}

// 定義所有測試案例
const testCases: TestCase[] = [
  // 每月測試案例
  {
    name: '每月福利 - 餐飲回饋',
    description: '每月 5% 餐飲回饋，上限 NT$ 500',
    frequency: 'MONTHLY',
    expectedBehavior: '每月 1 日重置，月底到期（1/31, 2/28, 3/31...）'
  },
  {
    name: '每月福利 - 影音訂閱',
    description: '每月 Netflix 訂閱回饋 NT$ 200',
    frequency: 'MONTHLY',
    expectedBehavior: '每月自動計算當月最後一天為到期日'
  },

  // 每季測試案例
  {
    name: '每季福利 - 網購回饋',
    description: '每季網購 3% 回饋，上限 NT$ 2,000',
    frequency: 'QUARTERLY',
    expectedBehavior: 'Q1(3/31), Q2(6/30), Q3(9/30), Q4(12/31)'
  },
  {
    name: '每季福利 - 加油優惠',
    description: '每季加油每公升折 NT$ 2',
    frequency: 'QUARTERLY',
    expectedBehavior: '自動計算當前季度結束日'
  },

  // 每半年測試案例
  {
    name: '每半年福利 - FHR 酒店報銷',
    description: '每半年 FHR/THC 酒店報銷 USD 300',
    frequency: 'SEMI_ANNUALLY',
    expectedBehavior: '上半年(6/30), 下半年(12/31)'
  },
  {
    name: '每半年福利 - Saks 購物金',
    description: '每半年 Saks Fifth Avenue USD 50',
    frequency: 'SEMI_ANNUALLY',
    expectedBehavior: '1-6月到期6/30, 7-12月到期12/31'
  },

  // 每年測試案例
  {
    name: '每年福利 - 航空雜費回饋',
    description: '每年航空雜費報銷 USD 200',
    frequency: 'YEARLY',
    endMonth: 12,
    endDay: 31,
    expectedBehavior: '每年 12/31 到期'
  },
  {
    name: '每年福利 - 生日禮金',
    description: '生日當月禮金 NT$ 1,000',
    frequency: 'YEARLY',
    endMonth: 12,
    endDay: 31,
    expectedBehavior: '每年 12/31 到期，可自訂結束日期'
  },
  {
    name: '每年福利 - 會計年度福利',
    description: '會計年度福利（4/1 - 3/31）',
    frequency: 'YEARLY',
    endMonth: 3,
    endDay: 31,
    expectedBehavior: '自訂年度結束日為 3/31'
  },

  // 一次性測試案例
  {
    name: '一次性福利 - 新戶禮',
    description: '新戶首刷禮 NT$ 3,000',
    frequency: 'ONE_TIME',
    endMonth: 6,
    endDay: 30,
    expectedBehavior: '指定結束日期 6/30，不重置'
  },
  {
    name: '一次性福利 - 限時優惠',
    description: '限時優惠活動至 2025/9/30',
    frequency: 'ONE_TIME',
    endMonth: 9,
    endDay: 30,
    expectedBehavior: '固定結束日期 9/30'
  },
]

/**
 * 計算週期結束日期
 */
function calculatePeriodEnd(
  frequency: string,
  endMonth?: number,
  endDay?: number
): Date | null {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12

  switch (frequency) {
    case 'MONTHLY':
      // 當月最後一天
      const monthEnd = new Date(currentYear, currentMonth, 0)
      return monthEnd

    case 'QUARTERLY':
      // 當前季度最後一天
      const quarter = Math.ceil(currentMonth / 3) // 1, 2, 3, 4
      const quarterEndMonth = quarter * 3 // 3, 6, 9, 12
      const quarterEnd = new Date(currentYear, quarterEndMonth, 0)
      return quarterEnd

    case 'SEMI_ANNUALLY':
      // 當前半年的最後一天 (上半年:6/30, 下半年:12/31)
      const halfYear = currentMonth <= 6 ? 1 : 2
      const halfYearEndMonth = halfYear === 1 ? 6 : 12
      const halfYearEnd = new Date(currentYear, halfYearEndMonth, 0)
      return halfYearEnd

    case 'YEARLY':
      // 使用 benefit 定義的結束月日，或預設12/31
      const yearEndMonth = endMonth || 12
      const yearEndDay = endDay || 31
      const yearEnd = new Date(currentYear, yearEndMonth - 1, yearEndDay)
      return yearEnd

    case 'ONE_TIME':
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
 * 計算提醒日期
 */
function calculateReminderDate(periodEnd: Date, reminderDays: number): Date {
  const reminderDate = new Date(periodEnd)
  reminderDate.setDate(reminderDate.getDate() - reminderDays)
  return reminderDate
}

/**
 * 格式化日期
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * 判斷是否應該發送通知
 */
function shouldSendNotification(
  periodEnd: Date,
  reminderDays: number,
  now: Date = new Date()
): boolean {
  const reminderDate = calculateReminderDate(periodEnd, reminderDays)
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const reminderDateOnly = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate())

  return nowDate >= reminderDateOnly && nowDate <= periodEnd
}

/**
 * 獲取當前週期標籤
 */
function getCurrentCycleLabel(frequency: string): string {
  const now = new Date()
  const month = now.getMonth() + 1

  switch (frequency) {
    case 'MONTHLY':
      return `本月 (${month}月)`

    case 'QUARTERLY':
      const quarter = Math.ceil(month / 3)
      return `本季 (Q${quarter})`

    case 'SEMI_ANNUALLY':
      const halfYear = month <= 6 ? 1 : 2
      return halfYear === 1 ? '上半年' : '下半年'

    case 'YEARLY':
      return '本年度'

    case 'ONE_TIME':
      return '一次性'

    default:
      return '-'
  }
}

// Jest 測試套件
describe('通知系統測試', () => {
  describe('週期結束日期計算', () => {
    test('MONTHLY - 應該計算當月最後一天', () => {
      const result = calculatePeriodEnd('MONTHLY')
      expect(result).not.toBeNull()
      const now = new Date()
      const expected = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      expect(result?.getDate()).toBe(expected.getDate())
      expect(result?.getMonth()).toBe(expected.getMonth())
    })

    test('QUARTERLY - 應該計算當前季度最後一天', () => {
      const result = calculatePeriodEnd('QUARTERLY')
      expect(result).not.toBeNull()
      const now = new Date()
      const month = now.getMonth() + 1
      const quarter = Math.ceil(month / 3)
      const quarterEndMonth = quarter * 3
      expect(result?.getMonth()).toBe(quarterEndMonth - 1)
    })

    test('SEMI_ANNUALLY - 應該計算半年最後一天', () => {
      const result = calculatePeriodEnd('SEMI_ANNUALLY')
      expect(result).not.toBeNull()
      const now = new Date()
      const month = now.getMonth() + 1
      const expectedMonth = month <= 6 ? 6 : 12
      expect(result?.getMonth()).toBe(expectedMonth - 1)
    })

    test('YEARLY - 應該計算年度結束日', () => {
      const result = calculatePeriodEnd('YEARLY', 12, 31)
      expect(result).not.toBeNull()
      expect(result?.getMonth()).toBe(11) // December
      expect(result?.getDate()).toBe(31)
    })

    test('YEARLY - 自訂會計年度結束日 (3/31)', () => {
      const result = calculatePeriodEnd('YEARLY', 3, 31)
      expect(result).not.toBeNull()
      expect(result?.getMonth()).toBe(2) // March
      expect(result?.getDate()).toBe(31)
    })

    test('ONE_TIME - 應該使用指定的結束日期', () => {
      const result = calculatePeriodEnd('ONE_TIME', 6, 30)
      expect(result).not.toBeNull()
      expect(result?.getMonth()).toBe(5) // June
      expect(result?.getDate()).toBe(30)
    })
  })

  describe('提醒日期計算', () => {
    test('應該正確計算提醒日期', () => {
      const periodEnd = new Date(2025, 11, 31) // 2025/12/31
      const result = calculateReminderDate(periodEnd, 7)
      expect(result.getDate()).toBe(24) // 12/24
      expect(result.getMonth()).toBe(11) // December
    })

    test('應該處理跨月的提醒日期', () => {
      const periodEnd = new Date(2025, 0, 5) // 2025/1/5
      const result = calculateReminderDate(periodEnd, 7)
      expect(result.getMonth()).toBe(11) // Previous December
      expect(result.getDate()).toBe(29)
    })
  })

  describe('通知發送判斷', () => {
    test('應該在提醒日當天發送通知', () => {
      const periodEnd = new Date()
      periodEnd.setDate(periodEnd.getDate() + 7)
      const result = shouldSendNotification(periodEnd, 7, new Date())
      expect(result).toBe(true)
    })

    test('提醒日之前不應發送通知', () => {
      const periodEnd = new Date()
      periodEnd.setDate(periodEnd.getDate() + 10)
      const result = shouldSendNotification(periodEnd, 7, new Date())
      expect(result).toBe(false)
    })

    test('過期後不應發送通知', () => {
      const periodEnd = new Date()
      periodEnd.setDate(periodEnd.getDate() - 1)
      const result = shouldSendNotification(periodEnd, 7, new Date())
      expect(result).toBe(false)
    })
  })

  describe('週期標籤', () => {
    test('MONTHLY - 應該返回正確的月份標籤', () => {
      const result = getCurrentCycleLabel('MONTHLY')
      const month = new Date().getMonth() + 1
      expect(result).toBe(`本月 (${month}月)`)
    })

    test('QUARTERLY - 應該返回正確的季度標籤', () => {
      const result = getCurrentCycleLabel('QUARTERLY')
      const month = new Date().getMonth() + 1
      const quarter = Math.ceil(month / 3)
      expect(result).toBe(`本季 (Q${quarter})`)
    })

    test('SEMI_ANNUALLY - 應該返回正確的半年標籤', () => {
      const result = getCurrentCycleLabel('SEMI_ANNUALLY')
      const month = new Date().getMonth() + 1
      const expected = month <= 6 ? '上半年' : '下半年'
      expect(result).toBe(expected)
    })

    test('YEARLY - 應該返回年度標籤', () => {
      const result = getCurrentCycleLabel('YEARLY')
      expect(result).toBe('本年度')
    })

    test('ONE_TIME - 應該返回一次性標籤', () => {
      const result = getCurrentCycleLabel('ONE_TIME')
      expect(result).toBe('一次性')
    })
  })

  describe('完整測試案例驗證', () => {
    testCases.forEach((testCase, index) => {
      test(`案例 #${index + 1}: ${testCase.name}`, () => {
        const periodEnd = calculatePeriodEnd(
          testCase.frequency,
          testCase.endMonth,
          testCase.endDay
        )

        expect(periodEnd).not.toBeNull()

        // 驗證週期標籤
        const cycleLabel = getCurrentCycleLabel(testCase.frequency)
        expect(cycleLabel).toBeTruthy()

        // 驗證提醒日期計算
        if (periodEnd) {
          const reminderDate7 = calculateReminderDate(periodEnd, 7)
          const reminderDate30 = calculateReminderDate(periodEnd, 30)
          expect(reminderDate7.getTime()).toBeLessThan(periodEnd.getTime())
          expect(reminderDate30.getTime()).toBeLessThan(periodEnd.getTime())
        }
      })
    })
  })
})

// 輸出測試報告 (用於手動測試)
export function runManualTest() {
  console.log('\n')
  console.log('╔═══════════════════════════════════════════════════════════════════════╗')
  console.log('║                   信用卡福利通知系統 - 測試報告                       ║')
  console.log('╚═══════════════════════════════════════════════════════════════════════╝')
  console.log(`\n執行時間: ${new Date().toLocaleString('zh-TW')}`)
  console.log(`測試案例數量: ${testCases.length}`)

  testCases.forEach((testCase, index) => {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`測試案例 #${index + 1}: ${testCase.name}`)
    console.log('='.repeat(80))
    console.log(`📝 描述: ${testCase.description}`)
    console.log(`🔄 頻率: ${testCase.frequency}`)
    console.log(`📅 預期行為: ${testCase.expectedBehavior}`)

    const periodEnd = calculatePeriodEnd(
      testCase.frequency,
      testCase.endMonth,
      testCase.endDay
    )

    if (!periodEnd) {
      console.log('❌ 無法計算週期結束日')
      return
    }

    const now = new Date()
    console.log(`\n📍 當前日期: ${formatDate(now)}`)
    console.log(`🏁 週期結束日: ${formatDate(periodEnd)}`)
    console.log(`🔖 當前週期: ${getCurrentCycleLabel(testCase.frequency)}`)

    const reminderDaysList = [7, 14, 30, 60]

    console.log('\n📢 通知測試結果:')
    console.log('-'.repeat(80))
    console.log('提醒天數 | 提醒日期      | 是否通知 | 剩餘天數')
    console.log('-'.repeat(80))

    reminderDaysList.forEach(reminderDays => {
      const reminderDate = calculateReminderDate(periodEnd, reminderDays)
      const shouldNotify = shouldSendNotification(periodEnd, reminderDays, now)
      const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      const notifySymbol = shouldNotify ? '✅ 是' : '❌ 否'
      console.log(
        `${reminderDays.toString().padEnd(8)} | ${formatDate(reminderDate)} | ${notifySymbol.padEnd(8)} | ${daysRemaining} 天`
      )
    })

    const daysUntilExpiry = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      console.log(`\n⚠️  警告: 此週期已過期 ${Math.abs(daysUntilExpiry)} 天`)
    } else if (daysUntilExpiry === 0) {
      console.log('\n⏰ 注意: 今天是最後一天！')
    } else {
      console.log(`\n⏳ 距離到期還有 ${daysUntilExpiry} 天`)
    }
  })

  console.log('\n')
  console.log('='.repeat(80))
  console.log('✅ 所有測試案例執行完成！')
  console.log('='.repeat(80))
  console.log('\n')

  console.log('📊 測試摘要:')
  console.log('-'.repeat(80))
  const frequencyCount: { [key: string]: number } = {}
  testCases.forEach(tc => {
    frequencyCount[tc.frequency] = (frequencyCount[tc.frequency] || 0) + 1
  })

  Object.entries(frequencyCount).forEach(([freq, count]) => {
    console.log(`${freq.padEnd(20)} : ${count} 個測試案例`)
  })
  console.log('-'.repeat(80))
}
