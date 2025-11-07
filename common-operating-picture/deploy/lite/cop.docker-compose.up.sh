#!/usr/bin/env bash

set -euo pipefail

APP_ROOT=$(git rev-parse --show-toplevel)

cd "$APP_ROOT" || exit 1

# gather keys
mkdir -p "$APP_ROOT/dsp-keys"
if [ -f "$APP_ROOT/dsp-keys/rootCA.pem" ]; then
    read -p "A root CA already exists in $APP_ROOT/dsp-keys/rootCA.pem. Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm "$APP_ROOT/dsp-keys/rootCA.pem"
    else
        echo "Unable to continue"
        exit 1
    fi
fi
cp -n "$(mkcert -CAROOT)"/rootCA.pem "$APP_ROOT/dsp-keys"
mkcert -cert-file "$APP_ROOT/dsp-keys/local-dsp.virtru.com.pem" -key-file "$APP_ROOT/dsp-keys/local-dsp.virtru.com.key.pem" local-dsp.virtru.com "*.local-dsp.virtru.com" localhost

# prepare keycloak client
DSP_ENDPOINT="https://local-dsp.virtru.com:8080"
sed -i '' -e "s|https://platform.example.com|$DSP_ENDPOINT|g" "$APP_ROOT/deploy/release-assets/keycloak-client.json"

# prepare volume mount paths for docker
sed -i "" -e "s|- \.\./|- $APP_ROOT/|g" "$APP_ROOT/compose/docker-compose.cop-web-server.yaml"

# prepare application config for docker
DOCKER_CONFIG="$APP_ROOT/config.docker.yaml"
cp "$APP_ROOT/config.example.yaml" "$DOCKER_CONFIG"

sed -i '' -e 's|localhost:15432|cop-db:5432|g' "$DOCKER_CONFIG"
sed -i '' -e 's|public_server_host: local-dsp.virtru.com:5002|public_server_host: https://local-dsp.virtru.com:5002|g' "$DOCKER_CONFIG"
sed -i '' -e 's|public_static_host: local-dsp.virtru.com:5001|public_static_host: https://local-dsp.virtru.com:5001|g' "$DOCKER_CONFIG"

# start the docker stack in detached mode
if docker compose version &> /dev/null ; then
    echo "Using docker compose (v2 style)"
    docker compose -f "$APP_ROOT/docker-compose.cop.yaml" up -d --build
else
    echo "Using docker-compose (v1 style)"
    docker-compose -f "$APP_ROOT/docker-compose.cop.yaml" up -d --build
fi

echo ""
echo "✅ The COP application is now available at: https://local-dsp.virtru.com:5001"
echo "✅ The COP backend (go/grpc) is now running at: https://local-dsp.virtru.com:5002"
echo "✅ The COP database is now available at: local-dsp.virtru.com:15433"
echo ""
echo "⚠️ Be sure to import '$APP_ROOT/deploy/release-assets/keycloak-client.json' into the opentdf realm of your keycloak instance before continuing. ⚠️"
echo ""
echo "⚠️ Be sure update the CORS policy for DSP before continuing ⚠️"
