/**
 * DataManager
 *
 * 統一的數據管理器，根據登入狀態自動選擇使用本地或雲端 Provider
 * 提供簡單的 API 給 React 組件使用
 */

import { DataProvider } from './interface'
import { LocalStorageProvider } from './localProvider'
import { CloudApiProvider } from './cloudProvider'

export class DataManager {
  private provider: DataProvider

  constructor(isLoggedIn: boolean) {
    this.provider = isLoggedIn ? new CloudApiProvider() : new LocalStorageProvider()
  }

  /**
   * 獲取當前使用的 provider 類型
   */
  get providerType(): 'local' | 'cloud' {
    return this.provider.providerType
  }

  /**
   * 檢查是否為本地模式
   */
  get isLocalMode(): boolean {
    return this.provider.providerType === 'local'
  }

  /**
   * 獲取當前的 provider（供進階使用）
   */
  getProvider(): DataProvider {
    return this.provider
  }

  /**
   * 切換到雲端模式並同步本地數據
   * 在用戶登入後調用
   */
  async switchToCloudMode(syncLocalData: boolean = true) {
    if (this.provider.providerType === 'cloud') {
      console.warn('Already in cloud mode')
      return { success: true, message: '已經在雲端模式' }
    }

    try {
      // 保存本地數據的引用
      const localProvider = this.provider as LocalStorageProvider
      const localCards = syncLocalData ? await localProvider.getMyCards() : []

      // 切換到雲端 provider
      this.provider = new CloudApiProvider()

      // 如果有本地數據且用戶選擇同步
      if (syncLocalData && localCards.length > 0) {
        const syncResult = await this.provider.syncFromLocal?.(localCards)

        // 清除本地數據
        await localProvider.clearLocalData()

        return {
          success: true,
          message: `成功同步 ${syncResult?.mergedCardsCount || 0} 張卡片到雲端`,
          syncResult,
        }
      }

      // 清除本地數據
      await localProvider.clearLocalData()

      return { success: true, message: '已切換到雲端模式' }
    } catch (error) {
      console.error('Failed to switch to cloud mode:', error)
      return { success: false, message: '切換失敗', error }
    }
  }

  /**
   * 切換到本地模式
   * 在用戶登出後調用
   */
  switchToLocalMode() {
    this.provider = new LocalStorageProvider()
  }

  // ========== 委託所有 DataProvider 方法 ==========
  // 這些方法直接委託給當前的 provider

  getMyCards() {
    return this.provider.getMyCards()
  }

  addCard(cardId: number, nickname?: string, benefitStartDates?: Record<number, string>) {
    return this.provider.addCard(cardId, nickname, benefitStartDates)
  }

  removeCard(userCardId: number) {
    return this.provider.removeCard(userCardId)
  }

  updateCardSettings(userCardId: number, settings: any) {
    return this.provider.updateCardSettings(userCardId, settings)
  }

  updateCardsOrder(updates: { id: number; displayOrder: number }[]) {
    return this.provider.updateCardsOrder(updates)
  }

  getMyBenefits(year?: number) {
    return this.provider.getMyBenefits(year)
  }

  getCardBenefits(userCardId: number, year?: number) {
    return this.provider.getCardBenefits(userCardId, year)
  }

  toggleBenefitComplete(benefitId: number, isCompleted: boolean, year: number, userCardId: number, notes?: string) {
    return this.provider.toggleBenefitComplete(benefitId, isCompleted, year, userCardId, notes)
  }

  updateBenefitSettings(benefitId: number, year: number, userCardId: number, settings: any) {
    return this.provider.updateBenefitSettings(benefitId, year, userCardId, settings)
  }

  toggleBenefitHidden(benefitId: number, isHidden: boolean, year: number, userCardId: number) {
    return this.provider.toggleBenefitHidden(benefitId, isHidden, year, userCardId)
  }

  createCustomBenefit(data: any) {
    return this.provider.createCustomBenefit(data)
  }

  updateCustomBenefit(id: number, data: any) {
    return this.provider.updateCustomBenefit(id, data)
  }

  deleteCustomBenefit(id: number) {
    return this.provider.deleteCustomBenefit(id)
  }

  // ========== 報銷記錄管理 ==========

  getBenefitUsages(userBenefitId: number) {
    return this.provider.getBenefitUsages(userBenefitId)
  }

  getBenefitUsagesByContext(benefitId: number, year: number, userCardId: number) {
    return this.provider.getBenefitUsagesByContext(benefitId, year, userCardId)
  }

  addBenefitUsage(benefitId: number, userCardId: number, year: number, amount: number, usedAt: string, note?: string) {
    return this.provider.addBenefitUsage(benefitId, userCardId, year, amount, usedAt, note)
  }

  deleteBenefitUsage(usageId: number, benefitId: number, year: number, userCardId: number) {
    return this.provider.deleteBenefitUsage(usageId, benefitId, year, userCardId)
  }
}
