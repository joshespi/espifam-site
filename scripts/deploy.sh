#!/usr/bin/env bash
# Deploy the static build to the nginx VM.
#
# Set ESPIFAM_DEPLOY_TARGET to your ssh target, e.g.:
#   export ESPIFAM_DEPLOY_TARGET="user@nginx-host:/var/www/html/espifam.com/"
# then run: npm run deploy
#
# Mirrors public/ to the remote path over plain ssh/tar (no rsync required
# locally), replacing the remote directory's contents each time.
set -euo pipefail

TARGET="${ESPIFAM_DEPLOY_TARGET:-}"
if [[ -z "$TARGET" ]]; then
  echo "ESPIFAM_DEPLOY_TARGET is not set." >&2
  echo "Example: export ESPIFAM_DEPLOY_TARGET=user@host:/var/www/html/espifam.com/" >&2
  exit 1
fi

HOST="${TARGET%%:*}"
REMOTE_DIR="${TARGET#*:}"

npm run build
ssh "$HOST" "rm -rf -- '$REMOTE_DIR' && mkdir -p -- '$REMOTE_DIR'"
tar -C public -cf - . | ssh "$HOST" "tar -C '$REMOTE_DIR' -xf -"
echo "deployed to $TARGET"
