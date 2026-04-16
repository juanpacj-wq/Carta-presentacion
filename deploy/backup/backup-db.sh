#!/usr/bin/env bash
#
# backup-db.sh — snapshot consistente del archivo SQLite usando `sqlite3 .backup`.
#
# `sqlite3 .backup` es seguro aunque el servicio esté escribiendo en ese momento:
# usa la API de backup online de SQLite, no `cp`. Por eso es preferible a un
# rsync directo del .db, que puede capturar un estado intermedio del WAL.
#
# Uso (cron diario):
#   sudo cp deploy/backup/backup-db.sh /usr/local/sbin/comunicaciones-backup-db
#   sudo chmod 750 /usr/local/sbin/comunicaciones-backup-db
#   sudo tee /etc/cron.d/comunicaciones-backup-db > /dev/null <<'CRON'
#   15 2 * * *  root  /usr/local/sbin/comunicaciones-backup-db >> /var/log/comunicaciones-backup.log 2>&1
#   CRON
#
# Variables (override via env):
#   SRC          ruta al archivo .db (default /var/lib/comunicaciones/comunicaciones.db)
#   DEST         directorio destino (default /mnt/backup/comunicaciones-db)
#   RETENTION_D  dias de snapshots a conservar (default 30)

set -euo pipefail

SRC="${SRC:-/var/lib/comunicaciones/comunicaciones.db}"
DEST="${DEST:-/mnt/backup/comunicaciones-db}"
RETENTION_D="${RETENTION_D:-30}"
LOCKFILE="/run/comunicaciones-backup-db.lock"

log() { printf '[%s] %s\n' "$(date -Is)" "$*"; }
fail() { log "ERROR: $*"; exit 1; }

[[ -f "$SRC" ]] || fail "Source $SRC does not exist"
command -v sqlite3 >/dev/null || fail "sqlite3 CLI not installed (apt-get install sqlite3)"

mkdir -p "$DEST"

# Evitar ejecuciones concurrentes.
exec 9>"$LOCKFILE"
flock -n 9 || fail "Another DB backup is already running"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$DEST/comunicaciones-${TIMESTAMP}.db"

log "Starting SQLite online backup: $SRC -> $OUT"
sqlite3 "$SRC" ".backup '$OUT'"

# Verificar que el snapshot es legible y consistente.
log "Running integrity check"
RESULT="$(sqlite3 "$OUT" 'PRAGMA integrity_check;')"
if [[ "$RESULT" != "ok" ]]; then
  fail "Integrity check failed: $RESULT"
fi

# Comprimir para ahorrar espacio (los .db son muy compresibles).
gzip -9 "$OUT"
log "Snapshot created: ${OUT}.gz"

# Limpiar snapshots viejos.
log "Pruning snapshots older than $RETENTION_D days"
find "$DEST" -mindepth 1 -maxdepth 1 -name 'comunicaciones-*.db.gz' -mtime "+$RETENTION_D" -print -delete

USAGE="$(du -sh "$DEST" | cut -f1)"
log "Backup OK. Total destination size: $USAGE"
