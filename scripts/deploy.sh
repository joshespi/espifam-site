#!/usr/bin/env bash
# Deploy the static build to the nginx VM.
#
# Set ESPIFAM_DEPLOY_TARGET to your ssh target, e.g.:
#   export ESPIFAM_DEPLOY_TARGET="user@nginx-host:/var/www/html/espifam.com/"
# then run: npm run deploy
#
# Uploads into a sibling directory and swaps it in with two renames, so the
# live site is never missing or half-written -- and the previous release stays
# on disk as <dir>.prev for a fast manual rollback.
set -euo pipefail

TARGET="${ESPIFAM_DEPLOY_TARGET:-}"
if [[ -z "$TARGET" ]]; then
  echo "ESPIFAM_DEPLOY_TARGET is not set." >&2
  echo "Example: export ESPIFAM_DEPLOY_TARGET=user@host:/var/www/html/espifam.com/" >&2
  exit 1
fi

HOST="${TARGET%%:*}"
REMOTE_DIR="${TARGET#*:}"
REMOTE_DIR="${REMOTE_DIR%/}"

if [[ -z "$HOST" || -z "$REMOTE_DIR" || "$REMOTE_DIR" != /* ]]; then
  echo "ESPIFAM_DEPLOY_TARGET must look like user@host:/absolute/path" >&2
  exit 1
fi

NEW="${REMOTE_DIR}.new"
PREV="${REMOTE_DIR}.prev"

npm run build

# A single ssh connection does everything (one password prompt without a key):
# extract the tarball from stdin, verify it, then swap. The swap only runs if
# the extract and checks succeed, so a failed upload leaves the live site
# untouched. No ControlMaster: it is unreliable under Git Bash on Windows.
tar -C public -cf - . | ssh "$HOST" "
  set -e
  rm -rf -- '$NEW'
  mkdir -p -- '$NEW'
  tar -C '$NEW' -xf -
  test -s '$NEW/index.html'
  test -s '$NEW/styles.css'
  rm -rf -- '$PREV'
  if [ -d '$REMOTE_DIR' ]; then mv -- '$REMOTE_DIR' '$PREV'; fi
  mv -- '$NEW' '$REMOTE_DIR'
" || {
  echo "upload incomplete or swap failed; live site left untouched" >&2
  exit 1
}

echo "deployed to $TARGET (previous release kept at $PREV)"
