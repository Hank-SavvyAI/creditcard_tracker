#!/bin/bash

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

APP_NAME="creditcard-backend"
RESOURCE_GROUP="creditcard-rg"
ENDPOINT="https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Azure Container Apps 縮放測試工具                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. 檢查縮放設定
echo -e "${GREEN}📊 1. 檢查縮放設定${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SCALE_CONFIG=$(az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP \
    --query "properties.template.scale" -o json 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "$SCALE_CONFIG" | jq .
    MIN_REPLICAS=$(echo "$SCALE_CONFIG" | jq -r '.minReplicas')
    MAX_REPLICAS=$(echo "$SCALE_CONFIG" | jq -r '.maxReplicas')
    echo -e "\n${YELLOW}設定摘要:${NC}"
    echo -e "  • 最少實例: ${YELLOW}$MIN_REPLICAS${NC}"
    echo -e "  • 最多實例: ${YELLOW}$MAX_REPLICAS${NC}"
    if [ "$MIN_REPLICAS" -eq 0 ]; then
        echo -e "  • 縮到 0: ${GREEN}✓ 啟用（節省成本）${NC}"
    else
        echo -e "  • 縮到 0: ${RED}✗ 未啟用${NC}"
    fi
else
    echo -e "${RED}✗ 無法取得縮放設定${NC}"
fi
echo ""

# 2. 檢查當前 replica 數量
echo -e "${GREEN}🔢 2. 當前 replica 數量${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
REVISION=$(az containerapp revision list --name $APP_NAME --resource-group $RESOURCE_GROUP --query '[0].name' -o tsv 2>/dev/null)
if [ -n "$REVISION" ]; then
    echo -e "當前 Revision: ${BLUE}$REVISION${NC}"
    REPLICAS=$(az containerapp replica list --name $APP_NAME --resource-group $RESOURCE_GROUP --revision $REVISION 2>/dev/null)
    REPLICA_COUNT=$(echo "$REPLICAS" | jq -r 'length')

    if [ "$REPLICA_COUNT" -eq 0 ]; then
        echo -e "Replicas: ${YELLOW}0${NC} ${RED}(已縮到 0，無任何 container 運行)${NC}"
    else
        echo -e "Replicas: ${GREEN}$REPLICA_COUNT${NC}"
        echo "$REPLICAS" | jq -r '.[] | "  • \(.name) - \(.properties.runningState)"'
    fi
else
    echo -e "${RED}✗ 無法取得 revision 資訊${NC}"
    REPLICA_COUNT=0
fi
echo ""

# 3. 測試健康檢查
echo -e "${GREEN}🏥 3. 測試健康檢查（冷啟動測試）${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "發送 HTTP 請求到: $ENDPOINT/health"
START_TIME=$(date +%s.%N)
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" "$ENDPOINT/health" 2>/dev/null)
END_TIME=$(date +%s.%N)

BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE\|TIME_TOTAL")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
TIME_TOTAL=$(echo "$RESPONSE" | grep "TIME_TOTAL" | cut -d: -f2)

echo -e "回應內容: ${BLUE}$BODY${NC}"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "HTTP 狀態: ${GREEN}✓ 200 OK${NC}"
else
    echo -e "HTTP 狀態: ${RED}✗ $HTTP_CODE${NC}"
fi

echo -e "回應時間: ${YELLOW}${TIME_TOTAL}s${NC}"

# 判斷是否為冷啟動
if (( $(echo "$TIME_TOTAL > 2.0" | bc -l) )); then
    echo -e "類型: ${YELLOW}⚠ 冷啟動（從 0 啟動，較慢）${NC}"
elif (( $(echo "$TIME_TOTAL > 1.0" | bc -l) )); then
    echo -e "類型: ${YELLOW}⚠ 溫啟動（container 正在啟動）${NC}"
else
    echo -e "類型: ${GREEN}✓ 熱啟動（container 已運行）${NC}"
fi
echo ""

# 4. 等待並檢查 replica 變化
echo -e "${GREEN}⏳ 4. 等待 5 秒後檢查 replica 變化${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 5

NEW_REPLICAS=$(az containerapp replica list --name $APP_NAME --resource-group $RESOURCE_GROUP --revision $REVISION 2>/dev/null)
NEW_REPLICA_COUNT=$(echo "$NEW_REPLICAS" | jq -r 'length')
echo -e "新的 Replicas: ${YELLOW}$NEW_REPLICA_COUNT${NC}"

if [ "$NEW_REPLICA_COUNT" -gt "$REPLICA_COUNT" ]; then
    echo -e "變化: ${GREEN}✓ 自動擴展 ($REPLICA_COUNT → $NEW_REPLICA_COUNT)${NC}"
elif [ "$NEW_REPLICA_COUNT" -eq 0 ] && [ "$REPLICA_COUNT" -eq 0 ]; then
    echo -e "變化: ${YELLOW}⚠ 冷啟動（從 0 啟動，回應時間: ${TIME_TOTAL}s）${NC}"
else
    echo -e "變化: ${GREEN}✓ 維持運行中${NC}"
fi
echo ""

# 5. 查看最近的日誌
echo -e "${GREEN}📋 5. 最近的日誌（最後 10 行）${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
LOGS=$(az containerapp logs show --name $APP_NAME --resource-group $RESOURCE_GROUP --tail 10 --follow false 2>/dev/null | tail -10)
echo "$LOGS"
echo ""

# 6. 成本估算
echo -e "${GREEN}💰 6. 成本估算${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "資源配置: 0.5 vCPU, 1GB RAM"
echo "價格: \$0.000024/vCPU-秒, \$0.000003/GiB-秒"
echo ""
if [ "$NEW_REPLICA_COUNT" -eq 0 ]; then
    echo -e "當前狀態: ${GREEN}已縮到 0 → 完全免費 \$0/小時${NC}"
elif [ "$NEW_REPLICA_COUNT" -eq 1 ]; then
    echo -e "當前狀態: 1 replica 運行中 → 約 ${YELLOW}\$0.05/小時${NC}"
else
    HOURLY_COST=$(echo "$NEW_REPLICA_COUNT * 0.05" | bc)
    echo -e "當前狀態: $NEW_REPLICA_COUNT replicas 運行中 → 約 ${YELLOW}\$${HOURLY_COST}/小時${NC}"
fi
echo ""

# 總結
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    測試完成摘要                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo -e "  • Replicas: ${YELLOW}$REPLICA_COUNT${NC} → ${YELLOW}$NEW_REPLICA_COUNT${NC}"
echo -e "  • 回應時間: ${YELLOW}${TIME_TOTAL}s${NC}"
echo -e "  • HTTP 狀態: $([ "$HTTP_CODE" = "200" ] && echo "${GREEN}✓ 正常${NC}" || echo "${RED}✗ 異常${NC}")"
echo -e "  • 縮放功能: $([ "$MIN_REPLICAS" -eq 0 ] && echo "${GREEN}✓ 啟用${NC}" || echo "${RED}✗ 未啟用${NC}")"
echo ""
