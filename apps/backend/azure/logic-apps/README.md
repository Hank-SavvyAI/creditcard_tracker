# Azure Logic Apps - 定時任務設定

使用 Azure Logic Apps 取代 node-cron，提供更可靠的定時任務執行。

## 📋 前置準備

### 1. 產生 Admin Token

你需要一個永久的 Admin JWT token 來讓 Logic Apps 呼叫 API。有兩種方式：

#### 方式 A: 從現有 Admin 使用者產生（推薦）

1. 登入 admin 帳號並從瀏覽器 localStorage 取得 token
2. 或使用以下 Node.js 腳本產生：

```javascript
// scripts/generate-admin-token.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const adminUser = {
  id: 1,  // 你的 admin user ID
  role: 'ADMIN'
};

// 產生一個 10 年有效期的 token（或設定為不過期）
const token = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '10y' });

console.log('Admin Token:');
console.log(token);
```

執行：
```bash
cd apps/backend
node scripts/generate-admin-token.js
```

#### 方式 B: 建立專用的 API Key 系統（未來改進）

可以考慮在資料庫新增 `ApiKey` table，為 Logic Apps 建立專用的 API key。

### 2. 安裝 Azure CLI

```bash
# macOS
brew install azure-cli

# 或下載安裝程式
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
```

### 3. 登入 Azure

```bash
az login
```

## 🚀 部署步驟

### 步驟 1: 設定 Admin Token

```bash
# 將你產生的 token 設定為環境變數
export ADMIN_TOKEN='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiaWF0IjoxNzYzMzA5Mzk1LCJleHAiOjIwNzg4ODUzOTV9.h5hLf6n4muhznjoRYF7_1Pc_aTVRN00RzLWIbqlTwwk'
export BACKEND_URL=https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io

envsubst < check-expiring-benefits.json > check-expiring-benefits-final.json
```

### 步驟 2: 執行部署腳本

```bash
cd apps/backend/azure/logic-apps
./deploy-logic-apps.sh
```

這會建立兩個 Logic Apps：
- `creditcard-check-expiring`: 每天 9:00 AM 檢查到期福利
- `creditcard-archive-expired`: 每天 2:00 AM 歸檔過期福利

### 步驟 3: 在 Container App 中停用 node-cron

```bash
az containerapp update \
  --name creditcard-backend \
  --resource-group creditcard-rg \
  --set-env-vars ENABLE_CRON=false
```

## 📊 驗證部署

### 1. 檢查 Logic Apps 狀態

```bash
# 列出所有 Logic Apps
az logic workflow list \
  --resource-group creditcard-rg \
  --output table

# 查看特定 Logic App 的詳細資訊
az logic workflow show \
  --resource-group creditcard-rg \
  --name creditcard-check-expiring
```

### 2. 查看執行歷史

在 Azure Portal 查看：
https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/Microsoft.Logic%2Fworkflows

或使用 CLI：

```bash
# 列出執行記錄
az logic workflow run list \
  --resource-group creditcard-rg \
  --workflow-name creditcard-check-expiring \
  --output table

# 查看特定執行的詳細資訊
az logic workflow run show \
  --resource-group creditcard-rg \
  --workflow-name creditcard-check-expiring \
  --name <run-id>
```

### 3. 手動觸發測試

```bash
# 手動執行 Logic App
az logic workflow trigger run \
  --resource-group creditcard-rg \
  --workflow-name creditcard-check-expiring \
  --trigger-name Recurrence
```

## 🔧 更新 Logic Apps

### 更新排程時間

編輯 JSON 檔案中的 `schedule` 部分，然後重新部署：

```bash
./deploy-logic-apps.sh
```

### 更新 Backend URL

如果你的後端 URL 改變了：

```bash
az logic workflow update \
  --resource-group creditcard-rg \
  --name creditcard-check-expiring \
  --parameters "{\"backendUrl\":{\"value\":\"https://new-url.com\"}}"
```

### 更新 Admin Token

```bash
export NEW_ADMIN_TOKEN='new-token-here'

az logic workflow update \
  --resource-group creditcard-rg \
  --name creditcard-check-expiring \
  --parameters "{\"adminToken\":{\"value\":\"$NEW_ADMIN_TOKEN\"}}"
```

## 🗑️ 刪除 Logic Apps

如果需要移除 Logic Apps：

```bash
# 刪除檢查到期福利的 Logic App
az logic workflow delete \
  --resource-group creditcard-rg \
  --name creditcard-check-expiring \
  --yes

# 刪除歸檔過期福利的 Logic App
az logic workflow delete \
  --resource-group creditcard-rg \
  --name creditcard-archive-expired \
  --yes
```

## 💰 費用

Azure Logic Apps 免費層級：
- 每月前 4,000 次執行：免費
- 每天 2 次執行 × 30 天 = 60 次/月
- **完全免費！**

詳細定價：https://azure.microsoft.com/pricing/details/logic-apps/

## 🔍 故障排除

### Logic App 執行失敗

1. 檢查執行歷史中的錯誤訊息
2. 確認 Backend URL 正確
3. 確認 Admin Token 有效且未過期
4. 檢查 Container App 是否正在運行

### 時區問題

Logic Apps 使用 `Asia/Taipei` 時區，確保排程時間正確。

### Token 過期

如果 token 過期，需要重新產生並更新 Logic Apps 參數。

## 📝 環境變數設定總結

在 Azure Container App 中設定：

```bash
ENABLE_CRON=false
```

這會停用 node-cron，改用 Logic Apps 來觸發定時任務。
