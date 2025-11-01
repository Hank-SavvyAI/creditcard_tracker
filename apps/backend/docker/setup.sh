export RESOURCE_GROUP="creditcard-rg"
export LOCATION="eastus"
export CONTAINER_REGISTRY="creditcardregistry"
export APP_NAME="creditcard-backend"

# 產生時間戳版本號
export VERSION=$(date +%Y%m%d-%H%M%S)
echo "Building version: $VERSION"

# Login to Azure
az acr login --name $CONTAINER_REGISTRY

# 建置 Docker 映像檔
docker build --platform linux/amd64 --no-cache -f docker/Dockerfile \
    -t creditcard-tracker-backend:$VERSION .

# 標記為 latest 和時間戳版本
docker tag creditcard-tracker-backend:$VERSION \
    $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:latest

docker tag creditcard-tracker-backend:$VERSION \
    $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:$VERSION

# 推送兩個標籤到 ACR
echo "Pushing to ACR..."
docker push $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:latest
docker push $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:$VERSION

# 更新 Container App 使用新版本（這會強制建立新 revision）
echo "Updating Container App with version $VERSION..."
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $CONTAINER_REGISTRY.azurecr.io/creditcard-tracker-backend:$VERSION

echo "Deployment completed! Version: $VERSION"

# 列出所有 revisions
az containerapp revision list \
  --name creditcard-backend \
  --resource-group creditcard-rg \
  --query "[].{Name:name,Active:properties.active,Created:properties.createdTime,Traffic:properties.trafficWeight}" \
  -o table