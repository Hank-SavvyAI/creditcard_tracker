#!/bin/bash

# 測試 check-expiring-benefits 端點
# 模擬 Logic App 呼叫此端點

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}測試 /manual/check-expiring-benefits${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 設定變數
BACKEND_URL="${BACKEND_URL:-https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io}"
ADMIN_TOKEN="${ADMIN_TOKEN}"

# 檢查是否設定了 ADMIN_TOKEN
if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}未設定 ADMIN_TOKEN，嘗試使用本地後端...${NC}"
    BACKEND_URL="http://localhost:8443"
    echo -e "${YELLOW}請輸入 Admin Token (或按 Enter 跳過):${NC}"
    read -r ADMIN_TOKEN
    
    if [ -z "$ADMIN_TOKEN" ]; then
        echo -e "${RED}錯誤: 需要 ADMIN_TOKEN 才能繼續${NC}"
        echo ""
        echo -e "${YELLOW}如何取得 ADMIN_TOKEN:${NC}"
        echo "  1. 登入應用程式作為 admin 用戶"
        echo "  2. 從瀏覽器 localStorage 取得 token"
        echo "  3. 或從資料庫生成一個長期有效的 JWT token"
        echo ""
        exit 1
    fi
fi

echo -e "${BLUE}後端 URL: ${BACKEND_URL}${NC}"
echo -e "${BLUE}使用 Token: ${ADMIN_TOKEN:0:100}...${NC}"
echo ""

# 1. 測試連線
echo -e "${YELLOW}[1/4] 測試後端連線...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/health" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
    echo -e "${GREEN}✓ 後端可連線${NC}"
else
    echo -e "${RED}✗ 後端無法連線 (HTTP $HTTP_CODE)${NC}"
    echo -e "${YELLOW}請確認後端是否正在運行${NC}"
    exit 1
fi
echo ""

# 2. 測試 Token 有效性
echo -e "${YELLOW}[2/4] 驗證 Admin Token...${NC}"
AUTH_TEST=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/api/admin/cards" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" 2>/dev/null)

AUTH_CODE=$(echo "$AUTH_TEST" | tail -n1)
AUTH_BODY=$(echo "$AUTH_TEST" | sed '$d')

if [ "$AUTH_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Token 有效 (Admin 權限確認)${NC}"
elif [ "$AUTH_CODE" = "401" ]; then
    echo -e "${RED}✗ Token 無效或已過期${NC}"
    echo -e "${YELLOW}回應: $AUTH_BODY${NC}"
    exit 1
elif [ "$AUTH_CODE" = "403" ]; then
    echo -e "${RED}✗ Token 有效但不是 Admin 權限${NC}"
    exit 1
else
    echo -e "${YELLOW}⚠️  無法驗證 Token (HTTP $AUTH_CODE)${NC}"
    echo -e "${YELLOW}回應: $AUTH_BODY${NC}"
fi
echo ""

# 3. 呼叫 check-expiring-benefits 端點
echo -e "${YELLOW}[3/4] 呼叫 /api/admin/manual/check-expiring-benefits...${NC}"
echo -e "${BLUE}請求詳情:${NC}"
echo -e "  POST ${BACKEND_URL}/api/admin/manual/check-expiring-benefits"
echo -e "  Authorization: Bearer ${ADMIN_TOKEN:0:20}..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/admin/manual/check-expiring-benefits" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    2>/dev/null)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "${BLUE}HTTP 狀態碼: ${HTTP_CODE}${NC}"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ 請求成功！${NC}"
    echo ""
    echo -e "${YELLOW}回應內容:${NC}"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    echo ""
    
    # 解析回應
    CHECKED=$(echo "$RESPONSE_BODY" | jq -r '.checked // 0' 2>/dev/null)
    NOTIFIED=$(echo "$RESPONSE_BODY" | jq -r '.notified // 0' 2>/dev/null)
    
    echo -e "${GREEN}結果摘要:${NC}"
    echo -e "  檢查的福利數: ${CHECKED}"
    echo -e "  發送的通知數: ${NOTIFIED}"
    
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${RED}✗ 認證失敗 (401 Unauthorized)${NC}"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    
elif [ "$HTTP_CODE" = "403" ]; then
    echo -e "${RED}✗ 權限不足 (403 Forbidden)${NC}"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    
elif [ "$HTTP_CODE" = "500" ]; then
    echo -e "${RED}✗ 伺服器錯誤 (500 Internal Server Error)${NC}"
    echo ""
    echo -e "${YELLOW}錯誤詳情:${NC}"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    
else
    echo -e "${RED}✗ 請求失敗 (HTTP $HTTP_CODE)${NC}"
    echo ""
    echo -e "${YELLOW}回應內容:${NC}"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
fi

echo ""

# 4. 檢查後端日誌（如果是本地環境）
if [[ "$BACKEND_URL" == *"localhost"* ]]; then
    echo -e "${YELLOW}[4/4] 本地環境 - 檢查後端日誌${NC}"
    echo -e "${BLUE}請查看後端控制台輸出以獲取更多詳細資訊${NC}"
else
    echo -e "${YELLOW}[4/4] 生產環境 - 檢查 Azure 日誌${NC}"
    echo -e "${BLUE}使用以下命令查看 Container App 日誌:${NC}"
    echo ""
    echo "  az containerapp logs show \\"
    echo "    --name creditcard-backend \\"
    echo "    --resource-group creditcard-rg \\"
    echo "    --follow"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}測試完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${YELLOW}除錯建議:${NC}"
    echo "  1. 確認後端服務正常運行"
    echo "  2. 檢查 ADMIN_TOKEN 是否有效且有 Admin 權限"
    echo "  3. 查看後端日誌了解詳細錯誤信息"
    echo "  4. 確認資料庫中有需要檢查的福利資料"
    echo "  5. 檢查 Web Push 相關環境變數是否正確設定"
    echo ""
fi
