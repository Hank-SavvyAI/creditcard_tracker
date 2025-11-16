# Telegram Bot 設定指南

## 步驟 1: 創建 Telegram Bot

1. 在 Telegram 中搜尋 **@BotFather**
2. 發送 `/newbot` 命令
3. 輸入你的 Bot 名稱（例如：`Credit Card Tracker`）
4. 輸入你的 Bot Username（必須以 `bot` 結尾，例如：`creditcard_tracker_bot`）
5. BotFather 會給你一個 **Bot Token**，看起來像這樣：
   ```
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890
   ```

## 步驟 2: 填入 Token

打開 `apps/backend/.env` 文件，填入你的資訊：

```bash
# 把 YOUR_BOT_TOKEN_HERE 替換成你的 Token
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890

# 把 YOUR_BOT_USERNAME 替換成你的 Bot Username（不包含 @）
BOT_USERNAME=creditcard_tracker_bot
```

## 步驟 3: 設定 Bot 命令（選擇性）

回到 @BotFather，發送以下命令來設定 Bot 的命令選單：

```
/setcommands
```

選擇你的 Bot，然後貼上：

```
start - 開始使用
mycards - 我的信用卡
benefits - 我的福利
addcard - 添加信用卡
settings - 設定
language - 切換語言
```

## 步驟 4: 設定 Bot 描述（選擇性）

```
/setdescription
```

選擇你的 Bot，然後輸入：

```
Credit Card Benefits Tracker - 追蹤你的信用卡福利，不錯過任何優惠！
```

## 步驟 5: 設定 Web Login Domain

這個步驟很重要！讓 Bot 支援網頁登入：

```
/setdomain
```

選擇你的 Bot，然後輸入：

```
localhost
```

（上線後改成你的正式域名，例如：`yourapp.com`）

## 步驟 6: 重啟後端服務

儲存 `.env` 後，重啟你的後端服務，Bot 就會自動啟動！

```bash
cd apps/backend
npm run dev
```

你應該會看到：

```
✅ Database connected
🤖 Telegram bot started
⏰ Reminder cron started
🚀 Server running on port 5001
```

## 測試 Bot

1. 在 Telegram 搜尋你的 Bot Username（例如：`@creditcard_tracker_bot`）
2. 點擊 **Start** 或發送 `/start`
3. Bot 應該會回覆歡迎訊息

## 常見問題

### Q: Bot Token 在哪裡？
A: 找 @BotFather 發送 `/mybots`，選擇你的 Bot，然後點擊 "API Token"

### Q: 如何測試 Web Login？
A: 前往 http://localhost:3002 點擊 "登入" 按鈕，應該會看到 Telegram Login Widget

### Q: Bot 沒有回應？
A: 確認：
1. BOT_TOKEN 正確無誤
2. 後端服務正在運行
3. 沒有防火牆擋住 Telegram API

### Q: Web Login 失敗？
A: 確認：
1. BOT_USERNAME 填寫正確（不含 @）
2. 已經設定 /setdomain
3. 網頁使用 HTTPS（正式環境）或 localhost（開發環境）

## 進階設定

### 設定 Bot 頭像

1. 準備一張 512x512 的正方形圖片
2. 發送 `/setuserpic` 給 @BotFather
3. 選擇你的 Bot
4. 上傳圖片

### 設定 Bot 關於資訊

```
/setabouttext
```

輸入：

```
追蹤信用卡福利，自動提醒到期日，不錯過任何優惠！
🎁 福利追蹤 | ⏰ 自動提醒 | 🌍 多語言支援
```

## 安全提醒

⚠️ **Bot Token 是機密資訊**
- 不要公開分享
- 不要提交到 Git（已加入 .gitignore）
- 定期更換 Token（在 @BotFather 中使用 /revoke）
