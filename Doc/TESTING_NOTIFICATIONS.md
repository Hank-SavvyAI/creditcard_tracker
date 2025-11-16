# 通知功能測試指南

## 📋 目錄
1. [系統架構](#系統架構)
2. [準備工作](#準備工作)
3. [測試方法](#測試方法)
4. [驗證結果](#驗證結果)
5. [故障排除](#故障排除)

---

## 系統架構

### 定時任務
系統使用 `node-cron` 執行兩個定時任務：

| 任務 | 執行時間 | 功能 | 檔案位置 |
|------|---------|------|---------|
| 福利到期檢查 | 每天 9:00 AM | 檢查即將到期的福利並發送通知 | `src/services/benefitExpirationService.ts` |
| 福利歸檔 | 每天 2:00 AM | 將已過期的福利歸檔到歷史記錄 | `src/services/benefitExpirationService.ts` |

### 通知渠道
- **Telegram** - 透過 Telegram Bot API
- **LINE** - 透過 LINE Messaging API
- **瀏覽器推播** - Web Push Notifications

---

## 準備工作

### 1. 確保依賴已安裝
```bash
cd apps/backend
npm install
```

### 2. 確保環境變數已設定
檢查 `.env` 文件包含：
```env
BOT_TOKEN=your_telegram_bot_token
LINE_CHANNEL_ACCESS_TOKEN=your_line_access_token
DATABASE_URL=your_database_url
```

### 3. 生成 Prisma Client
```bash
npx prisma generate
```

### 4. 啟動資料庫
```bash
# 如果使用 Docker
docker-compose up -d

# 或者確保 PostgreSQL 正在運行
```

### 5. 啟動 Backend Server
```bash
npm run dev
```

應該看到以下輸出：
```
✅ Database connected
🚀 Server running on port 5001
🤖 Telegram bot started
⏰ Reminder cron started
📅 Scheduled tasks started
  - Daily benefit expiration check: 9:00 AM (Asia/Taipei)
  - Daily benefit archiving: 2:00 AM (Asia/Taipei)
```

---

## 測試方法

### 方法 1: Jest 單元測試（推薦用於邏輯驗證）

運行所有測試：
```bash
npm test
```

運行特定測試文件：
```bash
npm test notification.test.ts
```

查看測試覆蓋率：
```bash
npm test -- --coverage
```

### 方法 2: 手動測試報告

創建測試腳本：
```bash
cat > src/scripts/testNotifications.ts << 'EOF'
import { runManualTest } from '../__tests__/notification.test'

runManualTest()
EOF
```

運行測試報告：
```bash
npx ts-node src/scripts/testNotifications.ts
```

輸出範例：
```
╔═══════════════════════════════════════════════════════════════════════╗
║                   信用卡福利通知系統 - 測試報告                       ║
╚═══════════════════════════════════════════════════════════════════════╝

執行時間: 2025/11/11 下午8:30:00
測試案例數量: 11

================================================================================
測試案例 #1: 每月福利 - 餐飲回饋
================================================================================
📝 描述: 每月 5% 餐飲回饋，上限 NT$ 500
🔄 頻率: MONTHLY
📅 預期行為: 每月 1 日重置，月底到期（1/31, 2/28, 3/31...）

📍 當前日期: 2025/11/11
🏁 週期結束日: 2025/11/30
🔖 當前週期: 本月 (11月)

📢 通知測試結果:
--------------------------------------------------------------------------------
提醒天數 | 提醒日期      | 是否通知 | 剩餘天數
--------------------------------------------------------------------------------
7        | 2025/11/23 | ✅ 是     | 19 天
14       | 2025/11/16 | ✅ 是     | 19 天
30       | 2025/10/31 | ❌ 否     | 19 天
60       | 2025/10/01 | ❌ 否     | 19 天

⏳ 距離到期還有 19 天
```

### 方法 3: 使用 Admin API 手動觸發（推薦用於真實環境測試）

#### 3.1 獲取 Admin Token
1. 用管理員帳號登入前端
2. 打開瀏覽器開發者工具 (F12)
3. 進入 Console，執行：
```javascript
localStorage.getItem('token')
```
4. 複製返回的 token

#### 3.2 手動觸發檢查
使用 curl：
```bash
# 設定 token
TOKEN="your_admin_token_here"

# 觸發福利到期檢查
curl -X POST http://localhost:5001/api/admin/manual/check-expiring-benefits \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

使用 Postman：
1. 創建新的 POST 請求
2. URL: `http://localhost:5001/api/admin/manual/check-expiring-benefits`
3. Headers:
   - `Authorization: Bearer YOUR_TOKEN`
   - `Content-Type: application/json`
4. 點擊 Send

#### 3.3 預期回應
```json
{
  "success": true,
  "notificationsSent": 5,
  "errors": 0,
  "totalChecked": 12
}
```

#### 3.4 手動觸發歸檔
```bash
curl -X POST http://localhost:5001/api/admin/manual/archive-expired-benefits \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

預期回應：
```json
{
  "success": true,
  "archivedCount": 3
}
```

### 方法 4: 使用 Prisma Studio 查看數據（推薦用於數據驗證）

啟動 Prisma Studio：
```bash
npx prisma studio --port 5555
```

打開瀏覽器：`http://localhost:5555`

#### 檢查項目：
1. **UserBenefit 表**
   - 檢查 `periodEnd` 是否設定正確
   - 檢查 `notificationEnabled` 是否為 `true`
   - 檢查 `reminderDays` 設定
   - 檢查 `isCompleted` 狀態

2. **User 表**
   - 檢查 `telegramId` / `lineId` 是否存在
   - 檢查 `language` 設定

3. **UserBenefitHistory 表**
   - 檢查已歸檔的福利記錄

---

## 驗證結果

### 1. 檢查 Backend 日誌

運行手動觸發後，應該在終端看到：
```
🔍 Checking for expiring benefits...
✅ Sent notification to user 1 for benefit 餐飲回饋 5%
✅ Sent notification to user 1 for benefit 網購回饋 3%
✅ Benefit expiration check complete: 2 notifications sent, 0 errors
```

### 2. 檢查通知渠道

#### Telegram
1. 打開與您的 Bot 的對話
2. 應該收到類似的訊息：
```
💳 信用卡福利即將到期
您的 Chase Freedom - 餐飲回饋 5% 還有 7 天到期（2025/11/18）
```

#### LINE
1. 打開 LINE 與您的官方帳號對話
2. 檢查是否收到推播訊息

#### 瀏覽器推播
1. 檢查瀏覽器通知權限已允許
2. 查看系統通知中心

### 3. 檢查資料庫變更

使用 Prisma Studio 或直接查詢：
```sql
-- 查看最近的通知記錄
SELECT * FROM "Notification"
ORDER BY "createdAt" DESC
LIMIT 10;

-- 查看即將到期的福利
SELECT
  ub.id,
  u.username,
  b.title,
  ub."periodEnd",
  ub."isCompleted",
  ub."notificationEnabled"
FROM "UserBenefit" ub
JOIN "User" u ON ub."userId" = u.id
JOIN "Benefit" b ON ub."benefitId" = b.id
WHERE ub."notificationEnabled" = true
  AND ub."isCompleted" = false
  AND ub."periodEnd" > NOW()
ORDER BY ub."periodEnd" ASC;
```

---

## 故障排除

### 問題 1: 沒有收到通知

**可能原因：**
1. ❌ 福利的 `notificationEnabled` 設為 `false`
2. ❌ 用戶沒有 `telegramId` 或 `lineId`
3. ❌ `periodEnd` 日期設定錯誤
4. ❌ 提醒天數設定太少，已經超過通知期限

**解決方案：**
```sql
-- 檢查 UserBenefit 設定
SELECT
  ub.id,
  ub."periodEnd",
  ub."reminderDays",
  ub."notificationEnabled",
  ub."isCompleted"
FROM "UserBenefit" ub
WHERE ub."userId" = YOUR_USER_ID;

-- 更新通知設定
UPDATE "UserBenefit"
SET "notificationEnabled" = true,
    "reminderDays" = 7
WHERE "userId" = YOUR_USER_ID;
```

### 問題 2: Telegram Bot 無法發送訊息

**檢查步驟：**
```bash
# 測試 Bot Token
curl https://api.telegram.org/bot$BOT_TOKEN/getMe

# 檢查用戶是否有啟動 Bot
# 用戶必須先在 Telegram 中與 Bot 對話
```

### 問題 3: 定時任務沒有執行

**檢查：**
1. 確認 Backend 正在運行
2. 檢查系統時區設定
3. 查看 cron 表達式是否正確

**調整 cron 執行時間（測試用）：**
編輯 `src/services/scheduledTasks.ts`：
```typescript
// 改為每分鐘執行一次（僅測試用）
cron.schedule('* * * * *', async () => {
  console.log('⏰ Running test check...');
  await checkAndNotifyExpiringBenefits();
});
```

### 問題 4: 通知發送了但內容不正確

**檢查：**
1. 語言設定（`User.language`）
2. 福利的多語言欄位（`titleEn`, `descriptionEn`）
3. 日期格式化邏輯

---

## 創建測試數據

### 快速創建即將到期的福利：

```typescript
// 使用 Prisma Studio 或執行以下腳本
import { prisma } from './lib/prisma';

async function createTestData() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found');

  const benefit = await prisma.benefit.findFirst();
  if (!benefit) throw new Error('No benefit found');

  // 創建一個 7 天後到期的福利
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 7);

  await prisma.userBenefit.create({
    data: {
      userId: user.id,
      benefitId: benefit.id,
      userCardId: 1, // 根據實際情況調整
      year: new Date().getFullYear(),
      periodEnd,
      notificationEnabled: true,
      reminderDays: 7,
      isCompleted: false,
    },
  });

  console.log('✅ Test data created');
}

createTestData();
```

---

## 測試檢查清單

使用此清單確保所有功能正常：

- [ ] Backend 成功啟動
- [ ] 定時任務已註冊
- [ ] 資料庫連線正常
- [ ] Jest 測試全部通過
- [ ] 手動觸發 API 返回成功
- [ ] Backend 日誌顯示通知已發送
- [ ] Telegram 收到測試通知
- [ ] LINE 收到測試通知（如果已配置）
- [ ] 瀏覽器推播正常（如果已配置）
- [ ] 資料庫記錄已更新
- [ ] 福利歸檔功能正常
- [ ] 多語言通知正確

---

## 相關文件

- `src/services/scheduledTasks.ts` - 定時任務配置
- `src/services/benefitExpirationService.ts` - 福利檢查和歸檔邏輯
- `src/services/notificationService.ts` - 通知發送服務
- `src/__tests__/notification.test.ts` - 通知邏輯測試
- `src/routes/admin.ts` - Admin 手動觸發 API

---

## 聯絡資訊

如果遇到問題，請檢查：
1. Backend 日誌輸出
2. Prisma Studio 資料庫狀態
3. 瀏覽器開發者工具 Console

**最後更新：** 2025-11-11
