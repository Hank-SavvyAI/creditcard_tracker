#!/bin/bash

# 本地測試 Docker container 的腳本

set -e

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🐳 本地 Docker 測試${NC}"
echo ""

# 檢查 .env 文件
if [ ! -f ../.env ]; then
    echo -e "${RED}❌ 找不到 .env 文件！${NC}"
    echo "請確保 /apps/backend/.env 存在"
    exit 1
fi

echo -e "${YELLOW}📋 檢查 .env 文件...${NC}"
echo "DATABASE_URL: $(grep ^DATABASE_URL ../.env | cut -d'=' -f1)=***"
echo "JWT_SECRET: $(grep ^JWT_SECRET ../.env | cut -d'=' -f1)=***"
echo ""

# 進入 backend 根目錄
cd ..

echo -e "${GREEN}🔨 建置 Docker image...${NC}"
docker build -f docker/Dockerfile -t creditcard-tracker-backend:test .

echo ""
echo -e "${GREEN}🧹 清理舊的測試 container...${NC}"
docker rm -f creditcard-backend-test 2>/dev/null || true

echo ""
echo -e "${GREEN}🚀 啟動 container...${NC}"
docker run -d \
  --name creditcard-backend-test \
  -p 8443:8443 \
  --env-file .env \
  creditcard-tracker-backend:test

echo ""
echo -e "${YELLOW}⏳ 等待服務啟動...${NC}"
sleep 5

echo ""
echo -e "${GREEN}📋 Container logs:${NC}"
docker logs creditcard-backend-test --tail 20

echo ""
echo -e "${YELLOW}🏥 測試健康檢查...${NC}"

for i in {1..10}; do
  if curl -s http://localhost:8443/health > /dev/null; then
    echo -e "${GREEN}✅ 健康檢查通過！${NC}"
    echo ""
    curl -s http://localhost:8443/health | jq . 2>/dev/null || curl -s http://localhost:8443/health
    echo ""
    break
  else
    echo -e "${YELLOW}等待服務就緒... ($i/10)${NC}"
    sleep 3
  fi

  if [ $i -eq 10 ]; then
    echo -e "${RED}❌ 健康檢查失敗${NC}"
    echo ""
    echo -e "${RED}最近的 logs:${NC}"
    docker logs creditcard-backend-test --tail 50
    echo ""
    echo -e "${RED}清理測試 container...${NC}"
    docker rm -f creditcard-backend-test
    exit 1
  fi
done

echo ""
echo -e "${GREEN}✅ 測試成功！${NC}"
echo ""
echo -e "${YELLOW}📊 Container 資訊:${NC}"
docker stats creditcard-backend-test --no-stream

echo ""
echo -e "${YELLOW}💡 有用的命令:${NC}"
echo "  查看 logs:    docker logs -f creditcard-backend-test"
echo "  進入 shell:   docker exec -it creditcard-backend-test sh"
echo "  停止:         docker stop creditcard-backend-test"
echo "  刪除:         docker rm creditcard-backend-test"
echo "  清理所有:     docker stop creditcard-backend-test && docker rm creditcard-backend-test"
echo ""
echo -e "${GREEN}✨ Container 正在運行於 http://localhost:8443${NC}"
