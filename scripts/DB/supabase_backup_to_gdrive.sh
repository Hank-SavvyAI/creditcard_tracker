#!/usr/bin/env bash
set -euo pipefail

# ========== LOAD .env ==========
# 自動載入同目錄下的 .env 文件
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  echo "載入環境變數: ${SCRIPT_DIR}/.env"
  set -a  # 自動 export 所有變數
  source "${SCRIPT_DIR}/.env"
  set +a
fi

# ========== CONFIG ==========
# 請在環境或系統變數設定下列參數，或直接寫在這裡（不建議把密碼寫在檔案）
: "${DATABASE_URL:?Need to set DATABASE_URL (postgres://user:pass@host:port/dbname)}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive:backups/supabase}"   # rclone remote + path
RETENTION_DAYS="${RETENTION_DAYS:-30}"                     # 在 GDrive 上保留 X 天
TMP_DIR="${TMP_DIR:-./supabase_backups}"
KEEP_LOCAL_COPY="${KEEP_LOCAL_COPY:-true}"                 # true = 同時保留本機備份

# ========== PREP ==========
mkdir -p "$TMP_DIR"
timestamp="$(date +%Y%m%dT%H%M%S)"
# 使用 custom 格式（pg_restore 可以還原）
outfile="${TMP_DIR}/supabase_${timestamp}.dump"

# 清理 function for exit (only if explicitly disabled)
cleanup() {
  if [[ "${KEEP_LOCAL_COPY}" != "true" ]]; then
    rm -f "${outfile}" "${outfile}.gz" || true
  fi
}
trap cleanup EXIT

echo "開始備份: ${outfile}"

# ========== DUMP ==========
# 使用 pg_dump 的 custom 格式（包含 schema + data），需確保環境有 pg_dump
pg_dump --format=custom --file="${outfile}" "${DATABASE_URL}"

echo "本機備份完成: ${outfile}"

exit 0
# 如果只想要本機備份，可以在這裡 exit（保留本機檔案）
# exit
# 壓縮為 .gz（可選）
gzip -f "${outfile}"
gzip_outfile="${outfile}.gz"

# ========== UPLOAD ==========
echo "上傳到 rclone remote: ${RCLONE_REMOTE}"
rclone copyto "${gzip_outfile}" "${RCLONE_REMOTE%/}/${timestamp}.dump.gz" --progress

echo "上傳完成: ${RCLONE_REMOTE%/}/${timestamp}.dump.gz"

# ========== RETENTION (刪除舊備份) ==========
# rclone 的 delete/cleanup 指令支援 --min-age
# 這裡我們用 rclone delete + --min-age 保留最近 RETENTION_DAYS
echo "執行保留策略：刪除 ${RETENTION_DAYS} 天前的備份"
# 注意：--min-age 使用類似 "30d" 之類格式
rclone delete "${RCLONE_REMOTE}" --min-age "${RETENTION_DAYS}d" --ignore-errors

echo "保留策略已執行"

# 如果不保留本機副本，清理 gzip 檔（trap 也會再清一次）
if [[ "${KEEP_LOCAL_COPY}" != "true" ]]; then
  rm -f "${gzip_outfile}" || true
fi

echo "備份流程完成"
