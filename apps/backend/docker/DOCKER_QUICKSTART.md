# Docker 快速開始指南

## 🚀 本地測試

### 1. 建置 Docker Image

```bash
cd apps/backend

# 如果你使用 Mac (M1/M2/M3)，需要指定平台為 linux/amd64
docker build --platform linux/amd64 -t creditcard-tracker-backend:latest .

# 如果是 Intel Mac 或 Linux，可以直接建置
# docker build -t creditcard-tracker-backend:latest .
```

### 2. 使用 docker-compose 執行

```bash
# 確保 .env 文件存在並配置正確
docker-compose up -d

# 查看 logs
docker-compose logs -f

# 停止
docker-compose down
```

### 3. 使用 docker run 執行

```bash
docker run -d \
  --name creditcard-backend \
  -p 8443:8443 \
  --env-file .env \
  creditcard-tracker-backend:latest

# 查看 logs
docker logs -f creditcard-backend

# 停止
docker stop creditcard-backend
docker rm creditcard-backend
```

## ✅ 測試部署

訪問健康檢查端點：
```bash
curl http://localhost:8443/health
```

預期回應：
```json
{
  "status": "ok",
  "timestamp": "2025-10-30T..."
}
```

## 📦 Image 管理

### 查看本地 images
```bash
docker images | grep creditcard
```

### 清理舊 images
```bash
docker image prune -a
```

### 查看 container 狀態
```bash
docker ps -a | grep creditcard
```

## 🔍 除錯

### 進入 container
```bash
docker exec -it creditcard-backend sh
```

### 查看詳細日誌
```bash
docker logs creditcard-backend --tail 100 -f
```

### 檢查 container 資源使用
```bash
docker stats creditcard-backend
```

## 🌐 部署到雲端

### AWS
參考 [DEPLOY_AWS.md](./DEPLOY_AWS.md)

推薦方案：
- **最簡單**: AWS App Runner
- **推薦**: AWS ECS Fargate
- **經濟**: AWS EC2

### Azure
參考 [DEPLOY_AZURE.md](./DEPLOY_AZURE.md)

推薦方案：
- **最現代**: Azure Container Apps
- **傳統**: Azure App Service
- **最簡單**: Azure Container Instances

## 📝 環境變數清單

必需的環境變數：
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
PORT=8443
```

選填的環境變數：
```
NODE_ENV=production
FRONTEND_URL=https://your-frontend.com
BOT_TOKEN=your-telegram-bot-token
BOT_USERNAME=your-bot-username
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-api/api/auth/google/callback
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
SKIP_AUTH=false
DEV_TOKEN=dev-token-for-development
```

## 🔄 CI/CD 整合

### GitHub Actions
創建 `.github/workflows/docker.yml`:

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]
    paths:
      - 'apps/backend/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        working-directory: ./apps/backend
        run: docker build -t creditcard-tracker-backend:latest .

      # 添加推送到 registry 的步驟
```

## 💡 最佳實踐

1. **多階段建置**: Dockerfile 使用多階段建置減少 image 大小
2. **非 root 使用者**: Container 以 nodejs 使用者執行，提高安全性
3. **健康檢查**: 包含 health endpoint 確保服務正常
4. **信號處理**: 使用 dumb-init 正確處理系統信號
5. **日誌**: 使用 stdout/stderr 讓 Docker 收集日誌

## 🎯 生產環境檢查清單

- [ ] 設置所有必需的環境變數
- [ ] 使用外部 PostgreSQL 資料庫
- [ ] 啟用 SSL/TLS
- [ ] 設置 rate limiting
- [ ] 配置 log aggregation
- [ ] 設置監控和告警
- [ ] 啟用自動擴展
- [ ] 配置備份策略
- [ ] 設置 CI/CD pipeline
- [ ] 進行負載測試

## 📊 效能優化

### Image 大小
目前 image 大小約 150-200MB（使用 Alpine Linux）

### 啟動時間
- 冷啟動：約 5-10 秒
- 包含 Prisma Client 生成和連接資料庫

### 記憶體使用
- 最小：512MB
- 推薦：1GB
- 生產：2GB+

## 🆘 常見問題

### Q: 為什麼 container 無法啟動？
A: 檢查環境變數是否設置正確，特別是 DATABASE_URL

### Q: 健康檢查失敗？
A: 確認 port 8443 已開放且應用正常運行

### Q: 如何更新部署？
A: 重新建置 image，推送到 registry，然後更新服務

### Q: 資料庫連接失敗？
A: 確認資料庫 host 可從 container 訪問，檢查防火牆規則
