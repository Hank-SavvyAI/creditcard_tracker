/**
 * LocalStorageProvider
 *
 * 使用瀏覽器 localStorage 存儲數據的 Provider 實作
 * 適用於未登入用戶，所有數據存儲在本地
 */

import {
  DataProvider,
  UserCard,
  Benefit,
  UserBenefit,
  BenefitUsage,
  CustomBenefitInput,
  CardSettings,
  BenefitSettings,
} from './interface'

// localStorage keys
const STORAGE_KEYS = {
  USER_CARDS: 'local_user_cards',
  NEXT_ID: 'local_next_id',
} as const

/**
 * 獲取下一個可用的 ID
 */
function getNextId(key: string): number {
  const stored = localStorage.getItem(`${STORAGE_KEYS.NEXT_ID}_${key}`)
  const nextId = stored ? parseInt(stored) + 1 : 1
  localStorage.setItem(`${STORAGE_KEYS.NEXT_ID}_${key}`, nextId.toString())
  return nextId
}

export class LocalStorageProvider implements DataProvider {
  readonly providerType = 'local' as const

  // ========== 私有輔助方法 ==========

  /**
   * 從 localStorage 讀取所有卡片
   */
  private loadCards(): UserCard[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_CARDS)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load cards from localStorage:', error)
      return []
    }
  }

  /**
   * 儲存卡片到 localStorage
   */
  private saveCards(cards: UserCard[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_CARDS, JSON.stringify(cards))
    } catch (error) {
      console.error('Failed to save cards to localStorage:', error)
      throw new Error('儲存失敗：本地存儲空間不足')
    }
  }

  /**
   * 根據 userCardId 查找卡片
   */
  private findCard(userCardId: number): UserCard | undefined {
    const cards = this.loadCards()
    return cards.find((c) => c.id === userCardId)
  }

  /**
   * 根據 userCardId 和 benefitId 查找福利
   */
  private findBenefit(userCardId: number, benefitId: number): { card: UserCard; benefit: Benefit } | undefined {
    const card = this.findCard(userCardId)
    if (!card || !card.benefits) return undefined

    const benefit = card.benefits.find((b: any) => b.id === benefitId)
    if (!benefit) return undefined

    return { card, benefit }
  }

  // ========== 卡片管理 ==========

  async getMyCards(): Promise<UserCard[]> {
    return this.loadCards()
  }

  async addCard(cardId: number, nickname?: string, benefitStartDates?: Record<number, string>): Promise<UserCard> {
    const cards = this.loadCards()

    // 檢查卡片是否已存在
    const existingCard = cards.find((c) => c.cardId === cardId)
    if (existingCard) {
      throw new Error('此卡片已在追蹤列表中')
    }

    // 從 API 獲取卡片資訊（需要網路連線）
    // 注意：這裡我們假設卡片列表是公開的，不需要登入也能查看
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cards`)
    const allCards: any[] = await response.json()
    const cardData = allCards.find((c: any) => c.id === cardId)

    if (!cardData) {
      throw new Error('找不到此卡片')
    }

    // 計算 cardInstance（同一張卡片的第幾個實例）
    const sameCards = cards.filter((c) => c.cardId === cardId)
    const cardInstance = sameCards.length + 1

    // 從 cardData 提取 Card 資料（不含 benefits）
    const { benefits: _benefits, ...cardOnly } = cardData

    // 創建新的 UserCard
    const newUserCard: UserCard = {
      id: getNextId('user_card'),
      cardId,
      nickname,
      displayOrder: cards.length,
      cardInstance,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      card: cardOnly,
    }

    cards.push(newUserCard)
    this.saveCards(cards)

    return newUserCard
  }

  async removeCard(userCardId: number): Promise<void> {
    const cards = this.loadCards()
    const filteredCards = cards.filter((c) => c.id !== userCardId)

    if (filteredCards.length === cards.length) {
      throw new Error('找不到此卡片')
    }

    this.saveCards(filteredCards)
  }

  async updateCardSettings(userCardId: number, settings: CardSettings): Promise<void> {
    const cards = this.loadCards()
    const card = cards.find((c) => c.id === userCardId)

    if (!card) {
      throw new Error('找不到此卡片')
    }

    Object.assign(card, settings, { updatedAt: new Date().toISOString() })
    this.saveCards(cards)
  }

  async updateCardsOrder(updates: { id: number; displayOrder: number }[]): Promise<void> {
    const cards = this.loadCards()

    updates.forEach(({ id, displayOrder }) => {
      const card = cards.find((c) => c.id === id)
      if (card) {
        card.displayOrder = displayOrder
        card.updatedAt = new Date().toISOString()
      }
    })

    this.saveCards(cards)
  }

  // ========== 福利管理 ==========

  async getMyBenefits(year?: number): Promise<UserCard[]> {
    // 本地模式下，需要從 API 獲取福利資訊
    const cards = this.loadCards()
    const currentYear = year || new Date().getFullYear()

    // 先獲取所有卡片資訊（含福利）
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cards`)
      const allCards: any[] = await response.json()

      // 為每張卡片載入福利
      for (const userCard of cards) {
        const cardWithBenefits = allCards.find((c: any) => c.id === userCard.cardId)

        if (cardWithBenefits && cardWithBenefits.benefits) {
          userCard.benefits = cardWithBenefits.benefits

          // 為每個福利添加本地的 userBenefits 數據
          if (userCard.benefits) {
            userCard.benefits.forEach((benefit: any) => {
              const localUserBenefits = this.getLocalUserBenefits(userCard.id, benefit.id, currentYear)
              benefit.userBenefits = localUserBenefits
            })
          }
        } else {
          userCard.benefits = []
        }

        // 載入自定義福利（開卡禮/續卡禮等）
        const customKey = `local_custom_benefits_${userCard.id}`
        const customStored = localStorage.getItem(customKey)
        if (customStored) {
          const customBenefits: UserBenefit[] = JSON.parse(customStored)
          // 將自定義福利轉換為 Benefit 格式並添加到 benefits 列表
          customBenefits.forEach((customBenefit) => {
            const benefit: any = {
              id: customBenefit.benefitId,
              cardId: userCard.cardId,
              title: customBenefit.customTitle || '',
              titleEn: customBenefit.customTitleEn,
              amount: customBenefit.customAmount || 0,
              currency: customBenefit.customCurrency || '',
              frequency: null,
              description: customBenefit.customDescription,
              userBenefits: [customBenefit],
            }
            if (!userCard.benefits) userCard.benefits = []
            userCard.benefits.push(benefit)
          })
        }
      }
    } catch (error) {
      console.error('Failed to load benefits:', error)
      // 如果載入失敗，設定所有卡片的 benefits 為空陣列
      cards.forEach((card) => {
        card.benefits = []
      })
    }

    return cards
  }

  async getCardBenefits(userCardId: number, year?: number): Promise<{ benefits: Benefit[] }> {
    const card = this.findCard(userCardId)
    if (!card) {
      throw new Error('找不到此卡片')
    }

    const currentYear = year || new Date().getFullYear()

    try {
      // 先從 API 獲取所有卡片資訊
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cards`)
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const allCards: any[] = await response.json()
      const cardWithBenefits = allCards.find((c: any) => c.id === card.cardId)

      if (!cardWithBenefits) {
        throw new Error('找不到此卡片的福利資訊')
      }

      const benefits: Benefit[] = cardWithBenefits.benefits || []

      // 為每個福利添加本地的 userBenefits 數據
      benefits.forEach((benefit: any) => {
        const localUserBenefits = this.getLocalUserBenefits(userCardId, benefit.id, currentYear)
        benefit.userBenefits = localUserBenefits
      })

      // 載入自定義福利（開卡禮/續卡禮等）
      const customKey = `local_custom_benefits_${userCardId}`
      const customStored = localStorage.getItem(customKey)
      if (customStored) {
        const customBenefits: UserBenefit[] = JSON.parse(customStored)
        // 將自定義福利轉換為 Benefit 格式並添加到 benefits 列表
        customBenefits.forEach((customBenefit) => {
          const benefit: any = {
            id: customBenefit.benefitId,
            cardId: card.cardId,
            title: customBenefit.customTitle || '',
            titleEn: customBenefit.customTitleEn,
            amount: customBenefit.customAmount || 0,
            currency: customBenefit.customCurrency || '',
            frequency: null,
            description: customBenefit.customDescription,
            userBenefits: [customBenefit],
          }
          benefits.push(benefit)
        })
      }

      return { benefits }
    } catch (error) {
      console.error(`Failed to load benefits for card ${card.cardId}:`, error)
      return { benefits: [] }
    }
  }

  /**
   * 獲取本地存儲的 UserBenefit 數據
   */
  private getLocalUserBenefits(userCardId: number, benefitId: number, year: number): UserBenefit[] {
    const key = `local_user_benefit_${userCardId}_${benefitId}_${year}`
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  }

  /**
   * 儲存 UserBenefit 數據到本地
   */
  private saveLocalUserBenefit(userCardId: number, benefitId: number, year: number, userBenefit: UserBenefit): void {
    const key = `local_user_benefit_${userCardId}_${benefitId}_${year}`
    const existing = this.getLocalUserBenefits(userCardId, benefitId, year)

    // 找到並更新，或添加新的
    const index = existing.findIndex((ub) => ub.cycleNumber === userBenefit.cycleNumber)
    if (index >= 0) {
      existing[index] = userBenefit
    } else {
      existing.push(userBenefit)
    }

    localStorage.setItem(key, JSON.stringify(existing))
  }

  async toggleBenefitComplete(
    benefitId: number,
    isCompleted: boolean,
    year: number,
    userCardId: number,
    notes?: string
  ): Promise<void> {
    // 先檢查是否為自定義福利
    const customKey = `local_custom_benefits_${userCardId}`
    const customStored = localStorage.getItem(customKey)

    if (customStored) {
      const customBenefits: UserBenefit[] = JSON.parse(customStored)
      const customBenefit = customBenefits.find((b) => b.benefitId === benefitId)

      if (customBenefit) {
        // 這是自定義福利，直接更新
        customBenefit.isCompleted = isCompleted
        localStorage.setItem(customKey, JSON.stringify(customBenefits))
        return
      }
    }

    // 標準福利的處理
    const userBenefits = this.getLocalUserBenefits(userCardId, benefitId, year)

    // 找到當前週期的 UserBenefit，或創建新的
    let currentUserBenefit = userBenefits.find((ub) => ub.year === year)

    if (!currentUserBenefit) {
      currentUserBenefit = {
        id: getNextId('user_benefit'),
        benefitId,
        userCardId,
        year,
        cycleNumber: 1,
        periodEnd: null,
        isCompleted,
        usedAmount: 0,
        usages: [],
      }
    } else {
      currentUserBenefit.isCompleted = isCompleted
    }

    this.saveLocalUserBenefit(userCardId, benefitId, year, currentUserBenefit)
  }

  async updateBenefitSettings(
    benefitId: number,
    year: number,
    userCardId: number,
    settings: BenefitSettings
  ): Promise<void> {
    // 先檢查是否為自定義福利
    const customKey = `local_custom_benefits_${userCardId}`
    const customStored = localStorage.getItem(customKey)

    if (customStored) {
      const customBenefits: UserBenefit[] = JSON.parse(customStored)
      const customBenefit = customBenefits.find((b) => b.benefitId === benefitId)

      if (customBenefit) {
        // 這是自定義福利，直接更新
        Object.assign(customBenefit, settings)
        localStorage.setItem(customKey, JSON.stringify(customBenefits))
        return
      }
    }

    // 標準福利的處理
    const userBenefits = this.getLocalUserBenefits(userCardId, benefitId, year)
    let currentUserBenefit = userBenefits.find((ub) => ub.year === year)

    if (!currentUserBenefit) {
      currentUserBenefit = {
        id: getNextId('user_benefit'),
        benefitId,
        userCardId,
        year,
        cycleNumber: 1,
        periodEnd: null,
        isCompleted: false,
        usedAmount: 0,
        ...settings,
      }
    } else {
      Object.assign(currentUserBenefit, settings)
    }

    this.saveLocalUserBenefit(userCardId, benefitId, year, currentUserBenefit)
  }

  async toggleBenefitHidden(benefitId: number, isHidden: boolean, year: number, userCardId: number): Promise<void> {
    // 先檢查是否為自定義福利
    const customKey = `local_custom_benefits_${userCardId}`
    const customStored = localStorage.getItem(customKey)

    if (customStored) {
      const customBenefits: UserBenefit[] = JSON.parse(customStored)
      const customBenefit = customBenefits.find((b) => b.benefitId === benefitId)

      if (customBenefit) {
        // 這是自定義福利，直接更新
        customBenefit.isHidden = isHidden
        localStorage.setItem(customKey, JSON.stringify(customBenefits))
        return
      }
    }

    // 標準福利的處理
    const userBenefits = this.getLocalUserBenefits(userCardId, benefitId, year)
    let currentUserBenefit = userBenefits.find((ub) => ub.year === year)

    if (!currentUserBenefit) {
      currentUserBenefit = {
        id: getNextId('user_benefit'),
        benefitId,
        userCardId,
        year,
        cycleNumber: 1,
        periodEnd: null,
        isCompleted: false,
        isHidden,
        usedAmount: 0,
      }
    } else {
      currentUserBenefit.isHidden = isHidden
    }

    this.saveLocalUserBenefit(userCardId, benefitId, year, currentUserBenefit)
  }

  async createCustomBenefit(data: CustomBenefitInput): Promise<UserBenefit> {
    const customBenefit: UserBenefit = {
      id: getNextId('custom_benefit'),
      benefitId: getNextId('benefit'), // 臨時 ID
      userCardId: data.userCardId,
      year: new Date().getFullYear(),
      cycleNumber: 1,
      periodEnd: data.periodEnd,
      isCompleted: false,
      usedAmount: 0,
      isCustom: true,
      customTitle: data.customTitle,
      customTitleEn: data.customTitleEn,
      customAmount: data.customAmount,
      customCurrency: data.customCurrency,
      customDescription: data.customDescription,
    }

    // 儲存到特殊的 custom benefits key
    const key = `local_custom_benefits_${data.userCardId}`
    const stored = localStorage.getItem(key)
    const customBenefits: UserBenefit[] = stored ? JSON.parse(stored) : []
    customBenefits.push(customBenefit)
    localStorage.setItem(key, JSON.stringify(customBenefits))

    return customBenefit
  }

  async updateCustomBenefit(id: number, data: Partial<CustomBenefitInput>): Promise<void> {
    // 找到包含此自定義福利的卡片
    const cards = this.loadCards()
    for (const card of cards) {
      const key = `local_custom_benefits_${card.id}`
      const stored = localStorage.getItem(key)
      if (!stored) continue

      const customBenefits: UserBenefit[] = JSON.parse(stored)
      const benefit = customBenefits.find((b) => b.id === id)

      if (benefit) {
        Object.assign(benefit, {
          customTitle: data.customTitle,
          customTitleEn: data.customTitleEn,
          customAmount: data.customAmount,
          customCurrency: data.customCurrency,
          customDescription: data.customDescription,
        })
        localStorage.setItem(key, JSON.stringify(customBenefits))
        return
      }
    }

    throw new Error('找不到此自定義福利')
  }

  async deleteCustomBenefit(id: number): Promise<void> {
    const cards = this.loadCards()
    for (const card of cards) {
      const key = `local_custom_benefits_${card.id}`
      const stored = localStorage.getItem(key)
      if (!stored) continue

      const customBenefits: UserBenefit[] = JSON.parse(stored)
      const filtered = customBenefits.filter((b) => b.id !== id)

      if (filtered.length !== customBenefits.length) {
        localStorage.setItem(key, JSON.stringify(filtered))
        return
      }
    }

    throw new Error('找不到此自定義福利')
  }

  // ========== 報銷記錄管理 ==========

  async getBenefitUsages(userBenefitId: number): Promise<{ usages: BenefitUsage[]; usedAmount: number }> {
    const key = `local_usages_${userBenefitId}`
    const stored = localStorage.getItem(key)
    const usages: BenefitUsage[] = stored ? JSON.parse(stored) : []

    // 計算已使用總額
    const usedAmount = usages.reduce((sum, usage) => sum + usage.amount, 0)

    return { usages, usedAmount }
  }

  async getBenefitUsagesByContext(
    benefitId: number,
    year: number,
    userCardId: number
  ): Promise<{ usages: BenefitUsage[]; usedAmount: number }> {
    // 先檢查是否為自定義福利
    const customKey = `local_custom_benefits_${userCardId}`
    const customStored = localStorage.getItem(customKey)

    if (customStored) {
      const customBenefits: UserBenefit[] = JSON.parse(customStored)
      const customBenefit = customBenefits.find((b) => b.benefitId === benefitId)

      if (customBenefit) {
        // 這是自定義福利，使用其 ID 獲取 usages
        return this.getBenefitUsages(customBenefit.id)
      }
    }

    // 標準福利的處理
    const userBenefits = this.getLocalUserBenefits(userCardId, benefitId, year)
    const userBenefit = userBenefits.find((ub) => ub.year === year)

    if (!userBenefit) {
      // 如果沒有 UserBenefit，返回空
      return { usages: [], usedAmount: 0 }
    }

    // 使用 userBenefitId 獲取 usages
    return this.getBenefitUsages(userBenefit.id)
  }

  async addBenefitUsage(
    benefitId: number,
    userCardId: number,
    year: number,
    amount: number,
    usedAt: string,
    note?: string
  ): Promise<{ usages: BenefitUsage[]; usedAmount: number; userBenefit: UserBenefit }> {
    // 先檢查是否為自定義福利
    const customKey = `local_custom_benefits_${userCardId}`
    const customStored = localStorage.getItem(customKey)

    if (customStored) {
      const customBenefits: UserBenefit[] = JSON.parse(customStored)
      const customBenefit = customBenefits.find((b) => b.benefitId === benefitId)

      if (customBenefit) {
        // 這是自定義福利
        const newUsage: BenefitUsage = {
          id: getNextId('usage'),
          userBenefitId: customBenefit.id,
          amount,
          usedAt,
          note: note || null,
        }

        // 儲存到 localStorage
        const usageKey = `local_usages_${customBenefit.id}`
        const usageStored = localStorage.getItem(usageKey)
        const usages: BenefitUsage[] = usageStored ? JSON.parse(usageStored) : []
        usages.push(newUsage)
        localStorage.setItem(usageKey, JSON.stringify(usages))

        // 更新 usedAmount
        const usedAmount = usages.reduce((sum, u) => sum + u.amount, 0)
        customBenefit.usedAmount = usedAmount
        customBenefit.usages = usages
        localStorage.setItem(customKey, JSON.stringify(customBenefits))

        return { usages, usedAmount, userBenefit: customBenefit }
      }
    }

    // 標準福利的處理
    let userBenefits = this.getLocalUserBenefits(userCardId, benefitId, year)
    let userBenefit = userBenefits.find((ub) => ub.year === year)

    if (!userBenefit) {
      userBenefit = {
        id: getNextId('user_benefit'),
        benefitId,
        userCardId,
        year,
        cycleNumber: 1,
        periodEnd: null,
        isCompleted: false,
        usedAmount: 0,
        usages: [],
      }
      userBenefits.push(userBenefit)
      this.saveLocalUserBenefit(userCardId, benefitId, year, userBenefit)
    }

    // 創建新的使用記錄
    const newUsage: BenefitUsage = {
      id: getNextId('usage'),
      userBenefitId: userBenefit.id,
      amount,
      usedAt,
      note: note || null,
    }

    // 儲存到 localStorage
    const key = `local_usages_${userBenefit.id}`
    const stored = localStorage.getItem(key)
    const usages: BenefitUsage[] = stored ? JSON.parse(stored) : []
    usages.push(newUsage)
    localStorage.setItem(key, JSON.stringify(usages))

    // 更新 usedAmount
    const usedAmount = usages.reduce((sum, u) => sum + u.amount, 0)
    userBenefit.usedAmount = usedAmount
    userBenefit.usages = usages
    this.saveLocalUserBenefit(userCardId, benefitId, year, userBenefit)

    return { usages, usedAmount, userBenefit }
  }

  async deleteBenefitUsage(
    usageId: number,
    benefitId: number,
    year: number,
    userCardId: number
  ): Promise<{ usages: BenefitUsage[]; usedAmount: number }> {
    // 先檢查是否為自定義福利
    const customKey = `local_custom_benefits_${userCardId}`
    const customStored = localStorage.getItem(customKey)

    if (customStored) {
      const customBenefits: UserBenefit[] = JSON.parse(customStored)
      const customBenefit = customBenefits.find((b) => b.benefitId === benefitId)

      if (customBenefit) {
        // 這是自定義福利
        const usageKey = `local_usages_${customBenefit.id}`
        const usageStored = localStorage.getItem(usageKey)
        const usages: BenefitUsage[] = usageStored ? JSON.parse(usageStored) : []

        // 過濾掉要刪除的記錄
        const filteredUsages = usages.filter((u) => u.id !== usageId)

        if (filteredUsages.length === usages.length) {
          throw new Error('找不到此使用記錄')
        }

        localStorage.setItem(usageKey, JSON.stringify(filteredUsages))

        // 重新計算總額並更新自定義福利
        const usedAmount = filteredUsages.reduce((sum, u) => sum + u.amount, 0)
        customBenefit.usedAmount = usedAmount
        customBenefit.usages = filteredUsages
        localStorage.setItem(customKey, JSON.stringify(customBenefits))

        return { usages: filteredUsages, usedAmount }
      }
    }

    // 標準福利的處理
    const userBenefits = this.getLocalUserBenefits(userCardId, benefitId, year)
    const userBenefit = userBenefits.find((ub) => ub.year === year)

    if (!userBenefit) {
      throw new Error('找不到對應的福利記錄')
    }

    const key = `local_usages_${userBenefit.id}`
    const stored = localStorage.getItem(key)
    const usages: BenefitUsage[] = stored ? JSON.parse(stored) : []

    // 過濾掉要刪除的記錄
    const filteredUsages = usages.filter((u) => u.id !== usageId)

    if (filteredUsages.length === usages.length) {
      throw new Error('找不到此使用記錄')
    }

    localStorage.setItem(key, JSON.stringify(filteredUsages))

    // 重新計算總額並更新 UserBenefit
    const usedAmount = filteredUsages.reduce((sum, u) => sum + u.amount, 0)
    userBenefit.usedAmount = usedAmount
    userBenefit.usages = filteredUsages
    this.saveLocalUserBenefit(userCardId, benefitId, year, userBenefit)

    return { usages: filteredUsages, usedAmount }
  }

  // ========== 數據清除 ==========

  async clearLocalData(): Promise<void> {
    // 清除所有本地數據
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('local_') || key === STORAGE_KEYS.USER_CARDS)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }
}
