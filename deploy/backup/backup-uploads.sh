#!/usr/bin/env bash
#
# backup-uploads.sh — sincroniza /opt/comunicaciones/server/uploads a un destino externo.
#
# Uso (cron diario):
#   sudo cp deploy/backup/backup-uploads.sh /usr/local/sbin/comunicaciones-backup-uploads
#   sudo chmod 750 /usr/local/sbin/comunicaciones-backup-uploads
#   sudo tee /etc/cron.d/comunicaciones-backup > /dev/null <<'CRON'
#   30 2 * * *  root  /usr/local/sbin/comunicaciones-backup-uploads >> /var/log/comunicaciones-backup.log 2>&1
#   CRON
#
# Variables (override via env):
#   SRC          ruta origen (default /opt/comunicaciones/server/uploads)
#   DEST         ruta destino (default /mnt/backup/comunicaciones-uploads)
#   RETENTION_D  dias de snapshots a conservar (default 14)

set -euo pipefail

SRC="${SRC:-/opt/comunicaciones/server/uploads}"
DEST="${DEST:-/mnt/backup/comunicaciones-uploads}"
RETENTION_D="${RETENTION_D:-14}"
LOCKFILE="/run/comunicaciones-backup-uploads.lock"

log() { printf '[%s] %s\n' "$(date -Is)" "$*"; }
fail() { log "ERROR: $*"; exit 1; }

[[ -d "$SRC" ]] || fail "Source $SRC does not exist"
mkdir -p "$DEST/current" "$DEST/snapshots"

# Evitar ejecuciones concurrentes (cron lento + ejecucion manual).
exec 9>"$LOCKFILE"
flock -n 9 || fail "Another backup is already running"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SNAPSHOT="$DEST/snapshots/$TIMESTAMP"

log "Starting rsync from $SRC -> $DEST/current"
# --link-dest crea hardlinks contra el snapshot anterior: el espacio extra
# de cada snapshot es solo el de los archivos nuevos/modificados.
rsync -a --delete \
  --link-dest="$DEST/current" \
  "$SRC/" "$SNAPSHOT/"

# Atomicamente, hacer del nuevo snapshot el "current".
rm -rf "$DEST/current.old" 2>/dev/null || true
if [[ -d "$DEST/current" ]]; then
  mv "$DEST/current" "$DEST/current.old"
fi
cp -al "$SNAPSHOT" "$DEST/current"
rm -rf "$DEST/current.old" 2>/dev/null || true

log "Snapshot created: $SNAPSHOT"

# Limpiar snapshots viejos.
log "Pruning snapshots older than $RETENTION_D days"
find "$DEST/snapshots" -mindepth 1 -maxdepth 1 -type d -mtime "+$RETENTION_D" -print -exec rm -rf {} +

# Reportar tamano usado para monitoreo.
USAGE="$(du -sh "$DEST" | cut -f1)"
log "Backup OK. Total destination size: $USAGE"
