# Backups

## 1. Fotos subidas (`server/uploads`)

**Script:** [`backup-uploads.sh`](./backup-uploads.sh) — rsync diario a `/mnt/backup/comunicaciones-uploads` con:
- Snapshots fechados con `--link-dest` (hardlinks → espacio incremental).
- Symlink/copia `current/` siempre apuntando al último snapshot bueno.
- Retención por defecto de 14 días.
- Lockfile con `flock` para evitar ejecuciones concurrentes.
- Logging con timestamp a stdout (redirigido por cron a `/var/log/comunicaciones-backup.log`).

### Instalación

```bash
sudo cp deploy/backup/backup-uploads.sh /usr/local/sbin/comunicaciones-backup-uploads
sudo chmod 750 /usr/local/sbin/comunicaciones-backup-uploads
sudo chown root:root /usr/local/sbin/comunicaciones-backup-uploads

sudo tee /etc/cron.d/comunicaciones-backup > /dev/null <<'CRON'
30 2 * * *  root  /usr/local/sbin/comunicaciones-backup-uploads >> /var/log/comunicaciones-backup.log 2>&1
CRON
```

Destino `/mnt/backup/...` debe estar en otro disco o un NAS montado — un snapshot en el mismo disco no protege contra fallo de hardware.

### Restore

```bash
sudo systemctl stop comunicaciones
sudo rsync -a --delete /mnt/backup/comunicaciones-uploads/current/ /opt/comunicaciones/server/uploads/
sudo chown -R comunicaciones:comunicaciones /opt/comunicaciones/server/uploads
sudo systemctl start comunicaciones
```

O para restaurar un snapshot específico:
```bash
sudo rsync -a --delete /mnt/backup/comunicaciones-uploads/snapshots/20260407T020000Z/ /opt/comunicaciones/server/uploads/
```

## 2. Base de datos (SQLite)

**Script:** [`backup-db.sh`](./backup-db.sh) — usa `sqlite3 .backup` (API de backup online de SQLite) para obtener un snapshot consistente del archivo `/var/lib/comunicaciones/comunicaciones.db` aunque el servicio esté escribiendo. Verifica integridad con `PRAGMA integrity_check`, comprime con gzip y rota por antigüedad (default 30 días).

> **Importante:** no copies el `.db` con `cp`/`rsync` directamente mientras el servicio está corriendo. SQLite usa WAL, así que un `cp` puede capturar un estado intermedio. `sqlite3 .backup` es la única forma segura sin parar el servicio.

### Instalación

```bash
sudo cp deploy/backup/backup-db.sh /usr/local/sbin/comunicaciones-backup-db
sudo chmod 750 /usr/local/sbin/comunicaciones-backup-db
sudo chown root:root /usr/local/sbin/comunicaciones-backup-db

sudo tee /etc/cron.d/comunicaciones-backup-db > /dev/null <<'CRON'
15 2 * * *  root  /usr/local/sbin/comunicaciones-backup-db >> /var/log/comunicaciones-backup.log 2>&1
CRON
```

Destino `/mnt/backup/...` debe estar en otro disco o un NAS — un snapshot en el mismo disco no protege contra fallo de hardware.

### Restore

```bash
sudo systemctl stop comunicaciones
sudo gunzip -c /mnt/backup/comunicaciones-db/comunicaciones-20260407T021500Z.db.gz \
  > /var/lib/comunicaciones/comunicaciones.db
sudo chown comunicaciones:comunicaciones /var/lib/comunicaciones/comunicaciones.db
# Borrar sidecars de WAL viejos por si quedaron de la sesión anterior
sudo rm -f /var/lib/comunicaciones/comunicaciones.db-wal /var/lib/comunicaciones/comunicaciones.db-shm
sudo systemctl start comunicaciones
```

### Verificación

Al menos una vez al mes, verificar manualmente que un snapshot reciente abre y pasa integrity check:
```bash
gunzip -c /mnt/backup/comunicaciones-db/comunicaciones-YYYYMMDDTHHMMSSZ.db.gz > /tmp/test.db
sqlite3 /tmp/test.db 'PRAGMA integrity_check; SELECT COUNT(*) FROM Profiles;'
rm /tmp/test.db
```

## 3. Configuración del servidor de aplicación

Los archivos críticos fuera del repo:
- `/etc/comunicaciones/env` — secretos
- `/etc/systemd/system/comunicaciones.service` — copia de `deploy/systemd/`
- `/etc/nginx/sites-available/comunicaciones` — copia de `deploy/nginx/`
- `/etc/letsencrypt/` — certificados TLS

Estos cambian poco. Un `tar -czf` semanal a almacenamiento externo es suficiente:
```bash
sudo tar -czf "/mnt/backup/config-$(date -u +%Y%m%d).tar.gz" \
  /etc/comunicaciones \
  /etc/systemd/system/comunicaciones.service \
  /etc/nginx/sites-available/comunicaciones \
  /etc/letsencrypt
```
