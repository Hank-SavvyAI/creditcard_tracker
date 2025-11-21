/**
 * DataProvider Interface
 *
 * 統一的數據訪問介面，支援本地存儲和雲端 API 兩種實作
 * 讓應用可以在未登入（本地模式）和已登入（雲端模式）之間無縫切換
 */

// ========== 類型定義 ==========

export interface UserCard {
  id: number
  cardId: number
  userId?: number
  nickname?: string
  displayOrder?: number
  afChargeMonth?: number | null
  afChargeDay?: number | null
  openedAt?: string | null
  cardInstance?: number
  createdAt?: string
  updatedAt?: string
  card: Card
  benefits?: Benefit[]
}

export interface Card {
  id: number
  name: string
  nameEn?: string
  bank: string
  bankEn?: string
  issuer?: string
  region?: string
  type?: string
  description?: string
  descriptionEn?: string
  photo?: string
  fee?: string
  isActive?: boolean
  currency?: string
}

export interface Benefit {
  id: number
  cardId: number
  title: string
  titleEn?: string
  amount: number
  currency: string
  frequency: string | null
  description?: string
  descriptionEn?: string
  endMonth?: number | null
  endDay?: number | null
  userBenefits?: UserBenefit[]
}

export interface UserBenefit {
  id: number
  benefitId: number
  userId?: number
  userCardId: number
  year: number
  cycleNumber: number | null
  periodEnd: string | null
  isCompleted: boolean
  isHidden?: boolean
  usedAmount: number
  reminderDays?: number
  notificationEnabled?: boolean
  isCustom?: boolean
  customTitle?: string
  customTitleEn?: string
  customAmount?: number
  customCurrency?: string
  customDescription?: string
  usages?: BenefitUsage[]
  benefitStartDate?: string | null
}

export interface BenefitUsage {
  id: number
  userBenefitId: number
  amount: number
  usedAt: string
  note?: string | null
}

export interface CustomBenefitInput {
  userCardId: number
  customTitle: string
  customTitleEn?: string
  customAmount: number
  customCurrency: string
  periodEnd: string
  customDescription?: string
}

export interface CardSettings {
  nickname?: string
  afChargeMonth?: number | null
  afChargeDay?: number | null
  openedAt?: string | null
}

export interface BenefitSettings {
  reminderDays?: number
  notificationEnabled?: boolean
}

export interface SyncResult {
  success: boolean
  localCardsCount: number
  cloudCardsCount: number
  mergedCardsCount: number
  errors?: string[]
}

// ========== DataProvider 介面 ==========

/**
 * DataProvider 介面
 *
 * 定義所有數據操作的標準方法
 * 本地和雲端 provider 都必須實作這個介面
 */
export interface DataProvider {
  // ========== 識別 ==========
  readonly providerType: 'local' | 'cloud'

  // ========== 卡片管理 ==========

  /**
   * 獲取用戶的所有卡片（不含福利詳情）
   */
  getMyCards(): Promise<UserCard[]>

  /**
   * 添加卡片到用戶的追蹤列表
   */
  addCard(cardId: number, nickname?: string, benefitStartDates?: Record<number, string>): Promise<UserCard>

  /**
   * 移除卡片
   */
  removeCard(userCardId: number): Promise<void>

  /**
   * 更新卡片設定（暱稱、年費日期等）
   */
  updateCardSettings(userCardId: number, settings: CardSettings): Promise<void>

  /**
   * 更新卡片順序
   */
  updateCardsOrder(updates: { id: number; displayOrder: number }[]): Promise<void>

  // ========== 福利管理 ==========

  /**
   * 獲取用戶的所有福利（含使用記錄）
   */
  getMyBenefits(year?: number): Promise<UserCard[]>

  /**
   * 獲取單張卡片的福利
   */
  getCardBenefits(userCardId: number, year?: number): Promise<{ benefits: Benefit[] }>

  /**
   * 標記福利為已完成/未完成
   */
  toggleBenefitComplete(benefitId: number, isCompleted: boolean, year: number, userCardId: number, notes?: string): Promise<void>

  /**
   * 更新福利設定（提醒天數、通知開關等）
   */
  updateBenefitSettings(benefitId: number, year: number, userCardId: number, settings: BenefitSettings): Promise<void>

  /**
   * 隱藏/顯示福利
   */
  toggleBenefitHidden(benefitId: number, isHidden: boolean, year: number, userCardId: number): Promise<void>

  /**
   * 創建自定義福利
   */
  createCustomBenefit(data: CustomBenefitInput): Promise<UserBenefit>

  /**
   * 更新自定義福利
   */
  updateCustomBenefit(id: number, data: Partial<CustomBenefitInput>): Promise<void>

  /**
   * 刪除自定義福利
   */
  deleteCustomBenefit(id: number): Promise<void>

  // ========== 報銷記錄管理 ==========

  /**
   * 獲取福利的使用記錄（通過 userBenefitId）
   */
  getBenefitUsages(userBenefitId: number): Promise<{ usages: BenefitUsage[]; usedAmount: number }>

  /**
   * 獲取福利的使用記錄（通過 benefitId + year + userCardId）
   */
  getBenefitUsagesByContext(
    benefitId: number,
    year: number,
    userCardId: number
  ): Promise<{ usages: BenefitUsage[]; usedAmount: number }>

  /**
   * 新增報銷記錄
   */
  addBenefitUsage(
    benefitId: number,
    userCardId: number,
    year: number,
    amount: number,
    usedAt: string,
    note?: string
  ): Promise<{ usages: BenefitUsage[]; usedAmount: number; userBenefit: UserBenefit }>

  /**
   * 刪除報銷記錄
   */
  deleteBenefitUsage(
    usageId: number,
    benefitId: number,
    year: number,
    userCardId: number
  ): Promise<{ usages: BenefitUsage[]; usedAmount: number }>

  // ========== 數據同步（僅 CloudProvider 需要實作）==========

  /**
   * 從本地同步數據到雲端
   * @param localData 本地數據
   * @returns 同步結果
   */
  syncFromLocal?(localData: UserCard[]): Promise<SyncResult>

  /**
   * 清除所有本地數據（登出時使用）
   */
  clearLocalData?(): Promise<void>
}

// ========== 工廠函數類型 ==========

export type DataProviderFactory = (isLoggedIn: boolean, token?: string) => DataProvider
