#!/usr/bin/env bash
# One-time TLS bootstrap: creates a temporary self-signed cert so nginx can start,
# then replaces it with a real Let's Encrypt certificate.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

echo "Creating temporary certificate for ${DOMAIN}..."
docker compose run --rm --entrypoint sh certbot -c "
  mkdir -p /etc/letsencrypt/live/${DOMAIN} &&
  apk add --no-cache openssl >/dev/null 2>&1 || true
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
    -out /etc/letsencrypt/live/${DOMAIN}/fullchain.pem -subj '/CN=localhost'"

docker compose up -d nginx

echo "Requesting Let's Encrypt certificate..."
docker compose run --rm --entrypoint sh certbot -c "
  rm -rf /etc/letsencrypt/live/${DOMAIN} /etc/letsencrypt/archive/${DOMAIN} /etc/letsencrypt/renewal/${DOMAIN}.conf &&
  certbot certonly --webroot -w /var/www/certbot -d ${DOMAIN} \
    --email ${LETSENCRYPT_EMAIL} --agree-tos --no-eff-email --non-interactive"

docker compose exec nginx nginx -s reload
echo "Done. HTTPS is live for ${DOMAIN}."
