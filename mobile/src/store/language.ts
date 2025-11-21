import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Language = 'zh-TW' | 'en'

interface LanguageState {
  language: Language
  setLanguage: (lang: Language) => void
}

// 智能判斷預設語言
const getDefaultLanguage = (): Language => {
  // 方法1: 檢查 localStorage 是否已有用戶設定（persist 會自動處理）
  // 方法2: 使用瀏覽器語言設定
  if (typeof window !== 'undefined' && navigator.language) {
    const browserLang = navigator.language.toLowerCase()

    // 檢查是否為繁體中文相關語言
    // zh-TW, zh-HK, zh-MO (台灣、香港、澳門)
    if (browserLang.startsWith('zh-tw') ||
        browserLang.startsWith('zh-hk') ||
        browserLang.startsWith('zh-mo') ||
        browserLang === 'zh-hant') {
      return 'zh-TW'
    }

    // 其他中文（簡體）暫時也用繁體
    if (browserLang.startsWith('zh')) {
      return 'zh-TW'
    }
  }

  // 預設為繁體中文
  return 'zh-TW'
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: getDefaultLanguage(), // 使用智能判斷
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'language-storage',
    }
  )
)

// 翻譯文字的輔助函數
export const translations = {
  'zh-TW': {
    // 首頁
    'home.title': '信用卡福利追蹤系統',
    'home.title.en': 'Credit Card Benefits Tracker',
    'home.features': '主要功能',
    'home.feature.manage': '管理您的信用卡',
    'home.feature.track': '追蹤各種信用卡福利',
    'home.feature.reminder': '自動提醒到期日',
    'home.feature.checkbox': '勾選已使用的福利',
    'home.feature.multilang': '多語言支援（中文/英文）',
    'home.feature.telegram': 'Telegram Bot 整合',
    'home.howto': '如何開始使用？',
    'home.step1': '使用 Telegram/Gmail/Line 帳號登入',
    'home.step2': '新增您擁有的信用卡',
    'home.step3': '查看每張卡的福利項目',
    'home.step4': '使用福利後勾選完成，系統不再提醒',
    'home.btn.dashboard': '進入我的儀表板',
    'home.btn.browse': '瀏覽信用卡列表',
    'home.btn.login': '使用 Telegram 登入',

    // 通用
    'common.loading': '載入中...',
    'common.logout': '登出',
    'common.back': '返回',
    'common.cancel': '取消',
    'common.save': '儲存',
    'common.edit': '編輯',
    'common.delete': '刪除',
    'common.add': '新增',
    'common.confirm': '確認',
    'common.complete': '完成',
    'common.uncomplete': '取消',

    // 管理員
    'admin.title': '管理員後台',
    'admin.cards': '信用卡列表',
    'admin.addCard': '新增信用卡',
    'admin.editCard': '編輯信用卡',
    'admin.newCard': '新增信用卡',
    'admin.benefits': '福利項目',
    'admin.addBenefit': '新增福利',
    'admin.table.id': 'ID',
    'admin.table.name': '卡片名稱',
    'admin.table.bank': '銀行',
    'admin.table.benefits': '福利數量',
    'admin.table.status': '狀態',
    'admin.table.actions': '操作',
    'admin.status.active': '啟用',
    'admin.status.inactive': '停用',
    'admin.form.name': '卡片名稱',
    'admin.form.nameEn': '卡片名稱 (英文)',
    'admin.form.bank': '銀行名稱',
    'admin.form.bankEn': '銀行名稱 (英文)',
    'admin.form.issuer': '發卡機構',
    'admin.form.description': '卡片描述',
    'admin.form.descriptionEn': '卡片描述 (英文)',
    'admin.form.imageUrl': '卡片圖片 URL',
    'admin.form.active': '啟用此卡片',

    // Dashboard
    'dashboard.title': '我的信用卡福利',
    'dashboard.empty': '您還沒有新增任何信用卡，請先瀏覽並新增信用卡',
    'dashboard.admin': '管理員後台',

    // Cards
    'cards.title': '信用卡列表',
    'cards.empty': '目前尚無信用卡資料，請聯繫管理員新增',
    'cards.loginPrompt': '登入以追蹤此卡',
    'cards.benefits': '福利項目',
    'cards.frequency': '頻率',

    // Auth / Login
    'auth.telegram.title': '使用 Telegram 登入',
    'auth.telegram.description': '點擊下方按鈕，使用你的 Telegram 帳號快速登入',
    'auth.telegram.why': '為什麼使用 Telegram 登入？',
    'auth.telegram.benefit1': '安全快速，無需記憶密碼',
    'auth.telegram.benefit2': '直接在 Telegram 收到提醒通知',
    'auth.telegram.benefit3': '一鍵登入，省時方便',
    'auth.telegram.benefit4': '全球通用，支援多語言',
    'auth.telegram.backHome': '返回首頁',
    'auth.telegram.troubleshoot': '看不到登入按鈕？',
    'auth.telegram.troubleshoot1': '確認你的瀏覽器允許顯示第三方內容',
    'auth.telegram.troubleshoot2': '檢查是否有廣告阻擋插件',
    'auth.telegram.troubleshoot3': '嘗試重新整理頁面',
    'auth.telegram.troubleshoot4': '確認網站管理員已正確設定 Bot',
    'auth.error.failed': '登入失敗，請稍後再試',
  },
  'en': {
    // Home
    'home.title': 'Credit Card Benefits Tracker',
    'home.title.en': 'Credit Card Benefits Tracker',
    'home.features': 'Key Features',
    'home.feature.manage': 'Manage your credit cards',
    'home.feature.track': 'Track various credit card benefits',
    'home.feature.reminder': 'Automatic reminders for deadlines',
    'home.feature.checkbox': 'Check off used benefits',
    'home.feature.multilang': 'Multi-language support (TC/EN)',
    'home.feature.telegram': 'Telegram Bot integration',
    'home.howto': 'How to get started?',
    'home.step1': 'Login with your Telegram/Gmail/Line account',
    'home.step2': 'Add your credit cards',
    'home.step3': 'View benefits for each card',
    'home.step4': 'Mark as complete, no more reminders',
    'home.btn.dashboard': 'Go to Dashboard',
    'home.btn.browse': 'Browse Cards',
    'home.btn.login': 'Login with Telegram',

    // Common
    'common.loading': 'Loading...',
    'common.logout': 'Logout',
    'common.back': 'Back',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.add': 'Add',
    'common.confirm': 'Confirm',
    'common.complete': 'Complete',
    'common.uncomplete': 'Undo',

    // Admin
    'admin.title': 'Admin Panel',
    'admin.cards': 'Credit Cards',
    'admin.addCard': 'Add Card',
    'admin.editCard': 'Edit Card',
    'admin.newCard': 'New Card',
    'admin.benefits': 'Benefits',
    'admin.addBenefit': 'Add Benefit',
    'admin.table.id': 'ID',
    'admin.table.name': 'Card Name',
    'admin.table.bank': 'Bank',
    'admin.table.benefits': 'Benefits',
    'admin.table.status': 'Status',
    'admin.table.actions': 'Actions',
    'admin.status.active': 'Active',
    'admin.status.inactive': 'Inactive',
    'admin.form.name': 'Card Name (TC)',
    'admin.form.nameEn': 'Card Name (EN)',
    'admin.form.bank': 'Bank Name (TC)',
    'admin.form.bankEn': 'Bank Name (EN)',
    'admin.form.issuer': 'Card Issuer',
    'admin.form.description': 'Description (TC)',
    'admin.form.descriptionEn': 'Description (EN)',
    'admin.form.imageUrl': 'Image URL',
    'admin.form.active': 'Activate this card',

    // Dashboard
    'dashboard.title': 'My Card Benefits',
    'dashboard.empty': 'No cards yet. Please add cards via Add Card button above',
    'dashboard.admin': 'Admin Panel',

    // Cards
    'cards.title': 'Credit Cards',
    'cards.empty': 'No cards available. Please contact admin.',
    'cards.loginPrompt': 'Login to track this card',
    'cards.benefits': 'Benefits',
    'cards.frequency': 'Frequency',

    // Auth / Login
    'auth.telegram.title': 'Login with Telegram',
    'auth.telegram.description': 'Click the button below to quickly login with your Telegram account',
    'auth.telegram.why': 'Why use Telegram Login?',
    'auth.telegram.benefit1': 'Secure and fast, no password needed',
    'auth.telegram.benefit2': 'Receive notifications directly in Telegram',
    'auth.telegram.benefit3': 'One-click login, saves time',
    'auth.telegram.benefit4': 'Globally available, multi-language support',
    'auth.telegram.backHome': 'Back to Home',
    'auth.telegram.troubleshoot': 'Can\'t see the login button?',
    'auth.telegram.troubleshoot1': 'Make sure your browser allows third-party content',
    'auth.telegram.troubleshoot2': 'Check if ad-blocker is enabled',
    'auth.telegram.troubleshoot3': 'Try refreshing the page',
    'auth.telegram.troubleshoot4': 'Verify the Bot is properly configured',
    'auth.error.failed': 'Login failed, please try again later',
  },
}

// 翻譯函數
export const t = (key: string, lang: Language = 'zh-TW'): string => {
  return translations[lang][key as keyof typeof translations['zh-TW']] || key
}
