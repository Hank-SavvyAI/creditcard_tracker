#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: ./restore_from_local.sh /full/path/to/backup.dump"
  exit 1
fi

LOCAL_FILE="$1"
CONTAINER="supabase_local_pg17"
DEST="/tmp/$(basename "$LOCAL_FILE")"

# 讀取 DATABASE_URL 從 .env 或使用預設值
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  source "${SCRIPT_DIR}/.env"
fi

# 從 DATABASE_URL 提取資料庫名稱，預設為 postgres
DATABASE_NAME="${DATABASE_NAME:-postgres}"

echo "正在複製備份檔案到容器..."
# copy to container
docker cp "$LOCAL_FILE" "${CONTAINER}:${DEST}"

echo "開始還原資料庫..."
# 直接在容器內執行 pg_restore
# 排除 Supabase 專用的 schemas (graphql, vault, auth, storage 等)
docker exec -u postgres "${CONTAINER}" pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --exclude-schema=graphql \
  --exclude-schema=vault \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=extensions \
  --exclude-schema=realtime \
  --dbname="${DATABASE_NAME}" \
  "${DEST}" 2>&1 | grep -v "pg_graphql\|supabase_vault\|does not exist" || true

echo "清理容器內的備份檔案..."
# 使用 postgres 用戶刪除檔案（與創建檔案的用戶一致）
docker exec -u postgres "${CONTAINER}" rm -f "${DEST}" || echo "警告: 無法刪除臨時檔案（不影響功能）"

echo "還原完成！"
