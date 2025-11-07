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

# prepare the helm chart
cd "$APP_ROOT/charts" || exit 1
if [ -f "Chart.yaml" ]; then
        # Update the version in values.yaml
        yq -i '(.image_cop.tag) = "'"$RELEASE_TAG"'"' "$APP_ROOT/charts/values.yaml"

        # NOTE: MIC-2028 removed nifi as it is considered out of scope for dsp-cop
        rm -rf templates/nifi

        # echo "Packaging Snapshot Helm chart with chart version [$RELEASE_TAG] and appVersion to [$RELEASE_TAG]"  >> "$GITHUB_STEP_SUMMARY"
        helm package . --app-version="$RELEASE_TAG" --version="$RELEASE_TAG"
        echo "Packaged as" *.tgz
        # helm push --debug *.tgz oci://ghcr.io/${{ github.repository_owner }}/charts
else
        echo "Unable to locate 'Chart.yaml'"
        exit 1
fi


# prepare the zip file
cd "$APP_ROOT" || exit 1

ZIP_DIR="dspcop-helm-$RELEASE_TAG"
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

mv "$APP_ROOT/charts/dspcop-helm-$RELEASE_TAG.tgz" "$ZIP_DIR/dspcop-helm-$RELEASE_TAG.tgz"

# prepare keycloak client
echo "preparing keycloak client"
cp "$APP_ROOT/deploy/release-assets/keycloak-client.json" "$ZIP_DIR/keycloak-client.json"

# prepare the README
cp "$APP_ROOT/deploy/release-assets/Helm_Deployment.md" "$ZIP_DIR/README.md"
sed -i -e "s|<release_tag>|$RELEASE_TAG|g" "$ZIP_DIR/README.md"

zip -r "$ZIP_FILE" "$ZIP_DIR" -x "*.DS_Store" -x "*.git*" -x "*.idea*" -x "*.gradle*" -x "*.iml" -x "*/build/*" -x "*/out/*" -x "*/target/*" -x "*/.gradle/*" -x "*/.idea/*" -x "*/.git/*"

echo "$ZIP_FILE created successfully!"
