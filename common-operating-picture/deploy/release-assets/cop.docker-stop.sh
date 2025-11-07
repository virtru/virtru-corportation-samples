#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null && pwd)"

cd "$SCRIPT_DIR" || exit 1

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


if docker compose version &> /dev/null ; then
    echo "Using docker compose (v2 style)"
    docker compose -p $(yq eval '.name' docker-compose.cop.yaml) down -v
else
    echo "Using docker-compose (v1 style)"
    docker-compose -p $(yq eval '.name' docker-compose.cop.yaml) down -v
fi