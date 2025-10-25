# Google OAuth 登入設定指南

## ✅ 已完成的設定

1. ✅ 安裝必要套件 (passport, passport-google-oauth20)
2. ✅ 更新資料庫schema (新增 googleId, email, avatar 欄位)
3. ✅ 建立Google OAuth路由 (`/api/auth/google`)
4. ✅ 建立前端callback頁面
5. ✅ 在首頁加入Google登入按鈕

## 🔧 你需要完成的設定

### 步驟 1: 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊「建立專案」或選擇現有專案
3. 專案名稱：`creditcard-tracker` (或任何你喜歡的名稱)

### 步驟 2: 啟用 Google+ API

1. 在左側選單選擇「API和服務」→「程式庫」
2. 搜尋「Google+ API」
3. 點擊「啟用」

### 步驟 3: 建立 OAuth 2.0 憑證

1. 在左側選單選擇「API和服務」→「憑證」
2. 點擊「建立憑證」→「OAuth 用戶端 ID」
3. 如果提示設定同意畫面，先完成同意畫面設定：
   - 使用者類型：選擇「外部」
   - 應用程式名稱：`CreditCard Tracker`
   - 使用者支援電子郵件：你的email
   - 授權網域：留空（開發環境）
   - 開發人員聯絡資訊：你的email
   - 儲存並繼續

4. 回到建立 OAuth 用戶端 ID：
   - 應用程式類型：選擇「網頁應用程式」
   - 名稱：`CreditCard Tracker Web`
   - 已授權的 JavaScript 來源：
     ```
     http://localhost:9000
     http://localhost:9001
     ```
   - 已授權的重新導向 URI：
     ```
     http://localhost:9001/api/auth/google/callback
     ```

5. 點擊「建立」
6. 你會看到「用戶端 ID」和「用戶端密碼」，**複製這兩個值**

### 步驟 4: 更新環境變數

編輯 `/apps/backend/.env` 檔案，替換這三行：

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=你的用戶端ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=你的用戶端密碼
GOOGLE_CALLBACK_URL=http://localhost:9001/api/auth/google/callback
```

### 步驟 5: 重啟後端伺服器

```bash
# 如果後端正在運行，重啟它
cd apps/backend
npm run dev
```

## 🧪 測試

1. 打開瀏覽器訪問 http://localhost:9000
2. 你應該會看到「使用 Google 登入」按鈕
3. 點擊按鈕，會跳轉到 Google 登入頁面
4. 登入後會自動返回你的應用並進入 dashboard

## 🔍 故障排除

### 問題：點擊按鈕後顯示 400 錯誤
**解決方案：** 確認 Google Cloud Console 中的「已授權的重新導向 URI」設定正確

### 問題：登入後沒有跳轉到 dashboard
**解決方案：** 檢查瀏覽器 Console 是否有錯誤，確認 `FRONTEND_URL` 環境變數設定正確

### 問題：顯示「此應用程式未經過 Google 驗證」
**解決方案：** 這是正常的！在開發環境中，點擊「進階」→「前往 creditcard-tracker (不安全)」即可繼續

## 📝 正式環境部署注意事項

部署到正式環境時，記得：

1. 在 Google Cloud Console 新增正式環境的網域到「已授權的 JavaScript 來源」和「已授權的重新導向 URI」
2. 更新 `.env` 的 `GOOGLE_CALLBACK_URL` 為正式環境網址
3. 完成 OAuth 同意畫面的驗證流程（如果需要公開使用）

## 🎉 功能特色

✅ 支援 Google 和 Telegram 雙重登入
✅ 自動建立新使用者或連結現有帳號（通過email）
✅ 儲存使用者頭像
✅ JWT token 30天有效期
✅ 完整的錯誤處理和重定向

---

有任何問題請參考：
- [Google OAuth 2.0 文件](https://developers.google.com/identity/protocols/oauth2)
- [Passport Google OAuth 文件](http://www.passportjs.org/packages/passport-google-oauth20/)
