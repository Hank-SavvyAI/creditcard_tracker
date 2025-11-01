# AWS 部署指南

本指南說明如何將後端 Docker image 部署到 AWS。

## 方案選擇

### 1. AWS ECS (Elastic Container Service) with Fargate - 推薦
最簡單的容器部署方案，無需管理伺服器。

### 2. AWS App Runner
最簡單的部署方式，自動處理擴展和負載平衡。

### 3. AWS EC2 with Docker
傳統 VM 方式，需要自己管理伺服器。

---

## 方案 1: AWS ECS Fargate (推薦)

### 前置準備

1. 安裝 AWS CLI
```bash
# macOS
brew install awscli

# 配置 AWS CLI
aws configure
```

2. 安裝 Docker
```bash
brew install docker
```

### 步驟 1: 推送 Image 到 ECR (Elastic Container Registry)

```bash
# 1. 創建 ECR repository
aws ecr create-repository \
    --repository-name creditcard-tracker-backend \
    --region us-east-1

# 2. 獲取登入憑證
aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS \
    --password-stdin <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# 3. 建置 Docker image
cd apps/backend
docker build -t creditcard-tracker-backend:latest .

# 4. Tag image
docker tag creditcard-tracker-backend:latest \
    <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/creditcard-tracker-backend:latest

# 5. 推送到 ECR
docker push <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/creditcard-tracker-backend:latest
```

### 步驟 2: 創建 ECS Cluster

```bash
# 創建 Fargate cluster
aws ecs create-cluster \
    --cluster-name creditcard-cluster \
    --region us-east-1
```

### 步驟 3: 創建 Task Definition

創建文件 `ecs-task-definition.json`:

```json
{
  "family": "creditcard-backend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::<YOUR_AWS_ACCOUNT_ID>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "creditcard-backend",
      "image": "<YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/creditcard-tracker-backend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8443,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "8443"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<YOUR_AWS_ACCOUNT_ID>:secret:creditcard/DATABASE_URL"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<YOUR_AWS_ACCOUNT_ID>:secret:creditcard/JWT_SECRET"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/creditcard-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "node -e \"require('http').get('http://localhost:8443/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\""],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

註冊 task definition:
```bash
aws ecs register-task-definition \
    --cli-input-json file://ecs-task-definition.json
```

### 步驟 4: 創建 Service

```bash
aws ecs create-service \
    --cluster creditcard-cluster \
    --service-name creditcard-backend-service \
    --task-definition creditcard-backend-task \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}"
```

### 步驟 5: 設置環境變數 (AWS Secrets Manager)

```bash
# 儲存敏感資料到 Secrets Manager
aws secretsmanager create-secret \
    --name creditcard/DATABASE_URL \
    --secret-string "postgresql://..."

aws secretsmanager create-secret \
    --name creditcard/JWT_SECRET \
    --secret-string "your-jwt-secret"

# 重複以上步驟儲存其他環境變數
```

### 步驟 6: 設置 Application Load Balancer (ALB)

1. 在 AWS Console 創建 Application Load Balancer
2. 創建 Target Group (port 8443)
3. 將 ECS Service 連接到 ALB

---

## 方案 2: AWS App Runner (最簡單)

### 步驟 1: 推送 Image 到 ECR (同上)

### 步驟 2: 創建 App Runner Service

```bash
# 創建 apprunner.yaml 配置文件
cat > apprunner.yaml << 'EOF'
version: 1.0
runtime: nodejs20
build:
  commands:
    build:
      - npm ci
      - npx prisma generate
      - npm run build
run:
  runtime-version: 20
  command: node dist/index.js
  network:
    port: 8443
  env:
    - name: NODE_ENV
      value: production
    - name: PORT
      value: 8443
EOF

# 使用 AWS Console 或 CLI 創建 App Runner Service
aws apprunner create-service \
    --service-name creditcard-backend \
    --source-configuration "ImageRepository={ImageIdentifier=<YOUR_ECR_IMAGE_URI>,ImageRepositoryType=ECR}" \
    --instance-configuration "Cpu=1024,Memory=2048" \
    --health-check-configuration "Protocol=HTTP,Path=/health"
```

---

## 方案 3: AWS EC2 with Docker

### 步驟 1: 啟動 EC2 Instance

1. 選擇 Amazon Linux 2 AMI
2. 選擇 t3.micro 或更大的 instance type
3. 配置 Security Group (開放 8443 port)

### 步驟 2: 在 EC2 上安裝 Docker

```bash
# SSH 進入 EC2
ssh -i your-key.pem ec2-user@your-ec2-public-ip

# 安裝 Docker
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# 安裝 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 步驟 3: 部署應用

```bash
# 方式 1: 使用 docker-compose
git clone your-repo
cd creditcard_tracker/apps/backend
docker-compose up -d

# 方式 2: 從 ECR 拉取
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker pull <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/creditcard-tracker-backend:latest
docker run -d -p 8443:8443 --env-file .env <YOUR_IMAGE>
```

---

## 環境變數設置

無論使用哪種方案，都需要設置以下環境變數：

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
PORT=8443
FRONTEND_URL=https://your-frontend.com
BOT_TOKEN=your-telegram-bot-token
BOT_USERNAME=your-bot-username
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-backend/api/auth/google/callback
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

---

## 監控和日誌

### CloudWatch Logs
```bash
# 查看日誌
aws logs tail /ecs/creditcard-backend --follow
```

### 健康檢查
訪問: `http://your-service-url/health`

---

## 更新部署

```bash
# 1. 建置新的 image
docker build -t creditcard-tracker-backend:latest .

# 2. Tag 並推送
docker tag creditcard-tracker-backend:latest \
    <YOUR_ECR_URI>:latest
docker push <YOUR_ECR_URI>:latest

# 3. 更新 ECS Service (會自動使用新 image)
aws ecs update-service \
    --cluster creditcard-cluster \
    --service creditcard-backend-service \
    --force-new-deployment
```

---

## 成本估算

- **App Runner**: ~$15-30/月 (最簡單)
- **ECS Fargate**: ~$20-40/月 (推薦)
- **EC2 t3.micro**: ~$10/月 + 流量費用

---

## 故障排除

### 1. Container 無法啟動
```bash
# 檢查 logs
aws ecs describe-tasks --cluster creditcard-cluster --tasks <task-id>
aws logs tail /ecs/creditcard-backend --follow
```

### 2. 健康檢查失敗
- 確認 port 8443 已開放
- 檢查 /health endpoint 是否正常

### 3. 資料庫連接失敗
- 確認 DATABASE_URL 正確
- 檢查 Security Group 是否允許連接資料庫
