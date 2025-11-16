#!/bin/bash

# 檢查 Logic Apps 狀態和下次執行時間

set -e

RESOURCE_GROUP="creditcard-rg"

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Logic Apps 執行狀態查詢${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 檢查第一個 Logic App
echo -e "${YELLOW}📋 Logic App: creditcard-check-expiring${NC}"
echo -e "${BLUE}----------------------------------------${NC}"

# 獲取 workflow 狀態
WORKFLOW_INFO=$(az logic workflow show \
  --resource-group "$RESOURCE_GROUP" \
  --name "creditcard-check-expiring" \
  --query "{state:state,createdTime:createdTime,changedTime:changedTime}" \
  -o json 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "$WORKFLOW_INFO" | jq -r '"狀態: " + .state'
    echo "$WORKFLOW_INFO" | jq -r '"建立時間: " + .createdTime'
    echo "$WORKFLOW_INFO" | jq -r '"最後修改: " + .changedTime'
    
    # 獲取觸發器資訊
    echo ""
    echo -e "${YELLOW}⏰ 觸發器設定:${NC}"
    TRIGGER_INFO=$(az logic workflow show \
      --resource-group "$RESOURCE_GROUP" \
      --name "creditcard-check-expiring" \
      --query "definition.triggers.Recurrence.recurrence" \
      -o json)
    
    echo "$TRIGGER_INFO" | jq -r '"頻率: 每 " + (.interval|tostring) + " " + .frequency'
    echo "$TRIGGER_INFO" | jq -r '"執行時間: " + (.schedule.hours[0]|tostring) + ":00"'
    echo "$TRIGGER_INFO" | jq -r '"時區: " + .timeZone'
    
    # 獲取最近的執行歷史
    echo ""
    echo -e "${YELLOW}📊 最近執行記錄 (最多 5 筆):${NC}"
    RUNS=$(az logic workflow run list \
      --resource-group "$RESOURCE_GROUP" \
      --name "creditcard-check-expiring" \
      --top 5 \
      --query "[].{name:name,status:status,startTime:startTime,endTime:endTime}" \
      -o json 2>/dev/null)
    
    if [ "$RUNS" != "[]" ] && [ "$RUNS" != "" ]; then
        echo "$RUNS" | jq -r '.[] | "  • " + .startTime + " - " + .status'
    else
        echo "  尚無執行記錄"
    fi
    
    # 計算下次執行時間（概算）
    echo ""
    echo -e "${YELLOW}⏭️  下次執行時間 (預估):${NC}"
    HOUR=$(echo "$TRIGGER_INFO" | jq -r '.schedule.hours[0]')
    TIMEZONE=$(echo "$TRIGGER_INFO" | jq -r '.timeZone')
    echo "  每天 ${HOUR}:00 (${TIMEZONE})"
    
    # 如果有執行記錄，顯示最後一次執行時間
    LAST_RUN=$(echo "$RUNS" | jq -r '.[0].startTime // empty')
    if [ ! -z "$LAST_RUN" ]; then
        echo "  最後執行: $LAST_RUN"
    fi
else
    echo "❌ Logic App 不存在或無法存取"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo ""

# 檢查第二個 Logic App
echo -e "${YELLOW}📋 Logic App: creditcard-archive-expired${NC}"
echo -e "${BLUE}----------------------------------------${NC}"

WORKFLOW_INFO2=$(az logic workflow show \
  --resource-group "$RESOURCE_GROUP" \
  --name "creditcard-archive-expired" \
  --query "{state:state,createdTime:createdTime,changedTime:changedTime}" \
  -o json 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "$WORKFLOW_INFO2" | jq -r '"狀態: " + .state'
    echo "$WORKFLOW_INFO2" | jq -r '"建立時間: " + .createdTime'
    echo "$WORKFLOW_INFO2" | jq -r '"最後修改: " + .changedTime'
    
    echo ""
    echo -e "${YELLOW}⏰ 觸發器設定:${NC}"
    TRIGGER_INFO2=$(az logic workflow show \
      --resource-group "$RESOURCE_GROUP" \
      --name "creditcard-archive-expired" \
      --query "definition.triggers.Recurrence.recurrence" \
      -o json)
    
    echo "$TRIGGER_INFO2" | jq -r '"頻率: 每 " + (.interval|tostring) + " " + .frequency'
    echo "$TRIGGER_INFO2" | jq -r '"執行時間: " + (.schedule.hours[0]|tostring) + ":00"'
    echo "$TRIGGER_INFO2" | jq -r '"時區: " + .timeZone'
    
    echo ""
    echo -e "${YELLOW}📊 最近執行記錄 (最多 5 筆):${NC}"
    RUNS2=$(az logic workflow run list \
      --resource-group "$RESOURCE_GROUP" \
      --name "creditcard-archive-expired" \
      --top 5 \
      --query "[].{name:name,status:status,startTime:startTime,endTime:endTime}" \
      -o json 2>/dev/null)
    
    if [ "$RUNS2" != "[]" ] && [ "$RUNS2" != "" ]; then
        echo "$RUNS2" | jq -r '.[] | "  • " + .startTime + " - " + .status'
    else
        echo "  尚無執行記錄"
    fi
    
    echo ""
    echo -e "${YELLOW}⏭️  下次執行時間 (預估):${NC}"
    HOUR2=$(echo "$TRIGGER_INFO2" | jq -r '.schedule.hours[0]')
    TIMEZONE2=$(echo "$TRIGGER_INFO2" | jq -r '.timeZone')
    echo "  每天 ${HOUR2}:00 (${TIMEZONE2})"
    
    LAST_RUN2=$(echo "$RUNS2" | jq -r '.[0].startTime // empty')
    if [ ! -z "$LAST_RUN2" ]; then
        echo "  最後執行: $LAST_RUN2"
    fi
else
    echo "❌ Logic App 不存在或無法存取"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}💡 提示:${NC}"
echo "  - 查看詳細執行記錄: Azure Portal > Logic Apps > Runs history"
echo "  - 手動觸發測試執行: az logic workflow run trigger --resource-group $RESOURCE_GROUP --name creditcard-check-expiring --trigger-name Recurrence"
echo "  - 檢視特定執行的詳細資訊: az logic workflow run show --resource-group $RESOURCE_GROUP --name <workflow-name> --run-name <run-name>"
echo ""
