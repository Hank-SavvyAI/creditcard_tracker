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

```bash
# 進入 backend 目錄
cd apps/backend

# 建置 image（指定 linux/amd64 平台，重要！）
docker build --platform linux/amd64 -t creditcard-tracker-backend:latest .

# Tag image
docker tag creditcard-tracker-backend:latest \
    $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:latest

# 推送到 ACR
docker push $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:latest
```

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
# 獲取 ACR 憑證
ACR_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY --query 'passwords[0].value' -o tsv)

# 創建 Container App
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
```

### 步驟 6: 設置環境變數和機密

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

### 步驟 7: 啟用 Managed Identity 和設置權限

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

## 監控和日誌

### 查看日誌
```bash
# Container Apps
az containerapp logs show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --follow

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

## 更新部署

```bash
# 1. 建置新 image
docker build -t creditcard-tracker-backend:latest .

# 2. Tag 並推送
NEW_TAG=$(date +%Y%m%d-%H%M%S)
docker tag creditcard-tracker-backend:latest \
    $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:$NEW_TAG
docker push $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:$NEW_TAG

# 3. 更新 Container App
az containerapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --image $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:$NEW_TAG
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

### 1. Container 無法啟動
```bash
# 檢查狀態
az containerapp show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP

# 查看事件
az containerapp revision list \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP
```

### 2. 無法連接資料庫
- 確認 PostgreSQL 防火牆規則允許 Azure 服務
- 檢查 DATABASE_URL 格式正確

### 3. 健康檢查失敗
```bash
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
