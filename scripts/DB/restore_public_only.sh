#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: ./restore_public_only.sh /full/path/to/backup.dump"
  exit 1
fi

LOCAL_FILE="$1"
CONTAINER="supabase_local_pg17"
DEST="/tmp/$(basename "$LOCAL_FILE")"
DATABASE_NAME="${DATABASE_NAME:-postgres}"

echo "正在複製備份檔案到容器..."
docker cp "$LOCAL_FILE" "${CONTAINER}:${DEST}"

echo "開始還原資料庫（僅 public schema）..."
# 只還原 public schema
docker exec -u postgres "${CONTAINER}" pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --schema=public \
  --dbname="${DATABASE_NAME}" \
  "${DEST}"

echo "清理容器內的備份檔案..."
# 使用 postgres 用戶刪除檔案（與創建檔案的用戶一致）
docker exec -u postgres "${CONTAINER}" rm -f "${DEST}" || echo "警告: 無法刪除臨時檔案（不影響功能）"

echo "還原完成！"
