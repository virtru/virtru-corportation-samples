#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null && pwd)"

rootca_str="DSP rootCA. Used in the truststore."
if [[ "$(< $SCRIPT_DIR/dsp-keys/rootCA.pem)" == "$rootca_str" ]]; then
    echo "$SCRIPT_DIR/dsp-keys/rootCA.pem contains placeholder data. Please use a real RootCA."
    exit 1
fi

webcrt_str="TLS Web Certificate for COP."
if [[ "$(< $SCRIPT_DIR/dsp-keys/local-dsp.virtru.com.pem)" == "$webcrt_str" ]]; then
    echo "$SCRIPT_DIR/dsp-keys/local-dsp.virtru.com.pem contains placeholder data. Please use a real TLS Certificate."
    exit 1
fi

webcrt_str="TLS Web Key for COP."
if [[ "$(< $SCRIPT_DIR/dsp-keys/local-dsp.virtru.com.key.pem)" == "$webcrt_str" ]]; then
    echo "$SCRIPT_DIR/dsp-keys/local-dsp.virtru.com.key.pem contains placeholder data. Please use a real TLS Key."
    exit 1
fi

if ! command -v yq &> /dev/null; then
    echo "Unable to continue. Please install 'yq', and try again."
    echo "See: https://mikefarah.gitbook.io/yq/v3.x#install"
    exit 1
fi

if ! command -v gh &> /dev/null; then
    echo "Unable to continue. Please install 'gh', and try again."
    echo "See: https://github.com/cli/cli?tab=readme-ov-file#installation"
    exit 1
fi


# start the docker stack in detached mode
if docker compose version &> /dev/null ; then
    echo "Using docker compose (v2 style)"
    docker compose -f "$SCRIPT_DIR/docker-compose.cop.yaml" up -d
else
    echo "Using docker-compose (v1 style)"
    docker-compose -f "$SCRIPT_DIR/docker-compose.cop.yaml" up -d
fi

echo ""
echo "✅ The COP Application is now available at: https://local-dsp.virtru.com:5001"
echo "✅ The COP backend (grpc) is now running at: https://local-dsp.virtru.com:5002"
echo "✅ The COP database is now available at: local-dsp.virtru.com:15433"
echo ""
echo "⚠️ Be sure to import '$SCRIPT_DIR/keycloak-client.json' into the opentdf realm of your keycloak instance before continuing. ⚠️"
echo ""
echo "⚠️ Be sure update the CORS policy for DSP before continuing ⚠️"
