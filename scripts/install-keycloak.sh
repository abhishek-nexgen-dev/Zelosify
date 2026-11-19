#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
KEYCLOAK_DIR="$ROOT_DIR/keycloak"

KEYCLOAK_VERSION="26.0.7"
ARCHIVE_NAME="keycloak-${KEYCLOAK_VERSION}.tar.gz"
DOWNLOAD_URL="https://github.com/keycloak/keycloak/releases/download/${KEYCLOAK_VERSION}/${ARCHIVE_NAME}"

if [ -d "$KEYCLOAK_DIR/bin" ]; then
  echo "✅ Keycloak is already installed at $KEYCLOAK_DIR"
  exit 0
fi

echo "📥 Downloading Keycloak ${KEYCLOAK_VERSION}..."
mkdir -p "$ROOT_DIR/tmp_kc"
curl -sL "$DOWNLOAD_URL" -o "$ROOT_DIR/tmp_kc/$ARCHIVE_NAME"

echo "📦 Extracting Keycloak..."
tar -xzf "$ROOT_DIR/tmp_kc/$ARCHIVE_NAME" -C "$ROOT_DIR/tmp_kc"
mv "$ROOT_DIR/tmp_kc/keycloak-${KEYCLOAK_VERSION}" "$KEYCLOAK_DIR"
rm -rf "$ROOT_DIR/tmp_kc"

# Patch kcadm.sh for paths containing spaces
sed -i 's|-cp $DIRNAME/client/keycloak-admin-cli|-cp "$DIRNAME/client/keycloak-admin-cli|g' "$KEYCLOAK_DIR/bin/kcadm.sh" 2>/dev/null || true
sed -i 's|-Dkc.lib.dir=$DIRNAME/client/lib|-Dkc.lib.dir="$DIRNAME/client/lib"|g' "$KEYCLOAK_DIR/bin/kcadm.sh" 2>/dev/null || true
sed -i 's|26.0.7.jar |26.0.7.jar" |g' "$KEYCLOAK_DIR/bin/kcadm.sh" 2>/dev/null || true

echo "✅ Keycloak ${KEYCLOAK_VERSION} installed successfully at $KEYCLOAK_DIR"
