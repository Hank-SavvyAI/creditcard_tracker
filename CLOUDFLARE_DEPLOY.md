# Cloudflare Pages 手動部署教學

## 📋 前置準備

### 1. 安裝 Wrangler CLI

Wrangler 是 Cloudflare 的官方 CLI 工具。

```bash
# 全域安裝（推薦）
npm install -g wrangler

# 或在專案中使用（已包含在 package.json）
npx wrangler --version
```

---

## 🔐 登入 Cloudflare

### 方式 1：瀏覽器登入（推薦）

```bash
# 執行登入指令
wrangler login
```

**會發生什麼：**
1. 終端機會顯示：`Opening a link in your browser...`
2. 自動開啟瀏覽器
3. 前往 Cloudflare 授權頁面
4. 點擊 **"Allow"** 授權
5. 看到成功訊息後，回到終端機
6. 終端機顯示：`Successfully logged in!`

### 方式 2：使用 API Token（進階）

如果在無法開啟瀏覽器的環境（如 CI/CD）：

#### 步驟 1：建立 API Token

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 點擊右上角個人資料 → **API Tokens**
3. 點擊 **Create Token**
4. 選擇 **Edit Cloudflare Workers** 模板
5. 設定權限：
   - Account → Cloudflare Pages → Edit
   - Zone → DNS → Read（可選）
6. 點擊 **Continue to summary** → **Create Token**
7. **複製 Token**（只會顯示一次！）

#### 步驟 2：設定 Token

```bash
# 設定環境變數
export CLOUDFLARE_API_TOKEN="your_token_here"

# 或在 .bashrc / .zshrc 中永久設定
echo 'export CLOUDFLARE_API_TOKEN="your_token_here"' >> ~/.zshrc
source ~/.zshrc
```

---

## 🚀 手動部署步驟

### 完整部署流程

```bash
# 1. 切換到前端目錄
cd /Users/hank/Code/creditcard_tracker/apps/frontend

# 2. 確保已登入
wrangler whoami

# 3. 安裝依賴（首次）
npm install

# 4. 建置專案
npm run build

# 5. 使用 @cloudflare/next-on-pages 轉換
npm run pages:build

# 6. 部署到 Cloudflare Pages
npx wrangler pages deploy .vercel/output/static --project-name=creditcard-tracker
```

### 詳細說明

#### Step 4: 建置專案
```bash
npm run build
```
這會執行標準的 Next.js 建置。

#### Step 5: 轉換為 Cloudflare Pages 格式
```bash
npm run pages:build
```
實際執行：`npx @cloudflare/next-on-pages`

這會：
- 將 Next.js 輸出轉換為 Cloudflare Workers 格式
- 產生靜態資產到 `.vercel/output/static/`

#### Step 6: 部署
```bash
npx wrangler pages deploy .vercel/output/static --project-name=creditcard-tracker
```

參數說明：
- `.vercel/output/static/` - 建置輸出目錄
- `--project-name` - Cloudflare Pages 專案名稱（首次會自動建立）

---

## 📊 部署過程輸出範例

```bash
$ npx wrangler pages deploy .vercel/output/static --project-name=creditcard-tracker

🌍  Uploading... (3/3)

✨ Success! Uploaded 1 files (3 already uploaded) (0.52 sec)

✨ Compiled Worker successfully
✨ Uploading Worker bundle
✨ Uploading _routes.json
🌎 Deploying...
✨ Deployment complete! Take a peek over at
   https://abc123.creditcard-tracker.pages.dev
```

---

## 🔧 常用 Wrangler 指令

### 檢查登入狀態
```bash
wrangler whoami
```

輸出範例：
```
You are logged in as user@example.com
Account ID: abc123def456
```

### 登出
```bash
wrangler logout
```

### 查看專案列表
```bash
wrangler pages project list
```

### 查看部署歷史
```bash
wrangler pages deployment list --project-name=creditcard-tracker
```

### 查看環境變數
```bash
wrangler pages deployment list
```

---

## ⚙️ 設定環境變數

### 透過 Wrangler CLI

```bash
# 設定生產環境變數
wrangler pages secret put NEXT_PUBLIC_API_URL --project-name=creditcard-tracker

# 會提示輸入值
? Enter a secret value: › https://your-backend.railway.app
```

### 透過 Cloudflare Dashboard（推薦）

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 選擇 **Workers & Pages**
3. 點擊你的專案 `creditcard-tracker`
4. 前往 **Settings** → **Environment variables**
5. 點擊 **Add variable**
6. 輸入：
   - Variable name: `NEXT_PUBLIC_API_URL`
   - Value: `https://your-backend.railway.app`
7. 選擇環境：Production / Preview / Both
8. 點擊 **Save**

---

## 🎯 首次部署完整指令

複製貼上這些指令即可：

```bash
# 1. 登入 Cloudflare
wrangler login

# 2. 切換到前端目錄
cd apps/frontend

# 3. 安裝依賴
npm install

# 4. 建置
npm run build && npm run pages:build

# 5. 部署
npx wrangler pages deploy .vercel/output/static --project-name=creditcard-tracker

# 完成！會得到一個 URL，例如：
# https://creditcard-tracker.pages.dev
```

---

## 🔄 更新部署

每次程式碼更新後，只需要：

```bash
cd apps/frontend
npm run build && npm run pages:build
npx wrangler pages deploy .vercel/output/static --project-name=creditcard-tracker
```

或使用腳本（已在 package.json 中）：

```bash
npm run pages:deploy
```

---

## 🌐 自訂域名

### 步驟 1：在 Cloudflare 新增域名

1. 前往你的 Pages 專案
2. **Custom domains** → **Set up a custom domain**
3. 輸入域名（例如：`app.yourdomain.com`）
4. Cloudflare 會自動設定 DNS

### 步驟 2：更新環境變數

記得在後端 `.env` 更新 `FRONTEND_URL`：

```bash
FRONTEND_URL=https://app.yourdomain.com
```

---

## ❓ 常見問題

### Q: `wrangler login` 沒有開啟瀏覽器？

**A:** 手動複製終端機顯示的 URL 到瀏覽器開啟。

### Q: 部署時顯示 "Project not found"？

**A:** 首次部署時 Cloudflare 會自動建立專案，或手動建立：

```bash
wrangler pages project create creditcard-tracker
```

### Q: 部署後頁面顯示 500 錯誤？

**A:** 檢查：
1. 環境變數是否正確設定
2. 後端 API 是否正常運行
3. CORS 設定是否允許前端域名

### Q: 如何回滾到之前的版本？

**A:** 在 Cloudflare Dashboard：
1. 前往你的專案
2. **Deployments** 標籤
3. 找到之前的部署
4. 點擊 **...** → **Rollback to this deployment**

---

## 📱 使用 GitHub Actions 自動部署

建立 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          cd apps/frontend
          npm install

      - name: Build
        run: |
          cd apps/frontend
          npm run build
          npm run pages:build

      - name: Deploy
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: creditcard-tracker
          directory: apps/frontend/.vercel/output/static
```

---

## 🎉 完成！

現在你已經知道如何：
- ✅ 登入 Cloudflare
- ✅ 手動部署
- ✅ 設定環境變數
- ✅ 管理部署

有任何問題都可以查看 [Cloudflare Pages 文檔](https://developers.cloudflare.com/pages/)
