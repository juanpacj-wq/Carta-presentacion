# Despliegue en Ubuntu

Guía de instalación de COMUNICACIONES en un servidor Ubuntu 22.04/24.04 usando Node nativo + systemd + nginx.

## 1. Prerrequisitos

- Ubuntu 22.04 o 24.04 con acceso `sudo`
- Dominio apuntando al servidor (p.ej. `comunicaciones.example.com`)
- La base de datos es **SQLite** y vive como un archivo en el mismo servidor (`/var/lib/comunicaciones/comunicaciones.db`). No se requiere acceso a ningún servidor de base de datos externo por la simpleza del modelo.

## 2. Instalar dependencias del sistema

```bash
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx ufw fail2ban

# build-essential + python3 son necesarios para compilar el módulo nativo
# better-sqlite3 durante `npm ci`. Una vez instalado, el binario queda
# cacheado en node_modules y no se vuelve a compilar en cada deploy.
sudo apt-get install -y build-essential python3 sqlite3

# Para TLS (Let's Encrypt)
sudo apt-get install -y certbot python3-certbot-nginx

# Actualizaciones de seguridad automáticas
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## 3. Usuario de servicio y filesystem

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin comunicaciones
sudo mkdir -p /opt/comunicaciones
sudo chown comunicaciones:comunicaciones /opt/comunicaciones
sudo chmod 750 /opt/comunicaciones

# Directorio para la base de datos SQLite. Vive fuera del repo para que un
# `git pull` o un redeploy nunca toquen el archivo .db.
sudo mkdir -p /var/lib/comunicaciones
sudo chown comunicaciones:comunicaciones /var/lib/comunicaciones
sudo chmod 750 /var/lib/comunicaciones
```

## 4. Clonar el repositorio

```bash
sudo -u comunicaciones git clone https://github.com/<org>/comunicaciones.git /opt/comunicaciones
cd /opt/comunicaciones
sudo -u comunicaciones npm ci --workspaces --include-workspace-root
sudo -u comunicaciones npm run build
```

## 5. Configurar secretos

**No commitees `/opt/comunicaciones/.env`**. Los secretos viven fuera del repo en `/etc/comunicaciones/env`:

```bash
sudo mkdir -p /etc/comunicaciones
sudo tee /etc/comunicaciones/env > /dev/null <<'EOF'
NODE_ENV=production
PORT=3000
BASE_URL=https://admin.example.com
PUBLIC_BASE_URL=https://perfiles.example.com
ALLOWED_ORIGINS=https://admin.example.com,https://perfiles.example.com

# --- Autenticacion local (usuario unico) ---
AUTH_USERNAME=mpinzon

# Hash scrypt de la contrasena. Generar con:
#   npm run hash-password --workspace=server -- '<password>'
AUTH_PASSWORD_HASH=scrypt$<salt>$<hash>

# Clave HMAC para firmar el JWT de sesion. Generar con:
#   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
# Rotar SESSION_SECRET invalida todas las sesiones existentes.
SESSION_SECRET=<REEMPLAZAR>

SESSION_TTL_HOURS=8

# SQLite — archivo en el mismo servidor, fuera del repo
DB_PATH=/var/lib/comunicaciones/comunicaciones.db

UPLOAD_MAX_SIZE_MB=5
UPLOAD_DIR=./server/uploads
EOF

sudo chown root:comunicaciones /etc/comunicaciones/env
sudo chmod 640 /etc/comunicaciones/env
```

## 6. Inicializar la base de datos

Aplicar las migraciones por primera vez crea el archivo `comunicaciones.db` y el esquema. Es idempotente — re-ejecutarlo no hace daño.

```bash
sudo -u comunicaciones bash -c 'set -a; source /etc/comunicaciones/env; set +a; cd /opt/comunicaciones && npm run migrate --workspace=server'

# Verificar que el archivo quedó creado y con permisos correctos
sudo ls -l /var/lib/comunicaciones/
```

## 7. Instalar el servicio systemd

```bash
sudo cp /opt/comunicaciones/deploy/systemd/comunicaciones.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now comunicaciones
sudo systemctl status comunicaciones
```

Logs:
```bash
sudo journalctl -u comunicaciones -f
sudo journalctl -u comunicaciones --since "1 hour ago"
```

## 8. Configurar nginx + TLS

```bash
# Editar el archivo y reemplazar comunicaciones.example.com por tu dominio real
sudo cp /opt/comunicaciones/deploy/nginx/comunicaciones.conf /etc/nginx/sites-available/comunicaciones
sudo ln -s /etc/nginx/sites-available/comunicaciones /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx

# Emitir certificado Let's Encrypt
sudo certbot --nginx -d comunicaciones.example.com
```

nginx necesita permiso de lectura sobre `/opt/comunicaciones/server/uploads`:
```bash
sudo usermod -a -G comunicaciones www-data
sudo chmod 750 /opt/comunicaciones/server/uploads
```

## 9. Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 10. SSH hardening

En `/etc/ssh/sshd_config`:
```
PermitRootLogin no
PasswordAuthentication no
```
```bash
sudo systemctl reload ssh
```

`fail2ban` ya protege SSH out-of-the-box en Ubuntu. Para nginx, activa el jail:
```bash
sudo tee /etc/fail2ban/jail.d/nginx.local > /dev/null <<'EOF'
[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF
sudo systemctl restart fail2ban
```

## 11. Despliegue continuo

Permisos para que `deploy.sh` pueda reiniciar el servicio:
```bash
sudo tee /etc/sudoers.d/comunicaciones > /dev/null <<'EOF'
comunicaciones ALL=(ALL) NOPASSWD: /bin/systemctl restart comunicaciones, /bin/systemctl status comunicaciones
EOF
sudo chmod 440 /etc/sudoers.d/comunicaciones
```

Despliegue de la última versión:
```bash
sudo -u comunicaciones /opt/comunicaciones/deploy/deploy.sh
```

Rollback a un tag anterior:
```bash
sudo -u comunicaciones /opt/comunicaciones/deploy/deploy.sh v1.0.0
```

Si el health check falla tras el restart, `deploy.sh` hace rollback automático al commit anterior.

## 12. Verificación end-to-end

```bash
# Servicio arriba
sudo systemctl status comunicaciones

# Health check (desde el servidor)
curl https://comunicaciones.example.com/api/health

# Headers de seguridad
curl -I https://comunicaciones.example.com/

# HTTP redirige a HTTPS
curl -I http://comunicaciones.example.com/

# Sin cookie de sesion -> 401
curl -X POST https://admin.example.com/api/profiles

# Login -> 200 y setea cookies HttpOnly/Secure + CSRF
curl -i -X POST https://admin.example.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"mpinzon","password":"<password>"}'

# Rate limit de login (>10 intentos/15 min por IP) -> 429
for i in $(seq 1 15); do curl -s -o /dev/null -w "%{http_code}\n" -X POST https://admin.example.com/api/auth/login -H 'Content-Type: application/json' -d '{"username":"x","password":"x"}'; done

# Rate limit de escritura de perfiles (>30 POSTs en <1 min)
for i in $(seq 1 40); do curl -s -o /dev/null -w "%{http_code}\n" -X POST https://admin.example.com/api/profiles; done
```

## 13. Logs y rotación

Los logs estructurados JSON de la app van a `journald`. Ajusta la retención global:
```bash
sudo tee -a /etc/systemd/journald.conf > /dev/null <<'EOF'
SystemMaxUse=500M
MaxRetentionSec=30day
EOF
sudo systemctl restart systemd-journald
```

## 14. Backups

Ver `deploy/backup/README.md` para los scripts y la programación recomendada. Resumen:

- **Base de datos SQLite:** usar `sqlite3 .backup` (no `cp`) para obtener un snapshot consistente aunque el servicio esté escribiendo. Programar diario.
- **Uploads:** rsync diario con snapshots `--link-dest` (script en `deploy/backup/backup-uploads.sh`).
- Ambos destinos deben vivir en otro disco o NAS — un snapshot en el mismo disco no protege contra fallo de hardware.
- Prueba la restauración al menos una vez antes de considerar el sistema listo.

## 15. Operación — comandos frecuentes

| Acción | Comando |
|---|---|
| Estado del servicio | `sudo systemctl status comunicaciones` |
| Reiniciar | `sudo systemctl restart comunicaciones` |
| Ver logs en vivo | `sudo journalctl -u comunicaciones -f` |
| Logs con errores | `sudo journalctl -u comunicaciones -p err --since today` |
| Editar secretos | `sudo -e /etc/comunicaciones/env && sudo systemctl restart comunicaciones` |
| Desplegar HEAD | `sudo -u comunicaciones /opt/comunicaciones/deploy/deploy.sh` |
| Rollback | `sudo -u comunicaciones /opt/comunicaciones/deploy/deploy.sh <ref-anterior>` |
| Renovar TLS | `sudo certbot renew --dry-run` (certbot instala un timer automáticamente) |
