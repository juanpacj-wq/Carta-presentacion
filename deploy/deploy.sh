#!/usr/bin/env bash
#
# deploy.sh — pull, build, restart, smoke-test.
#
# Usage (run as the `comunicaciones` user on the Ubuntu server):
#   cd /opt/comunicaciones
#   ./deploy/deploy.sh                 # deploy current branch HEAD
#   ./deploy/deploy.sh v1.2.0          # deploy a specific tag/commit (for rollback)
#
# Prerequisites:
#   - Node 20 LTS available as /usr/bin/node
#   - /etc/comunicaciones/env populated with prod secrets
#   - systemd unit `comunicaciones` installed and enabled
#   - sudoers: comunicaciones ALL=(ALL) NOPASSWD: /bin/systemctl restart comunicaciones, /bin/systemctl status comunicaciones

set -euo pipefail

REPO_DIR="/opt/comunicaciones"
SERVICE="comunicaciones"
HEALTH_URL="http://127.0.0.1:3000/api/health"
TARGET_REF="${1:-}"

log() { printf '[deploy] %s\n' "$*"; }
fail() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

[[ -d "$REPO_DIR" ]] || fail "Repo directory $REPO_DIR not found"
cd "$REPO_DIR"

# Record current ref for manual rollback.
PREVIOUS_REF="$(git rev-parse HEAD)"
log "Current HEAD: $PREVIOUS_REF"

log "Fetching latest refs"
git fetch --tags --prune origin

if [[ -n "$TARGET_REF" ]]; then
  log "Checking out $TARGET_REF"
  git checkout --detach "$TARGET_REF"
else
  CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  [[ "$CURRENT_BRANCH" != "HEAD" ]] || fail "Detached HEAD — pass an explicit ref as argument"
  log "Fast-forwarding $CURRENT_BRANCH"
  git pull --ff-only origin "$CURRENT_BRANCH"
fi

NEW_REF="$(git rev-parse HEAD)"
log "Deploying $NEW_REF"

log "Installing dependencies (npm ci)"
npm ci --workspaces --include-workspace-root

log "Building client + server"
npm run build

log "Restarting systemd service"
sudo /bin/systemctl restart "$SERVICE"

# Health check with retries — the service needs a moment to bind the port and
# open the SQLite file after `systemctl restart`.
log "Waiting for health check at $HEALTH_URL"
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl --silent --fail --max-time 3 "$HEALTH_URL" >/dev/null; then
    log "Health check OK on attempt $attempt"
    log "Deploy succeeded: $PREVIOUS_REF -> $NEW_REF"
    exit 0
  fi
  sleep 2
done

log "Health check FAILED — rolling back to $PREVIOUS_REF"
git checkout --detach "$PREVIOUS_REF"
npm ci --workspaces --include-workspace-root
npm run build
sudo /bin/systemctl restart "$SERVICE"
fail "Deploy failed; rolled back to $PREVIOUS_REF"
