#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: ./fetch_from_gdrive_and_restore_host.sh gdrive:backups/supabase/20251110.dump.gz"
  exit 1
fi

CONTAINER="supabase_local_pg17"
REMOTE_PATH="$1"

# Assumes container 可 access rclone config (or rclone is configured inside)
docker exec -u postgres -it "${CONTAINER}" /usr/local/bin/fetch_from_gdrive_and_restore.sh "$REMOTE_PATH"
