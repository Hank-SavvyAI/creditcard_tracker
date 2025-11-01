# Credit Card Tracker Backend - Docker 部署

這是信用卡福利追蹤系統的後端服務 Docker 化配置。

## 📁 文件說明

- **Dockerfile** - Docker image 定義
- **docker-compose.yml** - 本地開發/測試用
- **.dockerignore** - Docker build 時忽略的文件
- **build-and-test.sh** - 自動建置和測試腳本
- **DOCKER_QUICKSTART.md** - Docker 快速開始指南
- **DEPLOY_AWS.md** - AWS 部署完整指南
- **DEPLOY_AZURE.md** - Azure 部署完整指南

## 🚀 快速開始

### 1. 本地測試

```bash
# 使用自動化腳本（推薦）
./build-and-test.sh

# 或手動執行
docker-compose up -d
```

### 2. 部署到 AWS

```bash
# 參考詳細指南
cat DEPLOY_AWS.md

# 推薦方案：ECS Fargate
# 步驟：
# 1. 推送 image 到 ECR
# 2. 創建 ECS Cluster
# 3. 部署 Task Definition
# 4. 創建 Service
```

### 3. 部署到 Azure

```bash
# 參考詳細指南
cat DEPLOY_AZURE.md

# 推薦方案：Container Apps
# 步驟：
# 1. 推送 image 到 ACR
# 2. 創建 Container Apps Environment
# 3. 部署 Container App
```

## 🔧 技術規格

### Docker Image
- **基礎 image**: node:20-alpine
- **大小**: ~150-200MB
- **架構**: Multi-stage build
- **使用者**: 非 root (nodejs:1001)

### 運行需求
- **CPU**: 0.5-1 vCPU
- **記憶體**: 1-2GB
- **Port**: 8443
- **健康檢查**: `/health` endpoint

### 環境變數
必需：
- `DATABASE_URL` - PostgreSQL 連接字串
- `JWT_SECRET` - JWT 密鑰
- `PORT` - 服務 port (預設 8443)

選填：
- `NODE_ENV` - 環境 (production/development)
- `FRONTEND_URL` - 前端網址
- `BOT_TOKEN` - Telegram Bot Token
- 其他參考 `.env.example`

## 📊 雲端部署方案比較

### AWS

| 方案 | 複雜度 | 成本/月 | 適用場景 |
|------|--------|---------|----------|
| App Runner | ⭐ | $15-30 | 最簡單，適合快速部署 |
| ECS Fargate | ⭐⭐ | $20-40 | 推薦，靈活且易管理 |
| EC2 | ⭐⭐⭐ | $10+ | 需要更多控制權 |

### Azure

| 方案 | 複雜度 | 成本/月 | 適用場景 |
|------|--------|---------|----------|
| Container Apps | ⭐ | $15-30 | 最現代，推薦 |
| App Service | ⭐⭐ | $13+ | 傳統 PaaS |
| Container Instances | ⭐ | $15-25 | 最簡單，按需計費 |
| AKS | ⭐⭐⭐⭐ | $70+ | 大規模應用 |

## 🎯 推薦配置

### 小型應用 (< 1000 使用者)
- **AWS**: App Runner 或 ECS Fargate (1 task)
- **Azure**: Container Apps 或 Container Instances
- **配置**: 0.5 CPU, 1GB RAM

### 中型應用 (1000-10000 使用者)
- **AWS**: ECS Fargate (2-5 tasks with ALB)
- **Azure**: Container Apps (auto-scaling 1-5 replicas)
- **配置**: 1 CPU, 2GB RAM

### 大型應用 (> 10000 使用者)
- **AWS**: ECS Fargate (5-20 tasks with ALB)
- **Azure**: AKS 或 Container Apps
- **配置**: 2 CPU, 4GB RAM

## 🔒 安全最佳實踐

1. ✅ **使用非 root 使用者**運行 container
2. ✅ **不要在 image 中包含機密**，使用環境變數或 secrets manager
3. ✅ **定期更新**基礎 image 和依賴
4. ✅ **啟用健康檢查**確保服務可用性
5. ✅ **使用 HTTPS**保護通訊
6. ✅ **設置防火牆規則**限制訪問
7. ✅ **啟用日誌和監控**

## 📈 監控和日誌

### 健康檢查
```bash
curl http://your-service/health
```

### 查看日誌
```bash
# Docker
docker logs -f container-name

# AWS CloudWatch
aws logs tail /ecs/creditcard-backend --follow

# Azure
az containerapp logs show --name app-name --follow
```

### 監控指標
- CPU 使用率
- 記憶體使用率
- 請求數量和延遲
- 錯誤率
- 健康檢查狀態

## 🔄 CI/CD 整合

兩個平台都支援：
- GitHub Actions
- GitLab CI/CD
- Azure DevOps
- Jenkins

範例在各自的部署文檔中。

## 📞 故障排除

### Container 無法啟動
1. 檢查環境變數
2. 查看 container logs
3. 確認資料庫可訪問
4. 檢查 port 設置

### 健康檢查失敗
1. 確認 `/health` endpoint 可訪問
2. 檢查 port 映射
3. 查看應用 logs

### 資料庫連接錯誤
1. 確認 DATABASE_URL 正確
2. 檢查網路連接
3. 驗證防火牆規則

## 📚 相關文件

- [DOCKER_QUICKSTART.md](./DOCKER_QUICKSTART.md) - Docker 快速開始
- [DEPLOY_AWS.md](./DEPLOY_AWS.md) - AWS 完整部署指南
- [DEPLOY_AZURE.md](./DEPLOY_AZURE.md) - Azure 完整部署指南
- [../../../README.md](../../../README.md) - 專案主文檔

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License
