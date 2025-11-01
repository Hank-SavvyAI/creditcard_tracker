#!/bin/bash

# 建置和測試 Docker image 的腳本

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

IMAGE_NAME="creditcard-tracker-backend"
TAG="${1:-latest}"
CONTAINER_NAME="creditcard-backend-test"

echo -e "${GREEN}🔨 開始建置 Docker image...${NC}"
# 使用 --platform linux/amd64 確保與雲端平台相容
docker build --platform linux/amd64 -t ${IMAGE_NAME}:${TAG} .

echo -e "${GREEN}✅ Image 建置完成！${NC}"
docker images | grep ${IMAGE_NAME}

echo -e "${YELLOW}🧪 測試啟動 container...${NC}"

# 清理舊的測試 container
docker rm -f ${CONTAINER_NAME} 2>/dev/null || true

# 啟動測試 container
docker run -d \
  --name ${CONTAINER_NAME} \
  -p 8443:8443 \
  --env-file .env \
  ${IMAGE_NAME}:${TAG}

echo -e "${YELLOW}⏳ 等待服務啟動...${NC}"
sleep 5

# 檢查健康狀態
echo -e "${YELLOW}🏥 檢查健康狀態...${NC}"
for i in {1..10}; do
  if curl -s http://localhost:8443/health > /dev/null; then
    echo -e "${GREEN}✅ 服務健康檢查通過！${NC}"
    curl -s http://localhost:8443/health | jq .
    break
  else
    echo -e "${YELLOW}等待服務就緒... ($i/10)${NC}"
    sleep 3
  fi

  if [ $i -eq 10 ]; then
    echo -e "${RED}❌ 健康檢查失敗${NC}"
    echo -e "${RED}查看 container logs:${NC}"
    docker logs ${CONTAINER_NAME}
    docker rm -f ${CONTAINER_NAME}
    exit 1
  fi
done

# 顯示 logs
echo -e "${GREEN}📋 Container logs:${NC}"
docker logs ${CONTAINER_NAME} --tail 20

# 顯示 container 資訊
echo -e "${GREEN}📊 Container 資訊:${NC}"
docker stats ${CONTAINER_NAME} --no-stream

echo -e "${GREEN}✅ 測試完成！${NC}"
echo -e "${YELLOW}Container 名稱: ${CONTAINER_NAME}${NC}"
echo -e "${YELLOW}停止測試: docker stop ${CONTAINER_NAME}${NC}"
echo -e "${YELLOW}刪除測試: docker rm ${CONTAINER_NAME}${NC}"
echo -e "${YELLOW}查看 logs: docker logs -f ${CONTAINER_NAME}${NC}"
