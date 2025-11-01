# Docker 部署配置

這個資料夾包含所有 Docker 相關的配置文件和部署文檔。

## 📁 文件說明

| 文件 | 說明 |
|------|------|
| **Dockerfile** | Docker image 定義（使用 node:20-slim） |
| **.dockerignore** | Docker build 時忽略的文件 |
| **docker-compose.yml** | 本地開發/測試用 |
| **build-and-test.sh** | 自動建置和測試腳本 |
| **README_DOCKER.md** | Docker 完整文檔 |
| **DOCKER_QUICKSTART.md** | 快速開始指南 |
| **DEPLOY_AWS.md** | AWS 部署指南 |
| **DEPLOY_AZURE.md** | Azure 部署指南 |

## 🚀 快速開始

### 方式 1: 使用 docker-compose（推薦）

```bash
# 在 docker 目錄中
cd docker

# 啟動
docker-compose up -d

# 查看 logs
docker-compose logs -f

# 停止
docker-compose down
```

### 方式 2: 使用 Dockerfile 直接建置

```bash
# 在 backend 根目錄
cd /Users/hank/Code/creditcard_tracker/apps/backend

# 建置 image
docker build -f docker/Dockerfile -t creditcard-tracker-backend:latest .

# 運行 container
docker run -d \
  --name creditcard-backend \
  -p 8443:8443 \
  --env-file .env \
  creditcard-tracker-backend:latest

# 查看 logs
docker logs -f creditcard-backend

# 停止並刪除
docker stop creditcard-backend
docker rm creditcard-backend
```

### 方式 3: 使用測試腳本

```bash
cd docker
./build-and-test.sh
```

## 🧪 測試健康檢查

```bash
curl http://localhost:8443/health
```

預期回應：
```json
{
  "status": "ok",
  "timestamp": "2025-10-31T..."
}
```

## ☁️ 雲端部署

### AWS
詳見：[DEPLOY_AWS.md](./DEPLOY_AWS.md)

### Azure
詳見：[DEPLOY_AZURE.md](./DEPLOY_AZURE.md)

## 📝 注意事項

1. **環境變數**: 確保 `.env` 文件在 backend 根目錄存在
2. **平台**: 雲端部署需要使用 `--platform linux/amd64`
3. **Image 類型**: 使用 Debian-based (node:20-slim) 而非 Alpine
4. **Port**: 預設使用 8443

## 🔧 常見問題

### Q: 如何在 Mac (Apple Silicon) 上建置？
A: 使用 `--platform linux/amd64` 參數
```bash
docker build --platform linux/amd64 -f docker/Dockerfile -t creditcard-tracker-backend:latest .
```

### Q: 如何查看 container 內部？
A:
```bash
docker exec -it creditcard-backend sh
```

### Q: 如何清理舊的 images？
A:
```bash
docker system prune -a
```

## 📚 更多文檔

- [完整 Docker 文檔](./README_DOCKER.md)
- [快速開始](./DOCKER_QUICKSTART.md)
- [AWS 部署](./DEPLOY_AWS.md)
- [Azure 部署](./DEPLOY_AZURE.md)
