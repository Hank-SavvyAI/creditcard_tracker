# Mobile App API 整合指南

本文檔說明如何將 Mobile App 從開發模式（Mock Data）切換到連接真實後端 API。

---

## 📋 目錄

1. [當前狀態](#當前狀態)
2. [切換到真實 API 的步驟](#切換到真實-api-的步驟)
3. [API 端點清單](#api-端點清單)
4. [測試檢查清單](#測試檢查清單)
5. [常見問題](#常見問題)

---

## 當前狀態

目前 Mobile App 運行在 **開發模式** 下，使用模擬資料（Mock Data）：

```bash
# mobile/.env.local
NEXT_PUBLIC_SKIP_AUTH=true
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### 開發模式特點

✅ **優點**:
- 無需後端伺服器即可測試 UI
- 快速開發和預覽
- 模擬各種狀態（已追蹤、未追蹤等）

⚠️ **限制**:
- 使用硬編碼的模擬數據
- 不會儲存到資料庫
- 無法測試實際 API 錯誤處理

---

## 切換到真實 API 的步驟

### 步驟 1: 確保後端運行

```bash
cd /Users/hank/Code/creditcard_tracker/apps/backend
npm run dev
```

後端應該運行在 `http://localhost:3000` (或您配置的端口)

### 步驟 2: 獲取電腦 IP 位址

iOS 模擬器無法使用 `localhost` 連接本機後端，需要使用電腦的實際 IP。

```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# 輸出範例:
# inet 192.168.1.100 netmask 0xffffff00 broadcast 192.168.1.255
```

記下您的 IP 位址（例如：`192.168.1.100`）

### 步驟 3: 更新環境變數

編輯 `mobile/.env.local`:

```bash
# 將 SKIP_AUTH 設為 false（或移除這一行）
# NEXT_PUBLIC_SKIP_AUTH=true  ← 註解或刪除

# 使用電腦 IP 而非 localhost
NEXT_PUBLIC_API_URL=http://192.168.1.100:3000

# (可選) 如果您有開發用的 Token，可以設定
# NEXT_PUBLIC_DEV_TOKEN=your_jwt_token_here
```

### 步驟 4: 重新構建 App

```bash
cd mobile

# 清除 Next.js 快取
rm -rf .next out

# 重新構建
npm run build

# 同步到 iOS
npx cap sync ios

# 開啟 Xcode
npx cap open ios
```

### 步驟 5: 在 Xcode 中運行

1. 選擇 iOS 模擬器（例如：iPhone 15 Pro）
2. 點擊 ▶️ Run
3. App 現在會連接到真實後端！

### 步驟 6: 測試登入流程

如果關閉 `SKIP_AUTH`，您需要實作登入功能：

**選項 A: 使用 DEV_TOKEN（快速測試）**

1. 從 backend 獲取一個有效的 JWT Token
2. 設定到 `.env.local`:
   ```bash
   NEXT_PUBLIC_DEV_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. API client 會自動使用這個 token

**選項 B: 實作 LINE 登入（正式）**

1. 整合 LINE LIFF SDK
2. 修改 `src/app/page.tsx` 的登入流程
3. 取得 LINE ID Token 後呼叫後端驗證

---

## API 端點清單

以下是 Mobile App 使用的所有 API 端點：

### 🔐 認證相關

| 端點 | 方法 | 說明 | 使用頁面 |
|------|------|------|----------|
| `/api/auth/telegram` | POST | Telegram 登入 | 登入頁 |
| *未來: LINE 登入* | POST | LINE LIFF 登入 | 登入頁 |

### 💳 卡片管理

| 端點 | 方法 | 說明 | 使用頁面 |
|------|------|------|----------|
| `/api/cards` | GET | 取得所有可用卡片 | Cards 探索頁 |
| `/api/cards/my` | GET | 取得我的卡片列表 | Dashboard, Cards |
| `/api/cards/my` | POST | 新增卡片到追蹤清單 | Cards 探索頁, 詳情頁 |
| `/api/cards/my/:id` | DELETE | 移除已追蹤的卡片 | Dashboard |
| `/api/cards/my/:id` | PATCH | 更新卡片設定 | *待實作* |

### 🎁 福利管理

| 端點 | 方法 | 說明 | 使用頁面 |
|------|------|------|----------|
| `/api/benefits/my` | GET | 取得我的所有福利 | Dashboard |
| `/api/benefits/:id/complete` | POST | 標記福利為已使用 | *待實作* |
| `/api/benefits/:id/uncomplete` | POST | 取消已使用標記 | *待實作* |

### 👤 用戶管理

| 端點 | 方法 | 說明 | 使用頁面 |
|------|------|------|----------|
| `/api/users/me` | GET | 取得當前用戶資訊 | Profile |
| `/api/users/me/language` | PATCH | 更新語言設定 | Profile |

---

## 測試檢查清單

切換到真實 API 後，請依序測試以下功能：

### ✅ Dashboard (我的卡片)

- [ ] 頁面載入時顯示我的卡片列表
- [ ] 如果沒有卡片，顯示空狀態提示
- [ ] 點擊「查看詳情」可以跳轉到詳情頁
- [ ] 點擊 🗑️ 可以移除卡片
- [ ] 移除後卡片從列表消失
- [ ] 點擊「重新整理」可以重新載入數據
- [ ] 如果 API 失敗，顯示錯誤訊息和重試按鈕

### ✅ Cards (探索頁)

- [ ] 頁面載入時顯示所有可用卡片
- [ ] 地區篩選正常運作（全部/台灣/美國）
- [ ] 類型篩選正常運作（全部/個人/商業）
- [ ] 清除篩選按鈕正常運作
- [ ] 已追蹤的卡片顯示「✓ 已追蹤」徽章
- [ ] 未追蹤的卡片顯示「➕ 開始追蹤」按鈕
- [ ] 點擊「開始追蹤」成功新增卡片
- [ ] 追蹤成功後按鈕變為「✓ 已追蹤」
- [ ] 點擊「詳情」可以跳轉到詳情頁

### ✅ Card Detail (卡片詳情頁)

- [ ] 頁面載入時顯示卡片完整資訊
- [ ] 顯示卡片圖片、名稱、銀行
- [ ] 顯示地區、類型、年費等基本資訊
- [ ] 顯示所有福利項目（類別、標題、描述、金額）
- [ ] 底部固定按鈕顯示正確狀態（已追蹤/開始追蹤）
- [ ] 點擊「開始追蹤」成功新增卡片
- [ ] 點擊「返回」可以回到上一頁

### ✅ Profile (個人設定)

- [ ] 顯示用戶資訊（名稱、Email/LINE ID）
- [ ] 語言切換正常運作（繁中/English）
- [ ] 通知設定 Toggle 正常運作
- [ ] 顯示正確的 App 版本資訊
- [ ] 登出按鈕正常運作（清除 token，返回登入頁）

---

## 常見問題

### Q1: iOS 模擬器無法連接到後端

**錯誤**: `Network request failed` 或 `Connection refused`

**解決方案**:
1. 確認使用電腦 IP 而非 `localhost`:
   ```bash
   # ❌ 錯誤
   NEXT_PUBLIC_API_URL=http://localhost:3000

   # ✅ 正確
   NEXT_PUBLIC_API_URL=http://192.168.1.100:3000
   ```

2. 確認後端正在運行:
   ```bash
   cd apps/backend
   npm run dev
   ```

3. 測試後端可訪問性:
   ```bash
   curl http://192.168.1.100:3000/api/cards
   ```

### Q2: 401 Unauthorized 錯誤

**原因**: Token 無效或過期

**解決方案**:
1. 檢查 localStorage 中的 token 是否有效
2. 使用 `NEXT_PUBLIC_DEV_TOKEN` 設定開發用 token:
   ```bash
   NEXT_PUBLIC_DEV_TOKEN=your_valid_jwt_token
   ```

3. 或實作完整的登入流程

### Q3: 白屏或空白頁

**原因**: Next.js 構建輸出問題

**解決方案**:
```bash
cd mobile

# 清除所有快取
rm -rf .next out node_modules/.cache

# 重新構建
npm run build

# 同步到 iOS
npx cap sync ios
```

### Q4: 圖片無法顯示

**原因**: Cloudflare R2 URL 格式或權限問題

**解決方案**:
1. 確認後端返回的 `photo` URL 格式正確
2. 確認 Cloudflare R2 bucket 設定為公開可訪問
3. 檢查瀏覽器/模擬器網路權限

### Q5: 資料沒有更新

**原因**: 快取或狀態管理問題

**解決方案**:
1. 使用「重新整理」按鈕重新載入
2. 完全關閉 App 重新開啟
3. 清除 App 資料:
   ```bash
   # iOS 模擬器
   xcrun simctl uninstall booted com.creditcard.tracker
   ```

---

## 🔄 開發模式 vs 正式模式對照表

| 功能 | 開發模式 (SKIP_AUTH=true) | 正式模式 (SKIP_AUTH=false) |
|------|--------------------------|---------------------------|
| **資料來源** | Mock data (hardcoded) | Backend API |
| **登入** | 自動跳過 | 需要 LINE/Token 認證 |
| **資料持久化** | 否（重新載入會重置） | 是（儲存到資料庫） |
| **追蹤卡片** | 本地狀態 | 後端資料庫 |
| **錯誤處理** | 模擬錯誤 | 真實 API 錯誤 |
| **網路需求** | 無 | 需要連接後端 |

---

## 📝 開發建議

### 1. 使用環境變數管理配置

創建不同的環境配置：

```bash
# .env.local.development (開發)
NEXT_PUBLIC_SKIP_AUTH=true
NEXT_PUBLIC_API_URL=http://localhost:5001

# .env.local.staging (測試)
NEXT_PUBLIC_SKIP_AUTH=false
NEXT_PUBLIC_API_URL=http://192.168.1.100:3000
NEXT_PUBLIC_DEV_TOKEN=test_token

# .env.local.production (正式)
NEXT_PUBLIC_SKIP_AUTH=false
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 2. 使用 React DevTools

在開發時啟用 React DevTools 來檢查狀態：

```typescript
// Add to page components during development
if (process.env.NODE_ENV === 'development') {
  console.log('Current state:', { userCards, loading, error })
}
```

### 3. 添加更詳細的錯誤日誌

修改 API client 添加更詳細的日誌：

```typescript
// src/lib/api.ts
private async request(endpoint: string, options: RequestInit = {}) {
  console.log(`[API] ${options.method || 'GET'} ${this.baseUrl}${endpoint}`)

  try {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      console.error(`[API Error] ${response.status}:`, await response.text())
      throw new Error(...)
    }

    const data = await response.json()
    console.log(`[API Success]`, data)
    return data
  } catch (error) {
    console.error(`[API Exception]`, error)
    throw error
  }
}
```

---

## 🎯 下一步

完成 API 整合後的建議開發方向：

1. **LINE 登入整合**
   - 整合 LINE LIFF SDK
   - 實作 LINE ID Token 驗證
   - 處理登入失敗情況

2. **推送通知**
   - 設定 APNs (Apple Push Notification service)
   - 實作福利到期提醒
   - 實作新卡片通知

3. **離線支援**
   - 使用 IndexedDB 緩存資料
   - 實作離線狀態檢測
   - 自動同步機制

4. **效能優化**
   - 圖片 lazy loading
   - 列表虛擬滾動
   - API 請求防抖動

5. **用戶體驗改善**
   - 添加骨架屏載入動畫
   - 優化錯誤提示 UI
   - 添加手勢操作（滑動刪除等）

---

## 📚 相關文件

- [APP_ARCHITECTURE.md](./APP_ARCHITECTURE.md) - App 架構說明
- [README.md](./README.md) - 專案設定指南
- [Backend API Docs](../apps/backend/API.md) - 後端 API 文檔

---

**最後更新**: 2024-01-10
