# Despliegue paso a paso en Ubuntu vía SSH

Guía práctica para desplegar **COMUNICACIONES** en un servidor Ubuntu 22.04 / 24.04 limpio, conectándote por SSH e instalando certificados SSL propios (`ca_bundle`, `certificate`, `private.key`).

> **Antes de empezar:** ten a mano
> - IP pública o hostname del servidor
> - Usuario con `sudo` y su contraseña (o llave SSH)
> - Dominio ya apuntando al servidor (registro A/AAAA)
> - Los 3 archivos SSL en tu máquina local:
>   - `ca_bundle.crt` (cadena intermedia de la CA)
>   - `certificate.crt` (certificado del dominio)
>   - `private.key` (clave privada — **nunca la compartas**)
> - URL del repositorio (HTTPS o SSH) y credenciales si es privado

---

## 1. Conectarse al servidor

Desde tu máquina local:

```bash
ssh usuario@IP_DEL_SERVIDOR
```

Si usas llave SSH:

```bash
ssh -i ~/.ssh/mi_llave usuario@IP_DEL_SERVIDOR
```

Ya dentro, actualiza el índice de paquetes:

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

---

## 2. Instalar dependencias del sistema

```bash
# Node 20 LTS (requerido por el proyecto)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx ufw fail2ban

# Toolchain para compilar better-sqlite3 durante npm ci
sudo apt-get install -y build-essential python3 sqlite3

# Actualizaciones de seguridad automáticas
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

Verifica versiones:

```bash
node -v     # debe ser v20.x
npm -v
nginx -v
```

---

## 3. Crear usuario de servicio y directorios

La app corre bajo un usuario del sistema sin shell, nunca como root.

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin comunicaciones

# Carpeta del código
sudo mkdir -p /opt/comunicaciones
sudo chown comunicaciones:comunicaciones /opt/comunicaciones
sudo chmod 750 /opt/comunicaciones

# Carpeta de la DB SQLite (fuera del repo para que git pull no la toque)
sudo mkdir -p /var/lib/comunicaciones
sudo chown comunicaciones:comunicaciones /var/lib/comunicaciones
sudo chmod 750 /var/lib/comunicaciones

# Carpeta para los certificados SSL
sudo mkdir -p /etc/ssl/comunicaciones
sudo chmod 750 /etc/ssl/comunicaciones
```

---

## 4. Subir los certificados SSL al servidor

**Desde tu máquina local** (abre otra terminal, no la del SSH), sube los 3 archivos:

```bash
scp ca_bundle.crt certificate.crt private.key usuario@IP_DEL_SERVIDOR:/tmp/
```

Si usas llave SSH añade `-i ~/.ssh/mi_llave`.

**De vuelta en el servidor** (terminal SSH), arma el `fullchain.crt` que nginx necesita (certificado del dominio + cadena de la CA, en ese orden):

```bash
cat /tmp/certificate.crt /tmp/ca_bundle.crt | sudo tee /etc/ssl/comunicaciones/fullchain.crt > /dev/null
sudo mv /tmp/private.key /etc/ssl/comunicaciones/private.key

# Permisos estrictos: solo root lee la llave privada
sudo chown root:root /etc/ssl/comunicaciones/fullchain.crt /etc/ssl/comunicaciones/private.key
sudo chmod 644 /etc/ssl/comunicaciones/fullchain.crt
sudo chmod 600 /etc/ssl/comunicaciones/private.key

# Limpia los archivos temporales
rm -f /tmp/ca_bundle.crt /tmp/certificate.crt

# Verifica que el certificado y la llave coinciden (los MD5 deben ser iguales)
sudo openssl x509 -noout -modulus -in /etc/ssl/comunicaciones/fullchain.crt | openssl md5
sudo openssl rsa  -noout -modulus -in /etc/ssl/comunicaciones/private.key   | openssl md5
```

Si los dos MD5 no coinciden, la llave no corresponde al certificado — detén el proceso y revisa los archivos antes de continuar.

---

## 5. Clonar el repositorio y compilar

Reemplaza la URL por la real del repo:

```bash
sudo -u comunicaciones git clone https://github.com/<org>/comunicaciones.git /opt/comunicaciones
cd /opt/comunicaciones
sudo -u comunicaciones npm ci --workspaces --include-workspace-root
sudo -u comunicaciones npm run build
```

La primera instalación tarda unos minutos porque compila `better-sqlite3`.

---

## 6. Configurar variables de entorno

Los secretos viven en `/etc/comunicaciones/env`, fuera del repo. Genera primero el hash de contraseña y el `SESSION_SECRET`:

```bash
# Hash scrypt de la contraseña del único usuario admin
cd /opt/comunicaciones
sudo -u comunicaciones npm run hash-password --workspace=server -- 'TU_PASSWORD_AQUI'
# Copia la salida completa: scrypt$<salt>$<hash>

# Clave HMAC aleatoria de 96 caracteres hex para firmar los JWT de sesión
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Crea el archivo de entorno (reemplaza `TU_DOMINIO` y los valores en `<...>`):

```bash
sudo mkdir -p /etc/comunicaciones
sudo tee /etc/comunicaciones/env > /dev/null <<'EOF'
NODE_ENV=production
PORT=3000
BASE_URL=https://TU_DOMINIO
PUBLIC_BASE_URL=https://TU_DOMINIO
ALLOWED_ORIGINS=https://TU_DOMINIO

AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=scrypt$<salt>$<hash>
SESSION_SECRET=<clave_hex_de_96_chars>
SESSION_TTL_HOURS=8

DB_PATH=/var/lib/comunicaciones/comunicaciones.db
UPLOAD_MAX_SIZE_MB=5
UPLOAD_DIR=./server/uploads
EOF

sudo chown root:comunicaciones /etc/comunicaciones/env
sudo chmod 640 /etc/comunicaciones/env
```

---

## 7. Inicializar la base de datos

Aplica las migraciones — crea el archivo `.db` y el esquema. Es idempotente.

```bash
sudo -u comunicaciones bash -c 'set -a; source /etc/comunicaciones/env; set +a; cd /opt/comunicaciones && npm run migrate --workspace=server'

# Verifica
sudo ls -l /var/lib/comunicaciones/
```

---

## 8. Instalar el servicio systemd

```bash
sudo cp /opt/comunicaciones/deploy/systemd/comunicaciones.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now comunicaciones
sudo systemctl status comunicaciones
```

Debe quedar `active (running)`. Si falla, mira los logs:

```bash
sudo journalctl -u comunicaciones -n 100 --no-pager
```

---

## 9. Configurar nginx con los certificados propios

Copia el vhost del repo y reemplaza el dominio placeholder por el real:

```bash
sudo cp /opt/comunicaciones/deploy/nginx/comunicaciones.conf /etc/nginx/sites-available/comunicaciones

# Reemplaza el dominio (ajusta TU_DOMINIO)
sudo sed -i 's/cdp\.gecelca\.com\.co/TU_DOMINIO/g' /etc/nginx/sites-available/comunicaciones

sudo ln -sf /etc/nginx/sites-available/comunicaciones /etc/nginx/sites-enabled/comunicaciones
sudo rm -f /etc/nginx/sites-enabled/default
```

El vhost del repo ya apunta a `/etc/ssl/comunicaciones/fullchain.crt` y `/etc/ssl/comunicaciones/private.key`, así que los certificados del paso 4 quedan enganchados automáticamente.

Dale a nginx permiso para leer los uploads:

```bash
sudo usermod -a -G comunicaciones www-data
sudo chmod 750 /opt/comunicaciones/server/uploads
```

Valida y recarga:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 10. Firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

---

## 11. Hardening SSH

Edita `/etc/ssh/sshd_config`:

```bash
sudo nano /etc/ssh/sshd_config
```

Asegura estas líneas (descomenta o ajusta):

```
PermitRootLogin no
PasswordAuthentication no   # solo si ya configuraste llaves SSH
```

Recarga:

```bash
sudo systemctl reload ssh
```

> **Cuidado:** no cierres la sesión SSH actual hasta probar con una nueva que las llaves funcionan, o te puedes quedar fuera.

Activa los jails de fail2ban para nginx:

```bash
sudo tee /etc/fail2ban/jail.d/nginx.local > /dev/null <<'EOF'
[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF
sudo systemctl restart fail2ban
```

---

## 12. Verificación end-to-end

Desde el servidor:

```bash
# Servicio arriba
sudo systemctl status comunicaciones

# Health check interno
curl http://127.0.0.1:3000/api/health

# HTTPS público
curl -I https://TU_DOMINIO/
curl https://TU_DOMINIO/api/health

# HTTP redirige a HTTPS
curl -I http://TU_DOMINIO/

# Cadena del certificado (debe mostrar 2 certs: el tuyo + el intermedio)
echo | openssl s_client -connect TU_DOMINIO:443 -servername TU_DOMINIO -showcerts 2>/dev/null | grep -E '^(subject|issuer)='
```

Desde un navegador: abre `https://TU_DOMINIO/admin/` y entra con `AUTH_USERNAME` + la contraseña en claro. Prueba crear un perfil, subir foto y abrir el QR resultante.

---

## 13. Despliegues siguientes

Permiso de restart sin password:

```bash
sudo tee /etc/sudoers.d/comunicaciones > /dev/null <<'EOF'
comunicaciones ALL=(ALL) NOPASSWD: /bin/systemctl restart comunicaciones, /bin/systemctl status comunicaciones
EOF
sudo chmod 440 /etc/sudoers.d/comunicaciones
```

Actualizar a la última versión (pull + build + restart con rollback automático si falla el health check):

```bash
sudo -u comunicaciones /opt/comunicaciones/deploy/deploy.sh
```

Rollback manual a un tag/commit anterior:

```bash
sudo -u comunicaciones /opt/comunicaciones/deploy/deploy.sh v1.0.0
```

---

## 14. Comandos frecuentes de operación

| Acción | Comando |
|---|---|
| Estado del servicio | `sudo systemctl status comunicaciones` |
| Reiniciar | `sudo systemctl restart comunicaciones` |
| Logs en vivo | `sudo journalctl -u comunicaciones -f` |
| Logs con errores | `sudo journalctl -u comunicaciones -p err --since today` |
| Editar secretos | `sudo -e /etc/comunicaciones/env && sudo systemctl restart comunicaciones` |
| Recargar nginx | `sudo nginx -t && sudo systemctl reload nginx` |
| Ver firewall | `sudo ufw status verbose` |

---

## 15. Renovación del certificado SSL

Cuando la CA te entregue el certificado renovado, repite el **paso 4** con los nuevos archivos y recarga nginx:

```bash
# (tras subir los nuevos archivos a /tmp)
cat /tmp/certificate.crt /tmp/ca_bundle.crt | sudo tee /etc/ssl/comunicaciones/fullchain.crt > /dev/null
sudo mv /tmp/private.key /etc/ssl/comunicaciones/private.key
sudo chown root:root /etc/ssl/comunicaciones/*
sudo chmod 644 /etc/ssl/comunicaciones/fullchain.crt
sudo chmod 600 /etc/ssl/comunicaciones/private.key
sudo nginx -t && sudo systemctl reload nginx
```

No requiere reiniciar el servicio `comunicaciones`, solo nginx.

---

## 16. Backups

Consulta `deploy/backup/` para los scripts listos. Resumen crítico:

- **DB SQLite:** usa `sqlite3 .backup` (NO `cp` ni `rsync`) para snapshots consistentes mientras el servicio escribe. Programa en cron diario.
- **Uploads:** rsync diario a otro disco/NAS.
- Prueba restaurar al menos una vez antes de considerar el sistema listo para producción.
