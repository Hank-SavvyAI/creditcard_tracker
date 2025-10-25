# 部署指南 / Deployment Guide

## 📋 目錄結構

```
creditcard_tracker/
├── apps/
│   ├── backend/     # 後端 API + Telegram Bot
│   └── frontend/    # Next.js 前端
```

---

## 🎯 部署策略

### 前端：Cloudflare Pages
### 後端：Railway / Render / Fly.io

---

## 1️⃣ 部署前端到 Cloudflare Pages

### 方式 A：使用 Git 自動部署（推薦）

#### 步驟 1：推送到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/creditcard-tracker.git
git push -u origin main
```

#### 步驟 2：連接 Cloudflare Pages

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 選擇 **Workers & Pages** → **Create Application** → **Pages**
3. 連接 GitHub 倉庫
4. 設定建置配置：

```yaml
框架預設: Next.js
建置指令: cd apps/frontend && npm install && npm run build
建置輸出目錄: apps/frontend/.next
根目錄: /
Node 版本: 18 或更高
```

#### 步驟 3：設定環境變數

在 Cloudflare Pages 設定中加入：

```bash
NEXT_PUBLIC_API_URL=https://your-backend-api.com
NEXT_PUBLIC_SKIP_AUTH=false  # 生產環境不跳過認證
```

---

### 方式 B：手動部署

```bash
cd apps/frontend

# 安裝依賴
npm install

# 建置（使用 @cloudflare/next-on-pages）
npm run pages:build

# 部署
npx wrangler pages deploy .vercel/output/static --project-name=creditcard-tracker
```

---

## 2️⃣ 部署後端

### 選項 1：Railway（推薦）

#### 步驟 1：準備 Railway 配置

建立 `apps/backend/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npx prisma generate && npm run build"
  },
  "deploy": {
    "startCommand": "npx prisma db push && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 步驟 2：設定環境變數

在 Railway 專案中加入：

```bash
# 資料庫（Railway 會自動提供 PostgreSQL）
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Telegram Bot
BOT_TOKEN=your_telegram_bot_token

# JWT 密鑰
JWT_SECRET=your_random_secret_key_here

# 管理員 ID
ADMIN_USER_IDS=123456789,987654321

# 前端 URL
FRONTEND_URL=https://your-frontend.pages.dev

# Port（Railway 自動提供）
PORT=${{PORT}}
```

#### 步驟 3：部署

```bash
# 安裝 Railway CLI
npm install -g @railway/cli

# 登入
railway login

# 初始化專案
cd apps/backend
railway init

# 部署
railway up
```

---

### 選項 2：Render

#### 步驟 1：建立 `render.yaml`

在專案根目錄建立：

```yaml
services:
  - type: web
    name: creditcard-backend
    env: node
    region: singapore
    plan: free
    buildCommand: cd apps/backend && npm install && npx prisma generate && npm run build
    startCommand: cd apps/backend && npx prisma db push && npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: creditcard-db
          property: connectionString
      - key: BOT_TOKEN
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: ADMIN_USER_IDS
        sync: false
      - key: FRONTEND_URL
        sync: false
      - key: NODE_VERSION
        value: 18

databases:
  - name: creditcard-db
    plan: free
    region: singapore
```

#### 步驟 2：連接 Render

1. 前往 [Render Dashboard](https://dashboard.render.com)
2. **New** → **Blueprint**
3. 連接 GitHub 倉庫
4. 設定環境變數

---

## 3️⃣ 資料庫遷移（SQLite → PostgreSQL）

### 修改 Prisma Schema

編輯 `apps/backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // 從 sqlite 改為 postgresql
  url      = env("DATABASE_URL")
}
```

### 重新生成並推送

```bash
cd apps/backend

# 生成 Prisma Client
npx prisma generate

# 推送到 PostgreSQL
npx prisma db push

# 或使用 migrations
npx prisma migrate dev --name init
```

---

## 4️⃣ 更新前端 API URL

### 開發環境

`apps/frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_SKIP_AUTH=true
```

### 生產環境

在 Cloudflare Pages 設定：
```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_SKIP_AUTH=false
```

---

## 5️⃣ 部署檢查清單

### 前端部署前

- [ ] 確認 `.env` 中的 `NEXT_PUBLIC_API_URL` 指向正確的後端
- [ ] 移除或設定 `NEXT_PUBLIC_SKIP_AUTH=false`
- [ ] 測試本地建置：`npm run build`

### 後端部署前

- [ ] 更新 `prisma/schema.prisma` 為 PostgreSQL
- [ ] 設定所有必要的環境變數
- [ ] 測試資料庫連線
- [ ] 確認 BOT_TOKEN 有效

### 部署後

- [ ] 測試前端能否訪問
- [ ] 測試 API 端點
- [ ] 測試 Telegram Bot
- [ ] 檢查管理員後台功能
- [ ] 測試語言切換

---

## 6️⃣ 常見問題

### Q: Cloudflare Pages 顯示 500 錯誤？

**A:** 檢查：
1. `NEXT_PUBLIC_API_URL` 是否正確
2. 後端是否正常運行
3. CORS 設定是否允許前端域名

### Q: 動態路由（如 `/admin/cards/[id]`）顯示 404？

**A:** 確保 `next.config.js` 沒有設定 `output: 'export'`

### Q: Telegram Bot 無法連接？

**A:** 檢查：
1. `BOT_TOKEN` 環境變數
2. 後端伺服器是否運行
3. Webhook 設定（如使用）

---

## 7️⃣ 建議的部署組合

### 🆓 免費方案

- **前端**: Cloudflare Pages（免費，無限流量）
- **後端**: Railway Hobby Plan（$5/月額度） 或 Render Free
- **資料庫**: Railway PostgreSQL（免費）或 Supabase

### 💰 付費方案

- **前端**: Cloudflare Pages（$0）
- **後端**: Railway Pro（$20/月）或 Render Standard
- **資料庫**: Railway PostgreSQL 或 Neon

---

## 📞 需要幫助？

- Cloudflare Pages: https://developers.cloudflare.com/pages
- Railway: https://docs.railway.app
- Render: https://render.com/docs
- Prisma: https://www.prisma.io/docs

---

## 🚀 快速部署指令

```bash
# 1. 部署前端
cd apps/frontend
npm run pages:build
npx wrangler pages deploy .vercel/output/static

# 2. 部署後端（Railway）
cd apps/backend
railway up
```

完成！🎉
