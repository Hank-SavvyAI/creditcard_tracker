# Azure 部署指南

本指南說明如何將後端 Docker image 部署到 Azure。

## 方案選擇

### 1. Azure Container Apps - 推薦
最現代的容器部署方案，類似 AWS App Runner。

### 2. Azure App Service (Container)
傳統 PaaS 方式部署容器。

### 3. Azure Container Instances (ACI)
最簡單的容器部署，適合小規模應用。

### 4. Azure Kubernetes Service (AKS)
完整的 Kubernetes 方案，適合大規模應用。

---

## 前置準備

### 安裝 Azure CLI

```bash
# macOS
brew install azure-cli

# 登入 Azure
az login

# 設置訂閱（如果有多個）
az account set --subscription "Your Subscription Name"
```

### 註冊必要的 Azure Providers

**重要**: 首次使用需要註冊以下服務（只需執行一次）：

```bash
# 註冊所有需要的 providers（需要幾分鐘）
az provider register --namespace Microsoft.ContainerRegistry --wait
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait
az provider register --namespace Microsoft.ContainerInstance --wait

# 驗證註冊狀態
az provider list --query "[?namespace=='Microsoft.ContainerRegistry' || namespace=='Microsoft.App'].{Provider:namespace, State:registrationState}" --output table
```

預期輸出：
```
Provider                          State
--------------------------------  ----------
Microsoft.ContainerRegistry       Registered
Microsoft.App                     Registered
```

**注意**: 如果遇到 `MissingSubscriptionRegistration` 錯誤，請執行上述註冊命令。

---

## 方案 1: Azure Container Apps (推薦)

### 步驟 1: 創建資源群組

```bash
# 設置變數
RESOURCE_GROUP="creditcard-rg"
LOCATION="eastus"
CONTAINER_REGISTRY="creditcardregistry"
APP_NAME="creditcard-backend"

# 創建資源群組
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION
```

### 步驟 2: 創建 Container Registry (ACR)

```bash
# 創建 ACR
az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $CONTAINER_REGISTRY \
    --sku Basic \
    --admin-enabled true

# 登入 ACR
az acr login --name $CONTAINER_REGISTRY
```

### 步驟 3: 建置並推送 Image

**重要**: Dockerfile 使用 **Debian Bullseye** 基礎映像以確保 Prisma 和 OpenSSL 1.1 相容性。

```bash
# 進入 backend 目錄
cd apps/backend

# 建置 image（指定 linux/amd64 平台和 Dockerfile 路徑，重要！）
docker build --platform linux/amd64 --no-cache -f docker/Dockerfile -t creditcard-tracker-backend:latest .

# Tag image
docker tag creditcard-tracker-backend:latest \
    $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:latest

# 推送到 ACR
docker push $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:latest
```

**技術細節**:
- 使用 `node:20-bullseye-slim` 確保 OpenSSL 1.1 可用
- Prisma schema 指定 `binaryTargets = ["native", "debian-openssl-1.1.x"]`
- 必須使用 `--platform linux/amd64` 在 Mac ARM64 上建置 AMD64 image

### 步驟 4: 創建 Container Apps Environment

```bash
# 安裝 Container Apps extension
az extension add --name containerapp --upgrade

# 創建 Container Apps Environment
az containerapp env create \
    --name creditcard-env \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION
```

### 步驟 5: 部署 Container App

```bash
# 獲取 ACR 憑證（注意：zsh 需要用引號包住 query）
ACR_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY --query 'passwords[0].value' -o tsv)

# 創建 Container App（僅基本環境變數）
az containerapp create \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment creditcard-env \
    --image $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:latest \
    --registry-server $CONTAINER_REGISTRY.azurecr.io \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --target-port 8443 \
    --ingress external \
    --cpu 0.5 \
    --memory 1.0Gi \
    --min-replicas 1 \
    --max-replicas 3 \
    --env-vars \
        NODE_ENV=production \
        PORT=8443

# 重要：創建後需要設置完整的環境變數（見步驟 6）
```

### 步驟 6: 設置環境變數和機密

**方法 A: 直接設置環境變數（簡單快速，適合開發/測試）**

```bash
# 一次設置所有環境變數
az containerapp update --name $APP_NAME --resource-group $RESOURCE_GROUP \
  --set-env-vars \
    "DATABASE_URL=postgresql://user:password@host:5432/database?pgbouncer=true" \
    "JWT_SECRET=your-super-secret-jwt-key" \
    "PORT=8443" \
    "NODE_ENV=production" \
    "FRONTEND_URL=https://your-frontend-domain.com" \
    "SKIP_AUTH=false" \
    "BOT_TOKEN=your-telegram-bot-token" \
    "BOT_USERNAME=your-bot-username" \
    "GOOGLE_CLIENT_ID=your-google-client-id" \
    "GOOGLE_CLIENT_SECRET=your-google-client-secret" \
    "GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/auth/google/callback" \
    "VAPID_PUBLIC_KEY=your-vapid-public-key" \
    "VAPID_PRIVATE_KEY=your-vapid-private-key" \
    "VAPID_SUBJECT=mailto:your-email@example.com" \
    "EMAIL_USER=your-email@gmail.com" \
    "EMAIL_PASSWORD=your-gmail-app-password"

# 驗證環境變數
az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP \
  --query "properties.template.containers[0].env" -o table
```

**方法 B: 使用 Azure Key Vault（推薦生產環境）**

```bash
# 使用 Azure Key Vault 儲存機密
az keyvault create \
    --name creditcard-kv \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION

# 儲存機密
az keyvault secret set \
    --vault-name creditcard-kv \
    --name DATABASE-URL \
    --value "postgresql://..."

az keyvault secret set \
    --vault-name creditcard-kv \
    --name JWT-SECRET \
    --value "your-secret"

# 更新 Container App 使用機密
az containerapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --set-env-vars \
        "DATABASE_URL=secretref:database-url" \
        "JWT_SECRET=secretref:jwt-secret" \
    --secrets \
        "database-url=keyvaultref:https://creditcard-kv.vault.azure.net/secrets/DATABASE-URL,identityref:system" \
        "jwt-secret=keyvaultref:https://creditcard-kv.vault.azure.net/secrets/JWT-SECRET,identityref:system"
```

### 步驟 7: 設置自動縮放規則（節省成本）⭐

**重要**: 設置縮放到 0 可以大幅降低成本（無流量時不收費）

```bash
# 設置 HTTP 自動縮放（可縮到 0）
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 0 \
  --max-replicas 5 \
  --scale-rule-name http-scale \
  --scale-rule-type http \
  --scale-rule-http-concurrency 100

# 驗證縮放設定
az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP \
  --query "properties.template.scale" -o json
```

**調整 cooldown 期間（進階設定）**:

cooldownPeriod 無法透過命令行直接設定，需要使用 YAML 配置：

```bash
# 創建縮放配置 YAML
cat > scale-config.yaml << 'EOF'
properties:
  template:
    scale:
      minReplicas: 0
      maxReplicas: 5
      cooldownPeriod: 120  # 縮小前等待 2 分鐘（預設 300 秒）
      rules:
        - name: http-scale
          http:
            metadata:
              concurrentRequests: "100"
EOF

# 套用配置
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --yaml scale-config.yaml
```

**縮放行為說明**:
- **無流量**: 5 分鐘後自動縮到 0 個實例（完全不收費）✅
- **1-100 並發請求**: 自動啟動 1 個實例
- **101-200 並發請求**: 自動擴展到 2 個實例
- **最多**: 5 個實例
- **冷啟動時間**: 3-10 秒（第一個請求會稍慢）

**成本估算**（假設每天活躍 4 小時）:
```
每月約 $6-8（比固定運行便宜 83%）
```

**如果不想縮到 0**（保持快速回應）:
```bash
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 1 \
  --max-replicas 5
```

### 步驟 8: 啟用 Managed Identity 和設置權限（選用）
```bash
# 一次註冊所有需要的 providers
az provider register --namespace Microsoft.ContainerRegistry --wait
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait
az provider register --namespace Microsoft.ContainerInstance --wait

# 驗證註冊完成
az provider list --query "[?namespace=='Microsoft.ContainerRegistry'].{Provider:namespace, State:registrationState}" --output table
```
```bash
# 啟用系統指派的 Managed Identity
az containerapp identity assign \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --system-assigned

# 獲取 Identity ID
IDENTITY_ID=$(az containerapp identity show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query principalId -o tsv)

# 授予 Key Vault 權限
az keyvault set-policy \
    --name creditcard-kv \
    --object-id $IDENTITY_ID \
    --secret-permissions get list
```

---

## 方案 2: Azure App Service (Container)

### 步驟 1-3: 同上（創建資源、ACR、推送 image）

### 步驟 4: 創建 App Service Plan

```bash
az appservice plan create \
    --name creditcard-plan \
    --resource-group $RESOURCE_GROUP \
    --is-linux \
    --sku B1
```

### 步驟 5: 創建 Web App

```bash
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan creditcard-plan \
    --name creditcard-backend-app \
    --deployment-container-image-name $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:latest
```

### 步驟 6: 配置 Web App

```bash
# 設置 ACR 憑證
az webapp config container set \
    --name creditcard-backend-app \
    --resource-group $RESOURCE_GROUP \
    --docker-custom-image-name $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:latest \
    --docker-registry-server-url https://$CONTAINER_REGISTRY.azurecr.io \
    --docker-registry-server-user $ACR_USERNAME \
    --docker-registry-server-password $ACR_PASSWORD

# 設置環境變數
az webapp config appsettings set \
    --name creditcard-backend-app \
    --resource-group $RESOURCE_GROUP \
    --settings \
        NODE_ENV=production \
        PORT=8443 \
        WEBSITES_PORT=8443 \
        DATABASE_URL="@Microsoft.KeyVault(SecretUri=https://creditcard-kv.vault.azure.net/secrets/DATABASE-URL/)" \
        JWT_SECRET="@Microsoft.KeyVault(SecretUri=https://creditcard-kv.vault.azure.net/secrets/JWT-SECRET/)"
```

---

## 方案 3: Azure Container Instances (ACI) - 最簡單

### 步驟 1-3: 同上（創建資源、ACR、推送 image）

### 步驟 4: 創建 Container Instance

```bash
az container create \
    --resource-group $RESOURCE_GROUP \
    --name creditcard-backend-aci \
    --image $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:latest \
    --registry-login-server $CONTAINER_REGISTRY.azurecr.io \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --dns-name-label creditcard-backend \
    --ports 8443 \
    --cpu 1 \
    --memory 1.5 \
    --environment-variables \
        NODE_ENV=production \
        PORT=8443 \
    --secure-environment-variables \
        DATABASE_URL="postgresql://..." \
        JWT_SECRET="your-secret"
```

---

## 使用 YAML 配置文件部署

創建 `azure-containerapp.yaml`:

```yaml
properties:
  configuration:
    activeRevisionsMode: Single
    ingress:
      external: true
      targetPort: 8443
      transport: auto
      traffic:
        - weight: 100
          latestRevision: true
    registries:
      - server: creditcardregistry.azurecr.io
        username: creditcardregistry
        passwordSecretRef: acr-password
    secrets:
      - name: acr-password
        value: "your-acr-password"
      - name: database-url
        value: "postgresql://..."
      - name: jwt-secret
        value: "your-jwt-secret"
  template:
    containers:
      - image: creditcardregistry.azurecr.io/creditcard-tracker-backend:latest
        name: creditcard-backend
        resources:
          cpu: 0.5
          memory: 1.0Gi
        env:
          - name: NODE_ENV
            value: production
          - name: PORT
            value: "8443"
          - name: DATABASE_URL
            secretRef: database-url
          - name: JWT_SECRET
            secretRef: jwt-secret
    scale:
      minReplicas: 1
      maxReplicas: 3
```

部署:
```bash
az containerapp create \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment creditcard-env \
    --yaml azure-containerapp.yaml
```

---

## CI/CD with GitHub Actions

創建 `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]
    paths:
      - 'apps/backend/**'

env:
  AZURE_CONTAINERAPP_NAME: creditcard-backend
  RESOURCE_GROUP: creditcard-rg
  CONTAINER_REGISTRY: creditcardregistry

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Log in to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Log in to ACR
        run: az acr login --name ${{ env.CONTAINER_REGISTRY }}

      - name: Build and push image
        working-directory: ./apps/backend
        run: |
          docker build -t ${{ env.CONTAINER_REGISTRY }}.azurecr.io/creditcard-tracker-backend:${{ github.sha }} .
          docker push ${{ env.CONTAINER_REGISTRY }}.azurecr.io/creditcard-tracker-backend:${{ github.sha }}

      - name: Deploy to Container App
        run: |
          az containerapp update \
            --name ${{ env.AZURE_CONTAINERAPP_NAME }} \
            --resource-group ${{ env.RESOURCE_GROUP }} \
            --image ${{ env.CONTAINER_REGISTRY }}.azurecr.io/creditcard-tracker-backend:${{ github.sha }}
```

---

## 監控和測試

### 監控 Replica 數量（縮放狀態）

**檢查當前運行的 replicas**:
```bash
# 列出所有 revisions
az containerapp revision list \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "[].{Name:name,Active:properties.active,Replicas:properties.replicas,Created:properties.createdTime}" \
    -o table

# 檢查特定 revision 的 replicas（替換為你的 revision 名稱）
az containerapp replica list \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --revision creditcard-backend--0000002 \
    --query "[].{Name:name,Status:properties.runningState,Created:properties.createdTime}" \
    -o table
```

**即時監控縮放行為**:
```bash
# 持續監控 replicas（每 10 秒刷新一次）
watch -n 10 "az containerapp replica list \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --revision \$(az containerapp revision list --name $APP_NAME --resource-group $RESOURCE_GROUP --query '[0].name' -o tsv) \
    -o table"
```

**查看縮放設定**:
```bash
# 檢查當前的縮放配置
az containerapp show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "properties.template.scale" \
    -o json
```

預期輸出（縮到 0 的設定）:
```json
{
  "cooldownPeriod": 300,
  "maxReplicas": 5,
  "minReplicas": 0,
  "pollingInterval": 30,
  "rules": [
    {
      "http": {
        "metadata": {
          "concurrentRequests": "100"
        }
      },
      "name": "http-scale"
    }
  ]
}
```

### 測試自動縮放行為

**測試 1: 驗證冷啟動（從 0 啟動）**

```bash
# 步驟 1: 等待 container 縮到 0（需要 5 分鐘無流量）
echo "等待 5-10 分鐘讓 container 完全關閉..."
sleep 360

# 步驟 2: 檢查 replica 數量（應該是 0）
az containerapp replica list \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --revision $(az containerapp revision list --name $APP_NAME --resource-group $RESOURCE_GROUP --query '[0].name' -o tsv) \
    -o table

# 步驟 3: 發送測試請求（觸發冷啟動）
echo "發送測試請求..."
time curl -s https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io/health

# 步驟 4: 再次檢查 replica 數量（應該變成 1）
az containerapp replica list \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --revision $(az containerapp revision list --name $APP_NAME --resource-group $RESOURCE_GROUP --query '[0].name' -o tsv) \
    -o table
```

**預期結果**:
- 冷啟動時間: 3-10 秒
- 後續請求: < 1 秒

**測試 2: 壓力測試（觸發擴展）**

使用 `ab`（Apache Bench）或 `hey` 進行壓力測試:

```bash
# 安裝 hey（如果沒有）
# macOS: brew install hey
# Linux: go install github.com/rakyll/hey@latest

# 發送 1000 個請求，100 個並發
hey -n 1000 -c 100 https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io/health

# 在另一個終端監控 replicas
watch -n 2 "az containerapp replica list \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --revision $(az containerapp revision list --name $APP_NAME --resource-group $RESOURCE_GROUP --query '[0].name' -o tsv) \
    --query 'length(@)' -o tsv"
```

**預期行為**:
- 100 並發請求 → 應該保持 1 replica（設定是 100）
- 200 並發請求 → 應該擴展到 2 replicas
- 壓力測試結束後 5 分鐘 → 自動縮回 0 replicas

### 如何判斷冷啟動 vs 熱啟動

**冷啟動** = Container 從 0 啟動
**熱啟動** = Container 已經在運行中

#### 方法 1: 透過回應時間判斷（最簡單）⭐

| 啟動類型 | 回應時間 | 說明 |
|---------|---------|------|
| **冷啟動** | > 3 秒 | ❄️ Container 從 0 啟動 |
| **溫啟動** | 1-3 秒 | 🌡️ Container 正在初始化 |
| **熱啟動** | < 1 秒 | 🔥 Container 已就緒 |

**測試腳本**:
```bash
# 測量回應時間
RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io/health)

echo "回應時間: ${RESPONSE_TIME}s"

if (( $(echo "$RESPONSE_TIME > 3.0" | bc -l) )); then
    echo "❄️ 冷啟動（從 0 啟動）"
elif (( $(echo "$RESPONSE_TIME > 1.0" | bc -l) )); then
    echo "🌡️ 溫啟動（container 正在初始化）"
else
    echo "🔥 熱啟動（container 已就緒）"
fi
```

**實測範例**:
```bash
# 測試 1: 冷啟動（container 從 0 啟動）
$ time curl -s https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io/health
{"status":"ok","timestamp":"2025-10-31T21:31:41.777Z"}
0.01s user 0.01s system 0% cpu 18.617 total  # ❄️ 18.6 秒 = 冷啟動

# 測試 2: 熱啟動（container 已運行）
$ time curl -s https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io/health
{"status":"ok","timestamp":"2025-10-31T21:31:51.965Z"}
0.01s user 0.00s system 4% cpu 0.252 total   # 🔥 0.25 秒 = 熱啟動
```

#### 方法 2: 透過 Replica 數量判斷

```bash
# 檢查請求前的 replica 數量
BEFORE=$(az containerapp replica list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --revision $(az containerapp revision list --name $APP_NAME --resource-group $RESOURCE_GROUP --query '[0].name' -o tsv) \
  --query 'length(@)' -o tsv)

echo "請求前 replicas: $BEFORE"

# 發送請求
curl -s https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io/health

# 等待 5 秒
sleep 5

# 檢查請求後的 replica 數量
AFTER=$(az containerapp replica list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --revision $(az containerapp revision list --name $APP_NAME --resource-group $RESOURCE_GROUP --query '[0].name' -o tsv) \
  --query 'length(@)' -o tsv)

echo "請求後 replicas: $AFTER"

# 判斷
if [ "$BEFORE" -eq 0 ] && [ "$AFTER" -gt 0 ]; then
    echo "❄️ 冷啟動（0 → $AFTER）"
elif [ "$BEFORE" -eq "$AFTER" ]; then
    echo "🔥 熱啟動（已運行）"
else
    echo "📈 擴展中（$BEFORE → $AFTER）"
fi
```

#### 方法 3: 透過日誌判斷

```bash
# 查看最近的日誌
az containerapp logs show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --tail 20 \
  --follow false | grep -E "Database connected|Server running"

# 如果看到這些訊息，表示 container 剛啟動（冷啟動）:
# ✅ Database connected
# 🚀 Server running on port 8443
```

**判斷邏輯**:
- 看到啟動訊息 + 時間戳在最近 30 秒內 = **冷啟動**
- 沒有新的啟動訊息 = **熱啟動**

#### 方法 4: 在程式中加入啟動標記（進階）

在 backend 程式中加入啟動時間：

```typescript
// apps/backend/src/index.ts
const SERVER_START_TIME = Date.now();

app.get('/health', (req, res) => {
  const uptime = Date.now() - SERVER_START_TIME;
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: uptime, // 毫秒
    isColdStart: uptime < 30000 // 啟動少於 30 秒 = 冷啟動
  });
});
```

測試：
```bash
$ curl https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io/health | jq
{
  "status": "ok",
  "timestamp": "2025-10-31T21:31:51.965Z",
  "uptime": 5234,
  "isColdStart": true  # ✅ 這個 container 剛啟動
}
```

**測試 3: 手動觸發縮放**

```bash
# 強制重啟（會重新計算 replicas）
az containerapp revision restart \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --revision $(az containerapp revision list --name $APP_NAME --resource-group $RESOURCE_GROUP --query '[0].name' -o tsv)

# 或創建新的 revision（觸發重新部署）
az containerapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --revision-suffix $(date +%Y%m%d-%H%M%S)
```

### 查看日誌

**即時日誌（推薦）**:
```bash
# Container Apps - 即時串流日誌
az containerapp logs show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --tail 50 \
    --follow

# 只顯示最近 50 行
az containerapp logs show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --tail 50 \
    --follow false
```

**其他平台**:
```bash
# App Service
az webapp log tail \
    --name creditcard-backend-app \
    --resource-group $RESOURCE_GROUP

# Container Instances
az container logs \
    --resource-group $RESOURCE_GROUP \
    --name creditcard-backend-aci \
    --follow
```

**分析日誌（找出錯誤）**:
```bash
# 顯示包含 "error" 或 "failed" 的日誌
az containerapp logs show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --tail 200 \
    --follow false | grep -i "error\|failed"

# 顯示 Prisma 相關日誌
az containerapp logs show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --tail 200 \
    --follow false | grep -i "prisma\|database"
```

### 成本監控

**查看當前月份的估算成本**:
```bash
# 查看 Container Apps 成本
az consumption usage list \
    --start-date $(date -u -d "1 month ago" '+%Y-%m-%d') \
    --end-date $(date -u '+%Y-%m-%d') \
    | jq '[.[] | select(.instanceName | contains("creditcard-backend"))] | .[0]'

# 或使用 Azure Portal 查看:
# https://portal.azure.com/#blade/Microsoft_Azure_CostManagement/Menu/costanalysis
```

**計算實際運行時間**:
```bash
# 顯示過去 24 小時的 replica 活動
az monitor metrics list \
    --resource /subscriptions/$(az account show --query id -o tsv)/resourceGroups/creditcard-rg/providers/Microsoft.App/containerApps/creditcard-backend \
    --metric Replicas \
    --start-time $(date -u -d '24 hours ago' '+%Y-%m-%dT%H:%M:%S') \
    --end-time $(date -u '+%Y-%m-%dT%H:%M:%S') \
    --interval PT1M \
    --aggregation Average \
    --output table
```

**設置成本警報**:
```bash
# 當每月成本超過 $10 時發送通知
az monitor metrics alert create \
    --name cost-alert-creditcard \
    --resource-group creditcard-rg \
    --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/creditcard-rg \
    --condition "total cost > 10" \
    --description "Alert when monthly cost exceeds $10"
```

### 快速測試腳本

創建一個測試腳本 `test-scaling.sh`:

```bash
#!/bin/bash

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

APP_NAME="creditcard-backend"
RESOURCE_GROUP="creditcard-rg"
ENDPOINT="https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io"

echo -e "${YELLOW}=== Azure Container Apps 縮放測試 ===${NC}\n"

# 1. 檢查縮放設定
echo -e "${GREEN}1. 檢查縮放設定${NC}"
az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP \
    --query "properties.template.scale" -o json
echo ""

# 2. 檢查當前 replica 數量
echo -e "${GREEN}2. 當前 replica 數量${NC}"
REVISION=$(az containerapp revision list --name $APP_NAME --resource-group $RESOURCE_GROUP --query '[0].name' -o tsv)
REPLICA_COUNT=$(az containerapp replica list --name $APP_NAME --resource-group $RESOURCE_GROUP --revision $REVISION --query 'length(@)' -o tsv)
echo -e "Replicas: ${YELLOW}$REPLICA_COUNT${NC}"
echo ""

# 3. 測試健康檢查
echo -e "${GREEN}3. 測試健康檢查（冷啟動測試）${NC}"
echo "發送請求..."
START_TIME=$(date +%s.%N)
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" $ENDPOINT/health)
END_TIME=$(date +%s.%N)
RESPONSE_TIME=$(echo "$END_TIME - $START_TIME" | bc)

echo "$RESPONSE" | grep -v "HTTP_CODE\|TIME_TOTAL"
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
TIME_TOTAL=$(echo "$RESPONSE" | grep "TIME_TOTAL" | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "狀態: ${GREEN}✓ 正常${NC}"
else
    echo -e "狀態: ${RED}✗ 失敗 (HTTP $HTTP_CODE)${NC}"
fi
echo -e "回應時間: ${YELLOW}${TIME_TOTAL}s${NC}"
echo ""

# 4. 檢查是否有新的 replica 啟動
sleep 5
echo -e "${GREEN}4. 請求後的 replica 數量${NC}"
NEW_REPLICA_COUNT=$(az containerapp replica list --name $APP_NAME --resource-group $RESOURCE_GROUP --revision $REVISION --query 'length(@)' -o tsv)
echo -e "Replicas: ${YELLOW}$NEW_REPLICA_COUNT${NC}"

if [ "$NEW_REPLICA_COUNT" -gt "$REPLICA_COUNT" ]; then
    echo -e "變化: ${GREEN}✓ 自動擴展 ($REPLICA_COUNT → $NEW_REPLICA_COUNT)${NC}"
elif [ "$NEW_REPLICA_COUNT" -eq 0 ] && [ "$REPLICA_COUNT" -eq 0 ]; then
    echo -e "變化: ${YELLOW}⚠ 冷啟動（從 0 啟動，回應時間: ${TIME_TOTAL}s）${NC}"
else
    echo -e "變化: ${GREEN}✓ 已在運行中${NC}"
fi
echo ""

# 5. 查看最近的日誌
echo -e "${GREEN}5. 最近的日誌（最後 10 行）${NC}"
az containerapp logs show --name $APP_NAME --resource-group $RESOURCE_GROUP --tail 10 --follow false
echo ""

echo -e "${GREEN}=== 測試完成 ===${NC}"
```

使用方式:
```bash
chmod +x test-scaling.sh
./test-scaling.sh
```

### Application Insights
```bash
# 創建 Application Insights
az monitor app-insights component create \
    --app creditcard-insights \
    --location $LOCATION \
    --resource-group $RESOURCE_GROUP

# 獲取 Instrumentation Key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
    --app creditcard-insights \
    --resource-group $RESOURCE_GROUP \
    --query instrumentationKey -o tsv)

# 添加到環境變數
az containerapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --set-env-vars "APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=$INSTRUMENTATION_KEY"
```

---

## Revision 管理（版本管理）

### 什麼是 Revision？

**Revision** = Container App 的一個不可變版本（immutable snapshot）

每次你修改以下內容時，都會創建新的 revision：
- Container image
- 環境變數
- CPU/Memory 配置
- 縮放規則

### 檢查 Revision 模式

```bash
# 查看當前模式
az containerapp show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "properties.configuration.activeRevisionsMode" \
    -o tsv

# 輸出: Single 或 Multiple
```

### Revision 模式對比

| 特性 | Single（推薦）⭐ | Multiple |
|------|----------------|----------|
| Active Revisions | 1 個 | 多個（最多 100） |
| 流量分配 | 100% 到最新版本 | 可分配（A/B testing） |
| 適用場景 | 一般應用 | 藍綠部署、金絲雀發布 |
| 維護複雜度 | 簡單 | 複雜 |
| 自動清理 | ✅ 自動 | ❌ 需手動 |

### 策略 1: Single 模式（推薦）

```bash
# 查看所有 revisions
az containerapp revision list \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    -o table

# 查看所有 revisions（包含 inactive）
az containerapp revision list \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --all \
    -o table
```

**特點**:
- ✅ 零維護
- ✅ 每次部署自動切換到新版本
- ✅ 舊版本自動失效
- ❌ 無法快速回滾（但可以重新部署舊 image）

### 策略 2: 手動清理舊 Revisions

```bash
# 列出所有 inactive revisions
az containerapp revision list \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --all \
    --query "[?properties.active==\`false\`].{Name:name,Created:properties.createdTime}" \
    -o table

# 刪除特定 revision
az containerapp revision deactivate \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --revision creditcard-backend--0000001
```

### 策略 3: Multiple 模式（藍綠部署）

如果需要 A/B testing 或金絲雀發布：

```bash
# 切換到 Multiple 模式
az containerapp revision set-mode \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --mode multiple

# 部署新版本但不給流量
az containerapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --image $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:v2 \
    --revision-suffix v2

# 分配流量（90% 舊版本，10% 新版本）
az containerapp ingress traffic set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --revision-weight creditcard-backend--v1=90 creditcard-backend--v2=10

# 確認新版本正常後，切換 100% 到新版本
az containerapp ingress traffic set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --revision-weight creditcard-backend--v2=100
```

---

## 更新部署（建議流程）

```bash
# 1. 建置新 image（指定平台）
cd apps/backend
docker build --platform linux/amd64 --no-cache -f docker/Dockerfile \
    -t creditcard-tracker-backend:latest .

# 2. Tag 並推送
docker tag creditcard-tracker-backend:latest \
    $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:latest
docker push $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:latest

# 3. 更新 Container App（自動創建新 revision）
az containerapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --image $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:latest

# 4. 驗證新版本
az containerapp revision list --name $APP_NAME --resource-group $RESOURCE_GROUP -o table
curl https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io/health

# 5. 查看日誌確認無錯誤
az containerapp logs show --name $APP_NAME --resource-group $RESOURCE_GROUP --tail 50 --follow false

# 6. 完成！舊 revision 會自動失效
```

**使用帶版本號的 tag（推薦生產環境）**:
```bash
# 使用日期時間作為版本號
NEW_TAG=$(date +%Y%m%d-%H%M%S)
docker tag creditcard-tracker-backend:latest \
    $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:$NEW_TAG
docker push $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:$NEW_TAG

# 更新時指定版本
az containerapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --image $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:$NEW_TAG
```

**回滾到舊版本**:
```bash
# 1. 找到舊版本的 image tag
az acr repository show-tags \
    --name $CONTAINER_REGISTRY \
    --repository creditcard-tracker-backend \
    --orderby time_desc \
    -o table

# 2. 更新到舊版本
az containerapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --image $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:20251031-120000
```

---

## 自訂網域和 SSL

```bash
# Container Apps
az containerapp hostname add \
    --hostname api.yourdomain.com \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP

az containerapp hostname bind \
    --hostname api.yourdomain.com \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment creditcard-env \
    --validation-method CNAME
```

---

## 成本估算

- **Container Apps**: ~$15-30/月
- **App Service (B1)**: ~$13/月
- **Container Instances**: ~$15-25/月（按使用量計費）
- **AKS**: ~$70+/月（適合大規模）

---

## 故障排除

### 1. Prisma OpenSSL 錯誤

**錯誤訊息**:
```
Error loading shared library libssl.so.1.1: No such file or directory
Unable to require(`/app/node_modules/.prisma/client/libquery_engine-linux-musl.so.node`)
```

**原因**: Dockerfile 使用了不相容的基礎映像（如 Alpine）或 Prisma binary target 設定錯誤。

**解決方案**:
1. 確認 Dockerfile 使用 `node:20-bullseye-slim`（不是 `node:20-alpine`）
2. 確認 `prisma/schema.prisma` 中設定：
   ```prisma
   generator client {
     provider = "prisma-client-js"
     binaryTargets = ["native", "debian-openssl-1.1.x"]
   }
   ```
3. 重新建置 image 並確保使用 `--no-cache`:
   ```bash
   docker build --platform linux/amd64 --no-cache -f docker/Dockerfile -t creditcard-tracker-backend:latest .
   ```

### 2. Environment variable not found: DATABASE_URL

**錯誤訊息**:
```
Environment variable not found: DATABASE_URL
```

**原因**: Container App 缺少必要的環境變數。

**解決方案**: 使用步驟 6 的命令設置所有環境變數。

### 3. Container 無法啟動
```bash
# 檢查狀態
az containerapp show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP

# 查看即時日誌
az containerapp logs show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --tail 50

# 查看事件
az containerapp revision list \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP
```

### 4. 無法連接資料庫
- 確認 PostgreSQL 防火牆規則允許 Azure 服務
- 檢查 DATABASE_URL 格式正確
- 確認 Supabase 允許來自 Azure 的 IP

### 5. 平台架構不匹配

**錯誤訊息**:
```
The requested image's platform (linux/amd64) does not match the detected host platform
```

**原因**: 在 Mac ARM64 上建置時沒有指定目標平台。

**解決方案**: 建置時必須加上 `--platform linux/amd64`:
```bash
docker build --platform linux/amd64 -f docker/Dockerfile -t creditcard-tracker-backend:latest .
```

### 6. 健康檢查失敗
```bash
# 測試 health endpoint
curl https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io/health

# 添加健康檢查探針
az containerapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --set-env-vars "WEBSITE_HEALTHCHECK_MAXPINGFAILURES=10"
```

---

## 資源清理

```bash
# 刪除整個資源群組（包含所有資源）
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

---

## 最佳實踐

1. **使用 Managed Identity** 而非密碼
2. **啟用 Auto-scaling** 處理流量高峰
3. **設置 Application Insights** 監控效能
4. **使用 Azure Front Door** 作為 CDN 和 WAF
5. **定期備份** Key Vault 和資料庫
6. **使用 staging slots** 進行零停機部署


## Get env variable
```
az containerapp show --name creditcard-backend --resource-group creditcard-rg --query "properties.template.containers[0].env" -o json | jq 'map({name: .name, value: (.value // "<secret>")}) | sort_by(.name)'
```

## 產生jwt_key
```
openssl rand -base64 32
```

## 設置env-vars
```
az containerapp update \
  --name creditcard-backend \
  --resource-group creditcard-rg \
  --set-env-vars "VAPID_SUBJECT=mailto:support@savvyaihelper.com"
```

## 檢查變更版本
```
az containerapp revision list --name creditcard-backend --resource-group creditcard-rg --query "[].{Name:name,Active:properties.active,Created:properties.createdTime,Traffic:properties.trafficWeight}" -o table
```

## 設定line env
```
az containerapp secret set \
  --name creditcard-backend \
  --resource-group creditcard-rg \
  --secrets \
    line-channel-secret="3979b8559bf444abef6415dbb00a809d"

az containerapp update \
  --name creditcard-backend \
  --resource-group creditcard-rg \
  --set-env-vars \
    "LINE_CHANNEL_ID=2008406377" \
    "LINE_CHANNEL_SECRET=secretref:line-channel-secret" \
    "LINE_CALLBACK_URL=https://creditcard-backend.salmonsmoke-562e1c06.eastus.azurecontainerapps.io/api/auth/line/callback"

az containerapp revision restart \
  --name creditcard-backend \
  --resource-group creditcard-rg \
  --revision creditcard-backend--0000013
```