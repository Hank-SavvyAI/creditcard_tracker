#!/usr/bin/env bash
set -euo pipefail
docker-compose build --no-cache
docker-compose up -d
echo "Container should be starting. Use docker logs -f supabase_local_pg17 to watch."
