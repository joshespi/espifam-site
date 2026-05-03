#!/usr/bin/env bash
# Deploy the static build to the nginx VM.
#
# Set ESPIFAM_DEPLOY_TARGET to your rsync target, e.g.:
#   export ESPIFAM_DEPLOY_TARGET="user@nginx-host:/var/www/html/espifam.com/"
# then run: npm run deploy
set -euo pipefail

TARGET="${ESPIFAM_DEPLOY_TARGET:-}"
if [[ -z "$TARGET" ]]; then
  echo "ESPIFAM_DEPLOY_TARGET is not set." >&2
  echo "Example: export ESPIFAM_DEPLOY_TARGET=user@host:/var/www/espifam.com/" >&2
  exit 1
fi

npm run build
rsync -av --delete public/ "$TARGET"
echo "deployed to $TARGET"
