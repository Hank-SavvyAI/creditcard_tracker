# LINE Webhook 設定指南

## 功能概述

LINE Webhook 功能允許用戶直接透過 LINE 聊天機器人查詢即將到期的信用卡福利，使用完全免費的 Reply API，無需消耗付費的 Push Message 配額。

## 主要特色

- ✅ **完全免費**：使用 Reply API 回應用戶查詢，不計入 Push Message 配額
- 🔐 **安全驗證**：使用 HMAC-SHA256 簽名驗證 LINE 平台請求
- 🤖 **智能解析**：自動識別用戶查詢的時間範圍（如「7天」、「本週」、「本月」等）
- 📊 **即時查詢**：從資料庫即時查詢用戶的到期福利
- 💬 **友善回覆**：格式化的訊息回覆，包含福利詳情和到期天數

## 支援的查詢方式

用戶可以用以下方式詢問：

- 「查詢7天內到期的福利」
- 「本週有什麼福利要到期」
- 「30天內到期的福利」
- 「本月到期福利」
- 「一個月內到期的福利」

## Webhook 設定步驟

### 1. 在 LINE Developers Console 設定 Webhook

1. 登入 [LINE Developers Console](https://developers.line.biz/)
2. 選擇你的 Provider 和 Messaging API Channel
3. 進入 **Messaging API** 分頁
4. 找到 **Webhook settings** 區塊
5. 設定 **Webhook URL**：
   - 開發環境：需要使用 ngrok 或其他工具將本地伺服器暴露到公網
   - 正式環境：`https://your-backend-domain.com/api/line/webhook`
6. 點擊 **Verify** 按鈕驗證 Webhook URL 是否有效
7. 啟用 **Use webhook**（開啟開關）

### 2. 環境變數設定

確保你的 `.env` 檔案包含以下變數：

```bash
# LINE Messaging API
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token

# Frontend URL (用於訊息中的連結)
FRONTEND_URL=https://your-frontend-domain.com
```

### 3. 開發環境使用 ngrok

如果要在本地測試 webhook：

```bash
# 安裝 ngrok
npm install -g ngrok

# 啟動後端伺服器
npm run dev

# 在另一個終端機執行 ngrok
ngrok http 9001

# 將 ngrok 提供的 HTTPS URL 設定到 LINE Webhook
# 例如：https://abc123.ngrok.io/api/line/webhook
```

## Webhook 處理流程

### 1. 簽名驗證

每個來自 LINE 的請求都會包含 `x-line-signature` header，webhook 會驗證簽名以確保請求來自 LINE Platform：

```typescript
function verifyLineSignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('SHA256', process.env.LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');
  return hash === signature;
}
```

### 2. 事件處理

支援以下事件類型：

- **message (text)**：用戶發送文字訊息
- **follow**：用戶加入機器人好友
- **unfollow**：用戶封鎖或刪除機器人

### 3. 訊息解析

使用正則表達式解析用戶查詢的時間範圍：

```typescript
// 支援的模式
/(\d+)\s*天/     // 例：7天、30天
/(\d+)\s*日/     // 例：7日、30日
/一週|本週|這週/  // 轉換為 7 天
/一個月|本月/    // 轉換為 30 天
```

### 4. 資料庫查詢

根據解析的天數查詢用戶的到期福利：

```typescript
const expiringBenefits = await prisma.userBenefit.findMany({
  where: {
    userId: user.id,
    status: 'ACTIVE',
    expiryDate: {
      lte: expiryDate,    // 在指定天數內
      gte: new Date(),    // 尚未過期
    },
  },
  include: {
    benefit: {
      include: { card: true },
    },
  },
  orderBy: { expiryDate: 'asc' },
});
```

### 5. 格式化回覆

將查詢結果格式化為友善的訊息：

```
🔔 未來 7 天內即將到期的福利：

1. 台新銀行 - 玫瑰卡
   📌 星巴克買一送一
   ⏰ 到期日：2025/11/10
   ⚠️ 剩餘 5 天
   💡 每週三星巴克指定飲品買一送一

💻 查看完整詳情：https://your-domain.com/dashboard
```

## API 成本比較

| 類型 | 用途 | 費用 |
|------|------|------|
| Reply API | 回應用戶訊息（webhook） | **完全免費** ✅ |
| Push API | 主動推送通知 | 免費 200 則/月，之後收費 💰 |

## 測試 Webhook

### 1. 檢查 Webhook 狀態

在 LINE Developers Console 可以看到：
- Webhook URL 是否已設定
- 最後驗證時間
- 最近的錯誤（如果有）

### 2. 測試流程

1. 確保後端伺服器正在運行
2. 在 LINE app 中向你的官方帳號發送訊息
3. 檢查後端 console 的日誌輸出
4. 應該會看到類似以下的日誌：

```
📨 Received LINE event: message
💬 Message from U1234567890abcdef: 查詢7天內到期的福利
🔍 Querying benefits expiring within 7 days for user 1
✅ Reply message sent successfully
```

## 常見問題

### Q1: Webhook 驗證失敗

**可能原因**：
- Webhook URL 無法從公網存取
- LINE_CHANNEL_SECRET 設定錯誤
- 伺服器未正常運行

**解決方法**：
- 確認 URL 可以從公網存取（使用 ngrok 或已部署的伺服器）
- 檢查環境變數設定
- 查看伺服器日誌確認是否有錯誤

### Q2: 收不到用戶訊息

**可能原因**：
- Webhook 功能未啟用
- LINE_CHANNEL_ACCESS_TOKEN 過期或無效

**解決方法**：
- 在 LINE Developers Console 確認 Webhook 已啟用
- 重新產生 Channel Access Token

### Q3: 回覆訊息失敗

**可能原因**：
- Reply Token 只能使用一次
- Channel Access Token 無效

**解決方法**：
- 確保每個 reply token 只使用一次
- 檢查並更新 Channel Access Token

## 擴充功能建議

未來可以考慮加入：

1. **更多查詢選項**
   - 依信用卡查詢
   - 依福利類型查詢
   - 已過期福利查詢

2. **Rich Messages**
   - 使用 Flex Message 提供更豐富的視覺效果
   - 加入圖片和按鈕

3. **Quick Reply**
   - 提供快速回覆選項（如「7天」、「本週」、「本月」）

4. **個人化設定**
   - 允許用戶設定預設查詢天數
   - 自訂通知偏好

## 相關文件

- [LINE Messaging API 官方文件](https://developers.line.biz/en/docs/messaging-api/)
- [LINE Webhook 事件參考](https://developers.line.biz/en/reference/messaging-api/#webhook-event-objects)
- [Reply Message API](https://developers.line.biz/en/reference/messaging-api/#send-reply-message)
