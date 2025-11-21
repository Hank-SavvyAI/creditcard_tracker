/**
 * CloudApiProvider
 *
 * 使用後端 API 的 Provider 實作
 * 適用於已登入用戶，所有數據存儲在雲端
 * 這個類別包裝了現有的 api.ts，讓它符合 DataProvider 介面
 */

import { api } from '../api'
import {
  DataProvider,
  UserCard,
  Benefit,
  UserBenefit,
  BenefitUsage,
  CustomBenefitInput,
  CardSettings,
  BenefitSettings,
  SyncResult,
} from './interface'

export class CloudApiProvider implements DataProvider {
  readonly providerType = 'cloud' as const

  // ========== 卡片管理 ==========

  async getMyCards(): Promise<UserCard[]> {
    return api.getMyCards()
  }

  async addCard(cardId: number, nickname?: string, benefitStartDates?: Record<number, string>): Promise<UserCard> {
    const result = await api.addCard(cardId, nickname, benefitStartDates)
    return result as UserCard
  }

  async removeCard(userCardId: number): Promise<void> {
    await api.removeCard(userCardId)
  }

  async updateCardSettings(userCardId: number, settings: CardSettings): Promise<void> {
    await api.updateCardSettings(userCardId, settings)
  }

  async updateCardsOrder(updates: { id: number; displayOrder: number }[]): Promise<void> {
    await api.updateUserCardsOrder(updates)
  }

  // ========== 福利管理 ==========

  async getMyBenefits(year?: number): Promise<UserCard[]> {
    const result = await api.getMyBenefits(year)
    return result as UserCard[]
  }

  async getCardBenefits(userCardId: number, year?: number): Promise<{ benefits: Benefit[] }> {
    return api.getCardBenefits(userCardId, year)
  }

  async toggleBenefitComplete(
    benefitId: number,
    isCompleted: boolean,
    year: number,
    userCardId: number,
    notes?: string
  ): Promise<void> {
    if (isCompleted) {
      await api.completeBenefit(benefitId, year, notes, userCardId)
    } else {
      await api.uncompleteBenefit(benefitId, year, userCardId)
    }
  }

  async updateBenefitSettings(
    benefitId: number,
    year: number,
    userCardId: number,
    settings: BenefitSettings
  ): Promise<void> {
    await api.updateBenefitSettings(benefitId, year, settings, userCardId)
  }

  async toggleBenefitHidden(benefitId: number, isHidden: boolean, year: number, userCardId: number): Promise<void> {
    if (isHidden) {
      await api.hideBenefit(benefitId, year, userCardId)
    } else {
      await api.unhideBenefit(benefitId, year, userCardId)
    }
  }

  async createCustomBenefit(data: CustomBenefitInput): Promise<UserBenefit> {
    const result = await api.createCustomBenefit(data)
    return result as UserBenefit
  }

  async updateCustomBenefit(id: number, data: Partial<CustomBenefitInput>): Promise<void> {
    await api.updateCustomBenefit(id, data)
  }

  async deleteCustomBenefit(id: number): Promise<void> {
    await api.deleteCustomBenefit(id)
  }

  // ========== 報銷記錄管理 ==========

  async getBenefitUsages(userBenefitId: number): Promise<{ usages: BenefitUsage[]; usedAmount: number }> {
    // Note: 這個方法在 CloudProvider 中可能不會直接使用
    // 因為前端通常是通過 benefitId + year + userCardId 來獲取
    // 但為了介面一致性，我們保留這個方法
    throw new Error('getBenefitUsages by userBenefitId is not supported in CloudProvider. Use getBenefitUsagesByContext instead.')
  }

  async getBenefitUsagesByContext(
    benefitId: number,
    year: number,
    userCardId: number
  ): Promise<{ usages: BenefitUsage[]; usedAmount: number }> {
    const token = localStorage.getItem('token')
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/benefits/${benefitId}/usage?year=${year}&userCardId=${userCardId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!response.ok) {
      throw new Error('獲取報銷記錄失敗')
    }

    return response.json()
  }

  async addBenefitUsage(
    benefitId: number,
    userCardId: number,
    year: number,
    amount: number,
    usedAt: string,
    note?: string
  ): Promise<{ usages: BenefitUsage[]; usedAmount: number; userBenefit: UserBenefit }> {
    const token = localStorage.getItem('token')
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/benefits/${benefitId}/usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount,
        usedAt,
        note: note || '',
        year,
        userCardId,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || '新增報銷記錄失敗')
    }

    return response.json()
  }

  async deleteBenefitUsage(
    usageId: number,
    benefitId: number,
    year: number,
    userCardId: number
  ): Promise<{ usages: BenefitUsage[]; usedAmount: number }> {
    const token = localStorage.getItem('token')
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/benefits/${benefitId}/usage/${usageId}?year=${year}&userCardId=${userCardId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!response.ok) {
      throw new Error('刪除報銷記錄失敗')
    }

    return response.json()
  }

  // ========== 數據同步 ==========

  /**
   * 將本地數據同步到雲端
   * 這個方法會在用戶登入後被調用，用來上傳本地數據
   */
  async syncFromLocal(localData: UserCard[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      localCardsCount: localData.length,
      cloudCardsCount: 0,
      mergedCardsCount: 0,
      errors: [],
    }

    try {
      // 獲取雲端現有的卡片
      const cloudCards = await this.getMyCards()
      result.cloudCardsCount = cloudCards.length

      // 對於每張本地卡片
      for (const localCard of localData) {
        try {
          // 檢查雲端是否已有相同的卡片
          const existingCard = cloudCards.find((c) => c.cardId === localCard.cardId)

          if (existingCard) {
            // 已存在：更新設定（如果本地有設定的話）
            if (localCard.nickname || localCard.afChargeMonth || localCard.afChargeDay) {
              await this.updateCardSettings(existingCard.id, {
                nickname: localCard.nickname,
                afChargeMonth: localCard.afChargeMonth,
                afChargeDay: localCard.afChargeDay,
                openedAt: localCard.openedAt,
              })
            }
          } else {
            // 不存在：新增到雲端
            await this.addCard(localCard.cardId, localCard.nickname)
            result.mergedCardsCount++
          }

          // TODO: 同步福利使用記錄
          // 這部分需要更複雜的邏輯來處理本地的福利使用記錄
        } catch (error) {
          console.error(`Failed to sync card ${localCard.cardId}:`, error)
          result.errors?.push(`卡片 ${localCard.card.name} 同步失敗`)
        }
      }
    } catch (error) {
      console.error('Failed to sync from local:', error)
      result.success = false
      result.errors?.push('同步過程發生錯誤')
    }

    return result
  }

  /**
   * 清除本地數據
   * 這個方法由 CloudProvider 調用，確保切換到雲端模式時清除本地快取
   */
  async clearLocalData(): Promise<void> {
    // CloudProvider 不需要清除本地數據
    // 這個方法由 LocalProvider 實作
    // 但為了介面一致性，我們保留這個方法
  }
}
