#!/usr/bin/env bash
# Usage: scripts/restore.sh backups/<timestamp>
# Restores the database (replacing existing collections) and uploaded files.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

src="${1:?Usage: restore.sh backups/<timestamp>}"
[ -f "$src/mongo.archive.gz" ] || { echo "No mongo.archive.gz in $src"; exit 1; }

read -r -p "This will overwrite the current database in '$MONGO_DB'. Type 'yes' to continue: " ok
[ "$ok" = "yes" ] || { echo "Aborted."; exit 1; }

docker compose exec -T mongo mongorestore --quiet --drop --archive --gzip \
  -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin < "$src/mongo.archive.gz"

if [ -f "$src/uploads.tar.gz" ]; then
  docker compose run --rm --no-deps -T --user root --entrypoint sh backend -c "tar -C /data -xzf - && chown -R node:node /data/uploads" < "$src/uploads.tar.gz"
fi
echo "Restore complete."
