#!/bin/bash

# Azure Logic Apps 部署腳本
# 用於建立定時任務來取代 node-cron

set -e

# 設定變數
RESOURCE_GROUP="creditcard-rg"
LOCATION="japaneast"
BACKEND_URL="https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署 Azure Logic Apps (定時任務)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 檢查是否已登入 Azure
echo -e "${YELLOW}檢查 Azure CLI 登入狀態...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${RED}尚未登入 Azure CLI，請先執行: az login${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 已登入 Azure${NC}"
echo ""

# 檢查 Admin Token
if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}錯誤: 請設定 ADMIN_TOKEN 環境變數${NC}"
    echo -e "${YELLOW}方法 1: 從現有的 admin user 產生 JWT token${NC}"
    echo -e "${YELLOW}方法 2: 使用以下指令設定:${NC}"
    echo -e "${YELLOW}  export ADMIN_TOKEN='your-admin-jwt-token'${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Admin Token 已設定${NC}"
echo ""

# 1. 建立 Logic App - 檢查到期福利 (每天上午 9:00 PST)
echo -e "${YELLOW}建立 Logic App: check-expiring-benefits${NC}"

# 生成 workflow definition (使用 Pacific Standard Time)
DEFINITION_JSON=$(cat <<EOF
{
  "definition": {
    "\$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {},
    "triggers": {
      "Recurrence": {
        "type": "Recurrence",
        "recurrence": {
          "frequency": "Day",
          "interval": 1,
          "schedule": {
            "hours": ["9"],
            "minutes": [0]
          },
          "timeZone": "Pacific Standard Time"
        }
      }
    },
    "actions": {
      "HTTP_Check_Expiring_Benefits": {
        "type": "Http",
        "inputs": {
          "method": "POST",
          "uri": "${BACKEND_URL}/api/admin/manual/check-expiring-benefits",
          "headers": {
            "Authorization": "Bearer ${ADMIN_TOKEN}",
            "Content-Type": "application/json"
          }
        },
        "runAfter": {}
      },
      "Log_Response": {
        "type": "Compose",
        "inputs": {
          "timestamp": "@{utcNow()}",
          "status": "@{outputs('HTTP_Check_Expiring_Benefits')['statusCode']}",
          "body": "@{body('HTTP_Check_Expiring_Benefits')}"
        },
        "runAfter": {
          "HTTP_Check_Expiring_Benefits": ["Succeeded", "Failed"]
        }
      },
      "Condition_Check_Failed": {
        "type": "If",
        "expression": {
          "or": [
            {
              "equals": [
                "@outputs('HTTP_Check_Expiring_Benefits')['statusCode']",
                500
              ]
            },
            {
              "equals": [
                "@outputs('HTTP_Check_Expiring_Benefits')['statusCode']",
                401
              ]
            }
          ]
        },
        "actions": {
          "Terminate_Failed": {
            "type": "Terminate",
            "inputs": {
              "runStatus": "Failed",
              "runError": {
                "code": "@{outputs('HTTP_Check_Expiring_Benefits')['statusCode']}",
                "message": "Failed to check expiring benefits"
              }
            }
          }
        },
        "runAfter": {
          "Log_Response": ["Succeeded"]
        }
      }
    },
    "outputs": {}
  }
}
EOF
)

az logic workflow create \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --name "creditcard-check-expiring" \
  --definition "$DEFINITION_JSON"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Logic App 建立成功: check-expiring-benefits${NC}"
else
    echo -e "${RED}✗ Logic App 建立失敗: check-expiring-benefits${NC}"
fi
echo ""

# 2. 建立 Logic App - 歸檔過期福利 (每天凌晨 2:00 PST)
echo -e "${YELLOW}建立 Logic App: archive-expired-benefits${NC}"

ARCHIVE_DEFINITION_JSON=$(cat <<EOF
{
  "definition": {
    "\$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {},
    "triggers": {
      "Recurrence": {
        "type": "Recurrence",
        "recurrence": {
          "frequency": "Day",
          "interval": 1,
          "schedule": {
            "hours": ["2"],
            "minutes": [0]
          },
          "timeZone": "Pacific Standard Time"
        }
      }
    },
    "actions": {
      "HTTP_Archive_Expired_Benefits": {
        "type": "Http",
        "inputs": {
          "method": "POST",
          "uri": "${BACKEND_URL}/api/admin/manual/archive-expired-benefits",
          "headers": {
            "Authorization": "Bearer ${ADMIN_TOKEN}",
            "Content-Type": "application/json"
          }
        },
        "runAfter": {}
      },
      "Log_Response": {
        "type": "Compose",
        "inputs": {
          "timestamp": "@{utcNow()}",
          "status": "@{outputs('HTTP_Archive_Expired_Benefits')['statusCode']}",
          "body": "@{body('HTTP_Archive_Expired_Benefits')}"
        },
        "runAfter": {
          "HTTP_Archive_Expired_Benefits": ["Succeeded", "Failed"]
        }
      },
      "Condition_Check_Failed": {
        "type": "If",
        "expression": {
          "or": [
            {
              "equals": [
                "@outputs('HTTP_Archive_Expired_Benefits')['statusCode']",
                500
              ]
            },
            {
              "equals": [
                "@outputs('HTTP_Archive_Expired_Benefits')['statusCode']",
                401
              ]
            }
          ]
        },
        "actions": {
          "Terminate_Failed": {
            "type": "Terminate",
            "inputs": {
              "runStatus": "Failed",
              "runError": {
                "code": "@{outputs('HTTP_Archive_Expired_Benefits')['statusCode']}",
                "message": "Failed to archive expired benefits"
              }
            }
          }
        },
        "runAfter": {
          "Log_Response": ["Succeeded"]
        }
      }
    },
    "outputs": {}
  }
}
EOF
)

az logic workflow create \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --name "creditcard-archive-expired" \
  --definition "$ARCHIVE_DEFINITION_JSON"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Logic App 建立成功: archive-expired-benefits${NC}"
else
    echo -e "${RED}✗ Logic App 建立失敗: archive-expired-benefits${NC}"
fi
echo ""

# 3. 顯示部署狀態
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}已建立的 Logic Apps (PST 時區):${NC}"
echo -e "  1. creditcard-check-expiring (每天 9:00 AM PST)"
echo -e "  2. creditcard-archive-expired (每天 2:00 AM PST)"
echo ""
echo -e "${YELLOW}執行時間換算 (參考):${NC}"
echo -e "  PST 夏令時間 (3月-11月): UTC-7"
echo -e "  PST 冬令時間 (11月-3月): UTC-8"
echo -e "  - 9:00 AM PST ≈ 台灣時間晚上 12:00 AM 或 1:00 AM"
echo -e "  - 2:00 AM PST ≈ 台灣時間下午 5:00 PM 或 6:00 PM"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo -e "  1. 在 Azure Container App 中設定環境變數:"
echo -e "     ${GREEN}ENABLE_CRON=false${NC}"
echo -e ""
echo -e "  2. 使用以下指令更新 Container App:"
echo -e "     ${GREEN}az containerapp update \\${NC}"
echo -e "       ${GREEN}--name creditcard-backend \\${NC}"
echo -e "       ${GREEN}--resource-group creditcard-rg \\${NC}"
echo -e "       ${GREEN}--set-env-vars ENABLE_CRON=false${NC}"
echo ""
echo -e "${YELLOW}查看 Logic Apps 執行歷史:${NC}"
echo -e "  ${GREEN}az logic workflow show \\${NC}"
echo -e "    ${GREEN}--resource-group $RESOURCE_GROUP \\${NC}"
echo -e "    ${GREEN}--name creditcard-check-expiring${NC}"
echo ""
echo -e "${YELLOW}手動觸發測試 (可選):${NC}"
echo -e "  ${GREEN}./manual-trigger.sh${NC}"
echo -e "  或透過 Azure Portal 手動執行"
echo ""
echo -e "${YELLOW}或在 Azure Portal 查看:${NC}"
echo -e "  https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/Microsoft.Logic%2Fworkflows"
echo ""
