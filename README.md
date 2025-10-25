# 信用卡福利追蹤系統 / Credit Card Benefits Tracker

一個完整的信用卡福利追蹤系統，支援 Telegram Bot 和 Web 前端。

## 專案架構

```
creditcard_tracker/
├── apps/
│   ├── backend/          # Node.js + Express + Prisma 後端
│   └── frontend/         # Next.js 前端 (支援 Cloudflare Pages)
├── package.json          # Monorepo root
└── README.md
```

## 功能特色

### 基本功能
- ✅ 使用者透過 Telegram 註冊登入
- ✅ 管理個人信用卡
- ✅ 查看信用卡福利
- ✅ 標記福利已完成/未完成
- ✅ 自動提醒福利到期日
- ✅ 多語言支援 (繁體中文、英文)

### 進階功能 (規劃中)
- 🔄 使用者等級制度
- 🔄 好友系統
- 🔄 資訊分享功能

### 管理功能
- ✅ 管理者可新增信用卡
- ✅ 管理者可新增福利項目

## 技術棧

### 後端
- **框架**: Node.js + Express + TypeScript
- **資料庫**: SQLite (可替換為 PostgreSQL)
- **ORM**: Prisma
- **Bot**: Telegraf (Telegram Bot)
- **排程**: node-cron
- **認證**: JWT

### 前端
- **框架**: Next.js 15 + React 18 + TypeScript
- **樣式**: CSS
- **部署**: Cloudflare Pages (with Functions)
- **狀態管理**: Zustand (規劃中)

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

#### 後端 (.env)
```bash
cd apps/backend
cp .env.example .env
```

編輯 `.env` 填入：
- `BOT_TOKEN`: 從 [@BotFather](https://t.me/botfather) 取得
- `JWT_SECRET`: 隨機字串
- `ADMIN_USER_IDS`: 管理員的 Telegram User ID (逗號分隔)

#### 前端 (.env.local)
```bash
cd apps/frontend
cp .env.example .env.local
```

### 3. 初始化資料庫

```bash
cd apps/backend
npm run db:generate
npm run db:push
```

### 4. 啟動開發環境

在根目錄執行：

```bash
# 啟動後端 (http://localhost:6001)
npm run dev:backend

# 啟動前端 (http://localhost:6000)
npm run dev:frontend
```

## 部署

### 後端部署
建議部署到任何支援 Node.js 的平台：
- Railway
- Render
- Fly.io
- VPS (with PM2)

### 前端部署到 Cloudflare Pages

```bash
cd apps/frontend
npm run pages:build
npm run pages:deploy
```

或連接 GitHub 倉庫自動部署。

## 資料庫結構

### 主要資料表
- **User**: 使用者資料
- **CreditCard**: 信用卡資料
- **Benefit**: 福利項目
- **UserCard**: 使用者擁有的信用卡
- **UserBenefit**: 使用者福利完成狀態
- **Friendship**: 好友關係 (進階功能)

詳見 [apps/backend/prisma/schema.prisma](apps/backend/prisma/schema.prisma)

## Telegram Bot 指令

- `/start` - 開始使用並註冊
- `我的信用卡` / `My Cards` - 查看已新增的信用卡
- `查看福利` / `View Benefits` - 查看所有福利及完成狀態
- `設定` / `Settings` - 變更語言設定

## API 端點

### 認證
- `POST /api/auth/telegram` - Telegram 登入

### 信用卡
- `GET /api/cards` - 取得所有信用卡
- `GET /api/cards/my` - 取得我的信用卡
- `POST /api/cards/my` - 新增信用卡
- `DELETE /api/cards/my/:cardId` - 移除信用卡

### 福利
- `GET /api/benefits/my` - 取得我的福利
- `POST /api/benefits/:id/complete` - 標記完成
- `POST /api/benefits/:id/uncomplete` - 取消完成

### 管理員
- `POST /api/admin/cards` - 新增信用卡
- `POST /api/admin/cards/:cardId/benefits` - 新增福利

## 授權

MIT
