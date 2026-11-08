#!/usr/bin/env bash
# Backs up MongoDB and uploaded files into ./backups/<timestamp>/
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

stamp=$(date +%Y%m%d-%H%M%S)
dest="backups/$stamp"
mkdir -p "$dest"

docker compose exec -T mongo mongodump --quiet --archive --gzip \
  -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --db "$MONGO_DB" > "$dest/mongo.archive.gz"

docker compose run --rm --no-deps -T --entrypoint sh backend -c "tar -C /data -czf - uploads" > "$dest/uploads.tar.gz"

# Keep the 14 most recent backups
ls -1dt backups/*/ 2>/dev/null | tail -n +15 | xargs -r rm -rf
echo "Backup written to $dest"
