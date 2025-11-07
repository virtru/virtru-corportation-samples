#!/usr/bin/env bash

set -euo pipefail

APP_ROOT=$(git rev-parse --show-toplevel)

cd "$APP_ROOT" || exit 1

if docker compose version &> /dev/null ; then
    echo "Using docker compose (v2 style)"
    docker compose -p $(yq eval '.name' "$APP_ROOT/docker-compose.cop.yaml") down -v
else
    echo "Using docker-compose (v1 style)"
    docker-compose -p $(yq eval '.name' "$APP_ROOT/docker-compose.cop.yaml") down -v
fi