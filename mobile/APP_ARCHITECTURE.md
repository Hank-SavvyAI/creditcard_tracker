# Credit Card Tracker Mobile App - 架構文檔

## 📱 專案概述

這是一個使用 **Next.js + Capacitor** 構建的信用卡福利追蹤 iOS App。

- **技術棧**: Next.js 14, TypeScript, Capacitor 5, React 18
- **部署方式**: 靜態導出 (Static Export) + iOS Native Wrapper
- **開發模式**: 支援 Skip Auth 快速預覽 UI

---

## 🏗️ 專案結構

```
mobile/
├── ios/                      # Capacitor iOS 原生專案
│   └── App/
│       ├── App.xcworkspace   # Xcode 工作區 (使用這個開啟)
│       └── Podfile           # CocoaPods 依賴
├── src/
│   ├── app/                  # Next.js App Router 頁面
│   │   ├── layout.tsx        # Root Layout
│   │   ├── page.tsx          # 登入頁 (/)
│   │   ├── dashboard/        # 我的卡片頁
│   │   ├── cards/            # 探索頁
│   │   └── profile/          # 個人設定頁
│   ├── components/
│   │   └── MobileLayout.tsx  # 底部 Tab Bar 導航
│   ├── lib/
│   │   └── api.ts            # API 客戶端
│   └── store/
│       └── userStore.ts      # 用戶狀態管理
├── out/                      # Next.js 構建輸出 (給 Capacitor 使用)
├── capacitor.config.ts       # Capacitor 配置
├── next.config.js            # Next.js 配置
├── .env.local                # 環境變數
└── package.json
```

---

## 🔄 應用流程圖

### 1. 啟動流程

```
使用者開啟 App
    ↓
src/app/page.tsx (Root)
    ↓
檢查 NEXT_PUBLIC_SKIP_AUTH
    ↓
┌─────────────────┴─────────────────┐
│                                   │
開發模式                          正式模式
(SKIP_AUTH=true)                (SKIP_AUTH=false)
    ↓                                ↓
自動登入                          顯示登入畫面
setIsLoggedIn(true)              (LINE 登入或其他)
    ↓                                ↓
    └────────────┬─────────────────┘
                 ↓
         router.push('/dashboard')
```

### 2. 主要導航結構

```
┌─────────────────────────────────────────────────┐
│              MobileLayout                       │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │         頁面內容 {children}               │  │
│  │                                           │  │
│  │  • /dashboard  - 我的卡片 (已追蹤)        │  │
│  │  • /cards      - 探索 (所有卡片)          │  │
│  │  • /profile    - 個人設定                 │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │     Bottom Tab Bar (固定底部)            │  │
│  │  💳 我的卡片  |  🔍 探索  |  👤 我的     │  │
│  │  /dashboard   |  /cards  |  /profile     │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 3. 資料流程

#### 開發模式 (當前)

```
頁面載入
    ↓
檢查 process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
    ↓
使用 Mock Data
    ├── dashboard/page.tsx → mockCards (3 張卡片)
    ├── cards/page.tsx → mockAllCards (5 張卡片)
    └── profile/page.tsx → mockUser
    ↓
直接渲染 UI (無 API 請求)
```

#### 正式模式 (整合後端後)

```
用戶登入
    ↓
localStorage.setItem('token', jwt)
    ↓
頁面載入
    ↓
api.getMyBenefits()
    ├── URL: http://YOUR_IP:3000/api/user/benefits
    ├── Headers: { Authorization: 'Bearer ' + token }
    └── Response: [{ id, card, benefits }]
    ↓
setUserCards(data)
    ↓
渲染 UI
```

---

## 📄 核心頁面說明

### 1. `/` - 登入頁 (src/app/page.tsx)

**功能**:
- 檢查 `NEXT_PUBLIC_SKIP_AUTH` 環境變數
- 開發模式: 自動進入 Dashboard
- 正式模式: 顯示 LINE 登入或其他認證方式

**關鍵程式碼**:
```typescript
useEffect(() => {
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'

  if (skipAuth) {
    setIsLoggedIn(true)
    setLoading(false)
    return
  }

  const token = localStorage.getItem('token')
  if (token) {
    setIsLoggedIn(true)
  }
  setLoading(false)
}, [])

if (isLoggedIn) {
  router.push('/dashboard')
}
```

---

### 2. `/dashboard` - 我的卡片 (src/app/dashboard/page.tsx)

**功能**:
- 顯示使用者已追蹤的信用卡
- 每張卡片顯示:
  - 卡片圖片 (300x190 比例)
  - 卡片名稱 + 銀行
  - 福利列表 (類別 + 標題 + 金額)
  - 查看詳情按鈕

**資料來源**:
- 開發模式: `mockCards` (3 張卡片)
- 正式模式: `api.getMyBenefits()`

**Mock 資料結構**:
```typescript
const mockCards = [
  {
    id: 1,
    card: {
      name: 'Chase Sapphire Preferred',
      nameEn: 'Chase Sapphire Preferred',
      bank: 'Chase',
      photo: 'https://...',
      benefits: [
        { id: 1, category: '現金回饋', title: '餐廳 3% 回饋', amount: 300 },
        { id: 2, category: '旅遊', title: '機票 2% 回饋', amount: 500 },
      ]
    }
  }
]
```

---

### 3. `/cards` - 探索頁 (src/app/cards/page.tsx)

**功能**:
- 瀏覽所有可用的信用卡
- 篩選功能:
  - **地區**: 全部 / 台灣 🇹🇼 / 美國 🇺🇸
  - **類型**: 全部 / 個人卡 👤 / 商業卡 🏢
- 顯示篩選結果數量
- 清除篩選按鈕
- 每張卡片:
  - 卡片圖片
  - 名稱 + 銀行
  - 福利標籤 (最多顯示 3 個)
  - **➕ 開始追蹤** 按鈕

**資料來源**:
- 開發模式: `mockAllCards` (5 張卡片)
- 正式模式: `api.getCards()`

**篩選邏輯**:
```typescript
const filteredCards = cards.filter(card => {
  if (selectedRegion && card.region !== selectedRegion) return false
  if (selectedType && card.type !== selectedType) return false
  return true
})
```

**Mock 資料**:
- Chase Sapphire Preferred (美國, 個人)
- American Express Platinum (美國, 個人)
- 台新@GoGo卡 (台灣, 個人)
- 國泰世華 CUBE卡 (台灣, 個人)
- Chase Ink Business Preferred (美國, 商業)

---

### 4. `/profile` - 個人設定 (src/app/profile/page.tsx)

**功能**:

#### 4.1 使用者資訊卡
- 頭像 (漸層圓形)
- 名稱 + Email/LINE ID
- 開發模式提示 (黃色橫幅)

#### 4.2 語言設定 🌐
- 繁體中文 / English 切換按鈕
- 儲存到 `localStorage.setItem('language', lang)`

#### 4.3 通知設定 🔔
- **福利到期提醒**: 當福利即將到期時通知
- **新卡片通知**: 有新的信用卡資訊時通知
- **個人化推薦**: 根據使用習慣推薦卡片
- iOS 風格的 Toggle Switch

#### 4.4 關於 📱
- 版本: 1.0.0
- 建置版本: 2024.01

#### 4.5 登出按鈕 🚪
- 紅色邊框按鈕
- 開發模式: 顯示提示
- 正式模式: 清除 token + 導向登入頁

**Toggle Switch 實作**:
```typescript
<button
  onClick={() => handleNotificationToggle('benefitExpiry')}
  style={{
    width: '48px',
    height: '28px',
    borderRadius: '14px',
    background: notifications.benefitExpiry ? '#667eea' : '#d1d5db',
    position: 'relative',
  }}
>
  <div style={{
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'white',
    position: 'absolute',
    left: notifications.benefitExpiry ? '23px' : '3px',
    transition: 'left 0.2s',
  }} />
</button>
```

---

## 🧩 核心組件

### MobileLayout (src/components/MobileLayout.tsx)

這是一個包裝組件，為所有主要頁面提供:
- 底部 Tab Bar 導航
- iOS Safe Area 支援

**Tab 定義**:
```typescript
const tabs = [
  { id: 'dashboard', label: '我的卡片', icon: '💳', path: '/dashboard' },
  { id: 'cards', label: '探索', icon: '🔍', path: '/cards' },
  { id: 'profile', label: '我的', icon: '👤', path: '/profile' },
]
```

**使用方式**:
```typescript
export default function SomePage() {
  return (
    <MobileLayout>
      {/* 你的頁面內容 */}
    </MobileLayout>
  )
}
```

**底部 Tab Bar 樣式**:
- 固定在螢幕底部 (`position: fixed`)
- 高度: `60px + env(safe-area-inset-bottom)` (支援 iPhone 瀏海/Home Indicator)
- 白色背景 + 上邊框
- 當前 Tab 顯示藍色 (#667eea)

---

## 🔌 API 客戶端 (src/lib/api.ts)

### 配置

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
```

**重要**:
- 開發時需使用電腦 IP (例如: `http://192.168.1.100:3000`)
- iOS 模擬器無法使用 `localhost` 連接到本機後端

### 可用方法

| 方法 | 端點 | 說明 |
|------|------|------|
| `getMyBenefits()` | `GET /api/user/benefits` | 取得使用者已追蹤的卡片 |
| `getCards()` | `GET /api/cards` | 取得所有可用卡片 |
| `addUserCard(cardId)` | `POST /api/user/cards` | 新增卡片到追蹤清單 |
| `removeUserCard(userCardId)` | `DELETE /api/user/cards/:id` | 移除已追蹤的卡片 |

### 認證方式

```typescript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
}
```

---

## ⚙️ 環境配置

### `.env.local`

```bash
# Backend API URL
# 開發時使用電腦 IP (iOS 模擬器需要)
NEXT_PUBLIC_API_URL=http://192.168.1.100:3000

# 開發模式 - 跳過登入驗證
NEXT_PUBLIC_SKIP_AUTH=true
```

### `capacitor.config.ts`

```typescript
const config: CapacitorConfig = {
  appId: 'com.creditcard.tracker',
  appName: 'Credit Card Tracker',
  webDir: 'out',  // Next.js 靜態導出目錄
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#667eea',
      showSpinner: false,
    },
  },
}
```

### `next.config.js`

```javascript
const nextConfig = {
  output: 'export',        // 靜態導出模式
  images: {
    unoptimized: true      // Capacitor 需要
  },
  trailingSlash: true      // iOS 路由相容性
}
```

---

## 🚀 開發流程

### 1. 安裝依賴

```bash
cd mobile
npm install
```

### 2. 開發模式 (瀏覽器預覽)

```bash
npm run dev
# 開啟 http://localhost:9001
```

### 3. iOS 構建

```bash
# 方法 1: 使用腳本 (推薦)
chmod +x setup-ios.sh
./setup-ios.sh

# 方法 2: 手動步驟
npm run build              # 構建 Next.js
npx cap sync ios          # 同步到 iOS
cd ios/App
pod install               # 安裝 iOS 依賴
open App.xcworkspace      # 開啟 Xcode
```

### 4. Xcode 運行

1. 選擇 iOS 模擬器 (例如: iPhone 15 Pro)
2. 點擊 ▶️ Run 按鈕
3. 等待 App 安裝並啟動

---

## 📋 待開發功能清單

### ✅ 已完成

- [x] 專案結構設定
- [x] Capacitor iOS 整合
- [x] 底部 Tab Bar 導航
- [x] 登入頁 (開發模式支援)
- [x] Dashboard (我的卡片頁)
- [x] Cards (探索頁)
- [x] Profile (個人設定頁)
- [x] Mock 資料展示
- [x] 響應式 UI 設計

### ⏳ 待實作

#### 功能開發
- [ ] **開始追蹤** 功能 (Cards 頁)
  - 呼叫 `api.addUserCard(cardId)`
  - 成功後顯示提示
  - 更新 Dashboard

- [ ] **卡片詳情頁** (`/cards/[id]`)
  - 完整福利列表
  - 使用條件說明
  - 到期日期
  - 追蹤/取消追蹤按鈕

- [ ] **移除卡片** 功能 (Dashboard)
  - 長按或滑動刪除
  - 確認對話框
  - 呼叫 `api.removeUserCard(userCardId)`

- [ ] **搜尋功能** (Cards 頁)
  - 卡片名稱搜尋
  - 銀行名稱搜尋
  - 即時篩選

#### 後端整合
- [ ] 實際 API 連接
  - 修改 `.env.local` 使用電腦 IP
  - 測試所有 API 端點
  - 錯誤處理

- [ ] LINE 登入整合
  - LINE LIFF SDK
  - Token 管理
  - 自動更新

#### 進階功能
- [ ] **Push Notifications**
  - 福利到期提醒
  - 新卡片通知
  - APNs 配置

- [ ] **離線支援**
  - Service Worker
  - 本地緩存
  - 同步機制

- [ ] **多語言完整支援**
  - i18n 整合
  - 動態切換
  - 翻譯檔案

---

## 🎨 設計規範

### 顏色主題

```css
/* 主色調 */
--primary: #667eea;
--primary-dark: #764ba2;
--gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* 文字顏色 */
--text-primary: #1f2937;
--text-secondary: #6b7280;
--text-muted: #9ca3af;

/* 背景顏色 */
--bg-white: #ffffff;
--bg-gray: #f3f4f6;
--bg-light: #f9fafb;

/* 邊框 */
--border: #e5e7eb;

/* 狀態顏色 */
--success: #10b981;
--danger: #dc2626;
--warning: #f59e0b;
```

### 間距系統

```css
--spacing-xs: 0.25rem;   /* 4px */
--spacing-sm: 0.5rem;    /* 8px */
--spacing-md: 1rem;      /* 16px */
--spacing-lg: 1.5rem;    /* 24px */
--spacing-xl: 2rem;      /* 32px */
```

### 圓角

```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-full: 9999px;
```

### 陰影

```css
--shadow-sm: 0 2px 8px rgba(0,0,0,0.08);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
--shadow-lg: 0 10px 40px rgba(0,0,0,0.3);
```

### 卡片圖片比例

信用卡標準比例: **300:190** (約 1.58:1)

```typescript
paddingTop: '63.3%'  // 190/300 = 0.633
```

---

## 🐛 常見問題

### 1. Xcode 顯示白屏

**原因**: `index.html` 找不到

**解決**:
1. 檢查 `capacitor.config.ts` 的 `webDir: 'out'`
2. 執行 `npm run build` 確保 `out/` 目錄存在
3. 執行 `npx cap sync ios` 重新同步

### 2. CocoaPods 安裝失敗

**錯誤**: `securerandom requires Ruby >= 3.1.0`

**解決**:
```bash
# 使用 Homebrew (推薦)
brew install cocoapods

# 或升級 Ruby
brew install rbenv
rbenv install 3.2.0
```

### 3. API 連接失敗 (iOS 模擬器)

**原因**: `localhost` 在模擬器中指向模擬器本身

**解決**:
1. 找到電腦 IP: `ifconfig | grep "inet "`
2. 修改 `.env.local`:
   ```bash
   NEXT_PUBLIC_API_URL=http://192.168.1.100:3000
   ```
3. 重新構建: `npm run build && npx cap sync ios`

### 4. 必須使用 .xcworkspace 不能用 .xcodeproj

**原因**: 使用 CocoaPods 後必須用 workspace

**解決**:
```bash
open ios/App/App.xcworkspace
# 或
npx cap open ios
```

---

## 📱 iOS Safe Area 支援

使用 CSS 環境變數處理 iPhone 瀏海和 Home Indicator:

```css
/* 底部 Tab Bar */
height: calc(60px + env(safe-area-inset-bottom));
padding-bottom: env(safe-area-inset-bottom);

/* 頂部 */
padding-top: env(safe-area-inset-top);
```

---

## 🔐 安全性注意事項

### 1. 不要在前端儲存敏感資料

```typescript
// ❌ 錯誤
localStorage.setItem('password', '...')

// ✅ 正確
localStorage.setItem('token', jwt)  // 只存 token
```

### 2. API 請求使用 HTTPS

生產環境務必使用 HTTPS:
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 3. Token 過期處理

```typescript
if (response.status === 401) {
  localStorage.removeItem('token')
  router.push('/')
}
```

---

## 📚 相關文件

- [Next.js 文檔](https://nextjs.org/docs)
- [Capacitor 文檔](https://capacitorjs.com/docs)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)

---

## 📞 聯絡資訊

如有問題或建議，請聯繫開發團隊。

**最後更新**: 2024-01-10
