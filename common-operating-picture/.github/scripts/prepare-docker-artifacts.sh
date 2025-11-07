#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
APP_ROOT=$(dirname "$(dirname "$SCRIPT_DIR")")

cd "$APP_ROOT" || exit 1

if [ "$#" -ne 1 ]; then
        echo "Usage: $0 \"release-tag\""
        exit 1
else
        RELEASE_TAG="$1"
        echo "Creating deployment artifacts for release tag: $RELEASE_TAG"
fi

ZIP_DIR="dspcop-docker-$RELEASE_TAG"
if [ -d "$ZIP_DIR" ]; then
        echo "recreating zip dir"
        rm -rf "$ZIP_DIR"
fi
mkdir -p "$ZIP_DIR"

ZIP_FILE="$ZIP_DIR.zip"
if [ -f "$ZIP_FILE" ]; then
        echo "deleleting existing zip file"
        rm "$ZIP_FILE"
fi

# gather mock keys
echo "gathering mock keys"
KEYS_DIR="$ZIP_DIR/dsp-keys"
rm -rf "$KEYS_DIR"
mkdir -p "$KEYS_DIR"
echo "DSP rootCA. Used in the truststore." > "$KEYS_DIR/rootCA.pem"
echo "TLS Web Certificate for COP." > "$KEYS_DIR/local-dsp.virtru.com.pem"
echo "TLS Web Key for COP." > "$KEYS_DIR/local-dsp.virtru.com.key.pem"

# prepare keycloak client
echo "preparing keycloak client"
DSP_ENDPOINT="https://local-dsp.virtru.com:8080"
cp "$APP_ROOT/deploy/release-assets/keycloak-client.json" "$ZIP_DIR/keycloak-client.json"
sed -i -e "s|https://platform.example.com|$DSP_ENDPOINT|g" "$ZIP_DIR/keycloak-client.json"

# Prepare compose files
echo "preparing compose files"
COMPOSE_DIR="$ZIP_DIR/compose"
mkdir -p "$COMPOSE_DIR"
cp "$APP_ROOT/docker-compose.cop.yaml" "$ZIP_DIR/docker-compose.cop.yaml"
cp "$APP_ROOT/compose/docker-compose.cop-web-server.yaml" "$COMPOSE_DIR/docker-compose.cop-web-server.yaml"
cp "$APP_ROOT/compose/docker-compose.cop-db.yaml" "$COMPOSE_DIR/docker-compose.cop-db.yaml"
yq -i '(.services.cop-web-server.image) = "ghcr.io/virtru-corp/dsp-cop/cop-web-server:'"$RELEASE_TAG"'"' "$COMPOSE_DIR/docker-compose.cop-web-server.yaml"
yq -i 'del(.services.cop-web-server.build)' "$COMPOSE_DIR/docker-compose.cop-web-server.yaml"

# prepare application config for docker
echo "preparing application config for docker"
DOCKER_CONFIG="$ZIP_DIR/config.docker.yaml"
cp "$APP_ROOT/config.example.yaml" "$DOCKER_CONFIG"
sed -i -e 's|localhost:15432|cop-db:5432|g' "$DOCKER_CONFIG"
yq -i '(.service.public_server_host) = "https://local-dsp.virtru.com:5002"' "$DOCKER_CONFIG"
yq -i '(.service.public_static_host) = "https://local-dsp.virtru.com:5001"' "$DOCKER_CONFIG"

# gather mock database assets
echo "gathering mock database assets"
DB_DIR="$ZIP_DIR/db"
mkdir -p "$DB_DIR"
cp "$APP_ROOT/db/schema.sql" "$DB_DIR/schema.sql"
cp "$APP_ROOT/db/seed.sql" "$DB_DIR/seed.sql"

# prepare the README
cp "$APP_ROOT/deploy/release-assets/Docker_Deployment.md" "$ZIP_DIR/README.md"
cp "$APP_ROOT/deploy/release-assets/cop.docker-start.sh" "$ZIP_DIR/cop.docker-start.sh"
cp "$APP_ROOT/deploy/release-assets/cop.docker-stop.sh" "$ZIP_DIR/cop.docker-stop.sh"
sed -i -e "s|<release_tag>|$RELEASE_TAG|g" "$ZIP_DIR/README.md"

zip -r "$ZIP_FILE" "$ZIP_DIR" -x "*.DS_Store" -x "*.git*" -x "*.idea*" -x "*.gradle*" -x "*.iml" -x "*/build/*" -x "*/out/*" -x "*/target/*" -x "*/.gradle/*" -x "*/.idea/*" -x "*/.git/*"

echo "$ZIP_FILE created successfully!"
