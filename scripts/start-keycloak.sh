#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
KEYCLOAK_DIR="$ROOT_DIR/keycloak"

if [ ! -d "$KEYCLOAK_DIR" ]; then
  echo "❌ Keycloak directory not found at $KEYCLOAK_DIR"
  echo "👉 Run: bash scripts/install-keycloak.sh or see setup.md"
  exit 1
fi

echo "🚀 Starting Keycloak in development mode on port 8080 (http://localhost:8080/auth)..."
export KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
if [[ -z "${KEYCLOAK_ADMIN_PASSWORD:-}" ]]; then
  if [[ ! -t 0 ]]; then
    echo "Set KEYCLOAK_ADMIN_PASSWORD or start Keycloak interactively to enter it securely." >&2
    exit 1
  fi
  read -r -s -p "Enter the local Keycloak admin password: " KEYCLOAK_ADMIN_PASSWORD
  printf '\n'
fi
if [[ -z "$KEYCLOAK_ADMIN_PASSWORD" ]]; then
  echo "KEYCLOAK_ADMIN_PASSWORD cannot be empty." >&2
  exit 1
fi
export KEYCLOAK_ADMIN_PASSWORD
export KC_BOOTSTRAP_ADMIN_USERNAME="$KEYCLOAK_ADMIN"
export KC_BOOTSTRAP_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PASSWORD"
export JAVA_OPTS_APPEND="-Dnet.bytebuddy.experimental=true"

# Background worker to ensure Zelosify realm is provisioned automatically
(
  REALM_IMPORT_FILE="$ROOT_DIR/keycloak-realm/zelosify-realm.json"
  if [ ! -f "$REALM_IMPORT_FILE" ]; then
    REALM_IMPORT_FILE="$KEYCLOAK_DIR/data/import/zelosify-realm.json"
  fi

  # Wait for Keycloak server to be ready
  for i in $(seq 1 45); do
    if curl -s http://localhost:8080/auth/realms/master >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done

  # Check if Zelosify realm is already present
  if ! curl -s http://localhost:8080/auth/realms/Zelosify >/dev/null 2>&1; then
    if [ -f "$REALM_IMPORT_FILE" ]; then
      echo "⚡ Provisioning Zelosify realm via Keycloak Admin CLI..."
      "$KEYCLOAK_DIR/bin/kcadm.sh" config credentials \
        --server http://localhost:8080/auth \
        --realm master \
        --user "${KEYCLOAK_ADMIN:-admin}" \
        --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null 2>&1 || true
      "$KEYCLOAK_DIR/bin/kcadm.sh" create realms -f "$REALM_IMPORT_FILE" >/dev/null 2>&1 || true
      echo "✅ Zelosify realm provisioned successfully!"
    fi
  else
    echo "✅ Zelosify realm is ready."
  fi
) &

exec "$KEYCLOAK_DIR/bin/kc.sh" start-dev \
  --http-port=8080 \
  --http-relative-path=/auth
