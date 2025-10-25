# 信用卡福利追蹤器 - 通知系統架構文檔

## 📋 概述

本系統實現了**多通道自動通知**功能，可透過 **Telegram**、**Email** 和 **Web Push** 三種方式提醒使用者信用卡福利即將到期。

## 🏗️ 系統架構

```
┌─────────────────────────────────────────────────────────────────┐
│                      定時任務調度器                               │
│                   (node-cron Scheduler)                          │
│                                                                   │
│  • 每天 09:00 - 檢查即將到期的福利                                 │
│  • 每天 02:00 - 歸檔已過期的福利                                  │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│              benefitExpirationService.ts                         │
│                                                                   │
│  checkAndNotifyExpiringBenefits()                                │
│  • 查詢所有啟用通知且未完成的福利                                  │
│  • 計算提醒日期 (periodEnd - reminderDays)                        │
│  • 呼叫 notificationService 發送通知                              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                notificationService.ts                            │
│                                                                   │
│  sendNotification({ userId, title, body, data })                 │
│  • 自動偵測使用者可用的通知管道                                    │
│  • 同時發送所有可用的通知方式                                      │
│  ├── Telegram (如果有 telegramId)                                │
│  ├── Email (如果有 email)                                        │
│  └── Web Push (如果有 pushSubscriptions)                         │
└─────────────────────────────────────────────────────────────────┘
```

## 🔔 三種通知管道

### 1. Telegram 通知
**適用於：** Telegram 登入的使用者

**流程：**
```
User.telegramId → Bot.sendMessage() → Telegram App
```

**優點：**
- ⚡ 即時推送到手機
- 📱 行動裝置優先
- 🤖 可直接在 Bot 中操作

**實作檔案：**
- `apps/backend/src/services/notificationService.ts` (sendTelegramNotification)
- `apps/backend/src/bot/index.ts` (Telegram Bot)

### 2. Email 通知
**適用於：** Google 登入或有 email 的使用者

**流程：**
```
User.email → nodemailer (Gmail SMTP) → Email Inbox
```

**優點：**
- 📧 傳統可靠
- 💻 適合辦公室場景
- 📄 可留存紀錄

**設定要求：**
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password  # Gmail App Password
```

**實作檔案：**
- `apps/backend/src/services/notificationService.ts` (sendEmailNotification)

### 3. Web Push 通知
**適用於：** 在瀏覽器中訂閱推播的使用者

**流程：**
```
Browser Subscription → FCM/Push Service → Browser Notification
```

**優點：**
- 🔔 瀏覽器原生通知
- 🌐 跨平台 (Windows/macOS/Linux)
- 📲 即使網頁關閉也能收到 (瀏覽器需開啟)

**技術架構：**
1. **Service Worker** (`apps/frontend/public/sw.js`)
   - 背景執行，監聽 push 事件
   - 顯示瀏覽器通知

2. **VAPID 金鑰** (Web Push 驗證)
   ```env
   VAPID_PUBLIC_KEY=...
   VAPID_PRIVATE_KEY=...
   ```

3. **訂閱管理** 
   - 前端：`apps/frontend/src/lib/pushNotifications.ts`
   - 後端：`apps/backend/src/routes/pushNotifications.ts`
   - 資料表：`PushSubscription`

**限制：**
- ⚠️ 需要 HTTPS 或 localhost
- ⚠️ Service Worker 不支援 HTTP 遠端連線

**實作檔案：**
- `apps/backend/src/services/notificationService.ts` (sendWebPushNotification)
- `apps/backend/src/routes/pushNotifications.ts` (API routes)
- `apps/frontend/src/lib/pushNotifications.ts` (前端工具)
- `apps/frontend/public/sw.js` (Service Worker)
- `apps/frontend/src/components/NotificationSettings.tsx` (設定介面)

## 📊 資料庫 Schema

### PushSubscription (Web Push 訂閱)
```prisma
model PushSubscription {
  id            Int      @id @default(autoincrement())
  userId        Int
  endpoint      String
  p256dh        String   // 公鑰
  auth          String   // 認證密鑰
  userAgent     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, endpoint])
}
```

### UserBenefit (通知設定)
```prisma
model UserBenefit {
  // ...
  reminderDays         Int?      // 提前幾天提醒
  notificationEnabled  Boolean   @default(true)  // 是否啟用通知
  periodEnd            DateTime? // 福利到期日
  // ...
}
```

## ⏰ 定時任務

### 1. 每日福利檢查 (09:00 AM)
```typescript
cron.schedule('0 9 * * *', async () => {
  await checkAndNotifyExpiringBenefits();
}, { timezone: 'Asia/Taipei' });
```

**執行邏輯：**
1. 查詢所有 `notificationEnabled=true` 且 `isCompleted=false` 的福利
2. 計算提醒日期：`reminderDate = periodEnd - reminderDays`
3. 如果 `now >= reminderDate && now <= periodEnd`，發送通知
4. 計算剩餘天數並組合通知訊息
5. 呼叫 `sendNotification()` 發送到所有可用管道

### 2. 每日福利歸檔 (02:00 AM)
```typescript
cron.schedule('0 2 * * *', async () => {
  await archiveExpiredBenefits();
}, { timezone: 'Asia/Taipei' });
```

**執行邏輯：**
1. 查詢所有 `periodEnd < now` 且 `isCompleted=false` 的福利
2. 創建 `UserBenefitHistory` 歷史記錄
3. 刪除原始 `UserBenefit` 記錄

## 🧪 手動測試

### 1. 測試單一通知管道

**測試 Web Push:**
```bash
curl -X POST "http://localhost:9001/api/push/test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**測試 Email:**
需先設定 `EMAIL_USER` 和 `EMAIL_PASSWORD`

**測試 Telegram:**
需確保 Telegram Bot 運行中且使用者有 `telegramId`

### 2. 手動觸發福利檢查

```bash
curl -X POST "http://localhost:9001/api/admin/manual/check-expiring-benefits" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**回應範例：**
```json
{
  "success": true,
  "notificationsSent": 3,
  "errors": 0,
  "totalChecked": 10
}
```

## 🔐 環境變數設定

### 後端 (apps/backend/.env)
```env
# Telegram Bot
BOT_TOKEN=your-bot-token
BOT_USERNAME=YourBotUsername

# Email (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Web Push (VAPID)
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:your-email@example.com
```

### 前端 (apps/frontend/.env.local)
```env
# Telegram
NEXT_PUBLIC_BOT_USERNAME=YourBotUsername

# Web Push
NEXT_PUBLIC_VAPID_KEY=your-public-key

# API
NEXT_PUBLIC_API_URL=http://localhost:9001
```

## 🚀 部署注意事項

### Web Push 需求
1. **HTTPS 必需** - Service Worker 只在 HTTPS 或 localhost 上運作
2. **Domain 設定** - 確保前端運行在 HTTPS 網域上
3. **VAPID 金鑰** - 生產環境使用獨立的 VAPID 金鑰

### Email 需求
1. **Gmail App Password** - 不是 Gmail 密碼
2. **允許不安全的應用程式** - 在 Google 帳戶設定中啟用
3. 取得方式：https://support.google.com/accounts/answer/185833

### Telegram 需求
1. **Bot Token** - 從 @BotFather 取得
2. **Webhook vs Polling** - 生產環境建議用 Webhook
3. **避免多實例** - 同一時間只能有一個 Bot 實例運行

## 📱 使用者操作流程

### 啟用 Web Push 通知
1. 登入 Dashboard
2. 在「瀏覽器通知」區塊點擊「🔔 啟用通知」
3. 瀏覽器彈出權限請求，點擊「允許」
4. 訂閱成功，可點擊「📨 測試通知」驗證

### 調整福利通知設定
1. 在 Dashboard 找到特定福利
2. 點擊「⚙️ 設定」
3. 調整「提醒天數」(預設 7 天)
4. 切換「啟用通知」開關

## 🔧 故障排除

### Web Push 無法訂閱
- ✅ 確認使用 HTTPS 或 localhost
- ✅ 檢查 Service Worker 是否註冊成功 (開發者工具 → Application → Service Workers)
- ✅ 確認 VAPID public key 正確

### Email 通知失敗
- ✅ 檢查 `EMAIL_USER` 和 `EMAIL_PASSWORD` 是否正確
- ✅ 確認使用 Gmail App Password，不是帳號密碼
- ✅ 查看後端 console 錯誤訊息

### Telegram 通知失敗
- ✅ 確認 Telegram Bot 正在運行
- ✅ 檢查使用者是否有 `telegramId`
- ✅ 確認沒有多個 Bot 實例運行 (409 Conflict)

### 定時任務未執行
- ✅ 確認後端服務持續運行
- ✅ 檢查時區設定 (Asia/Taipei)
- ✅ 查看 console 是否有 "Scheduled tasks initialized" 訊息

## 📈 監控與日誌

### 通知發送日誌
```
✅ Sent notification to user 1 for benefit 現金回饋
✅ Benefit expiration check complete: 3 notifications sent, 0 errors
```

### 錯誤日誌
```
❌ Telegram notification failed for user 2: Bot not found
❌ Email notification failed for user 3: Invalid credentials
```

### 定時任務日誌
```
⏰ Running daily benefit expiration check...
🔍 Checking for expiring benefits...
📦 Running daily benefit archiving...
```

## 🎯 最佳實踐

1. **多管道冗餘** - 不依賴單一通知方式，同時發送多種通知
2. **優雅降級** - 某個管道失敗不影響其他管道
3. **使用者控制** - 允許使用者自訂提醒天數和開關通知
4. **避免騷擾** - 只在即將到期時提醒一次，不重複發送
5. **日誌記錄** - 詳細記錄所有通知發送狀態

## 📝 未來改進方向

- [ ] 支援自訂通知時間
- [ ] 支援多次提醒 (例如 7 天、3 天、1 天前)
- [ ] LINE Notify 整合
- [ ] 通知歷史記錄
- [ ] 通知統計儀表板
- [ ] A/B 測試不同提醒策略
