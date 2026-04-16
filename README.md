# COMUNICACIONES

Aplicación web para gestionar perfiles digitales de personas (nombre, cargo, correo, teléfono, foto) y compartirlos como tarjetas estilo "tarjeta de presentación" mediante códigos QR.

- **Cliente:** React 19 + Vite + TypeScript
- **Servidor:** Express + TypeScript + MSSQL
- **Monorepo:** npm workspaces (`server` y `client`)

## Estructura

```
.
├── client/                       # SPA React + Vite
├── server/                       # API Express + TypeScript
│   ├── src/
│   │   ├── app.ts                # createApp() — configuración de Express
│   │   ├── index.ts              # bootstrap (listen + graceful shutdown)
│   │   ├── config.ts             # validación de env vars
│   │   ├── db.ts                 # pool MSSQL
│   │   ├── middleware/           # auth, errores, logging, uploads
│   │   ├── routes/               # rutas /api/profiles
│   │   ├── services/             # acceso a DB y QR
│   │   ├── utils/                # helpers puros (sanitize, magic bytes)
│   │   ├── scripts/migrate.ts    # runner de migraciones SQL
│   │   └── __tests__/            # tests de integración con supertest
│   ├── sql/
│   │   ├── migrations/           # NNN_*.sql aplicadas por `npm run migrate`
│   │   └── admin/                # scripts operacionales (login, grants)
│   └── uploads/                  # fotos procesadas (gitignored)
├── deploy/
│   ├── systemd/comunicaciones.service
│   ├── nginx/comunicaciones.conf
│   ├── deploy.sh
│   └── backup/
├── DEPLOY.md                     # guía de despliegue en Ubuntu
└── .github/workflows/ci.yml      # CI: typecheck + tests + build + audit
```

## Desarrollo local

### Prerrequisitos

- Node 20 LTS
- Acceso a una instancia MSSQL (local o remota)

### Setup

```bash
git clone <repo> comunicaciones
cd comunicaciones
npm ci --workspaces --include-workspace-root
cp .env.example .env
# Editar .env con DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD
```

Aplicar el esquema:
```bash
npm run migrate --workspace=server
```

Levantar cliente y servidor:
```bash
npm run dev
```

- Cliente: <http://localhost:5173>
- API: <http://localhost:3000/api>

### Variables de entorno

| Variable | Requerida | Default | Descripción |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` o `production` |
| `PORT` | no | `3000` | Puerto del servidor Express |
| `BASE_URL` | no | `http://localhost:3000` | URL pública (usada en QR) |
| `ADMIN_TOKEN` | sí (en prod) | — | Bearer token para POST/PUT. Generar con `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | sí (en prod) | — | Lista CSV de orígenes permitidos por CORS |
| `DB_SERVER` | sí | — | Host/instancia MSSQL (`servidor\instancia`) |
| `DB_PORT` | no | `1433` | |
| `DB_DATABASE` | sí | — | |
| `DB_USER` | sí | — | Usuario de mínimo privilegio (ver `server/sql/admin/`) |
| `DB_PASSWORD` | sí | — | |
| `DB_ENCRYPT` | no | `true` en prod | Cifrar la conexión |
| `DB_TRUST_SERVER_CERTIFICATE` | no | `false` (forzado en prod) | Sólo `true` en dev con cert self-signed |
| `UPLOAD_MAX_SIZE_MB` | no | `5` | Tamaño máximo de cada foto |
| `UPLOAD_DIR` | no | `./uploads` | Directorio base de fotos |

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Cliente + servidor en modo watch |
| `npm run build` | Build de cliente y servidor |
| `npm start` | Inicia el servidor compilado (`server/dist/index.js`) |
| `npm run typecheck --workspace=server` | `tsc --noEmit` del servidor |
| `npm test --workspace=server` | Vitest |
| `npm run migrate --workspace=server` | Aplica migraciones SQL pendientes |

## API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | — | Estado del servicio + DB |
| `GET` | `/api/profiles` | — | Lista paginada (`page`, `pageSize`) |
| `GET` | `/api/profiles/:id` | — | Perfil individual |
| `GET` | `/api/profiles/:id/qr` | — | PNG del QR que apunta al perfil |
| `POST` | `/api/profiles` | Bearer | Crea perfil (multipart con `photo`) |
| `PUT` | `/api/profiles/:id` | Bearer | Actualiza (`photo` opcional) |

Las rutas de escritura usan rate limiting (30/min), las de lectura 120/min y el QR 60/min.

## Seguridad implementada

- Helmet con CSP estricta, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- CORS restringido a `ALLOWED_ORIGINS`.
- Bearer token con comparación constante (`crypto.timingSafeEqual`).
- Validación de input con Zod (UUID, email, longitudes, paginación máx 100).
- Sanitización de HTML en `name`, `position`, `phone`.
- Validación de imágenes por **magic bytes** (JPEG/PNG/WebP) además del MIME.
- Procesamiento con sharp: resize 800x800 + conversión a WebP quality 85.
- Rate limiting por endpoint (`express-rate-limit`).
- Body limit 100 KB para JSON.
- Static `dotfiles: deny`, sin `index`.
- Redirect HTTP→HTTPS en producción (`x-forwarded-proto`).
- Usuario MSSQL con sólo `SELECT/INSERT/UPDATE`, sin `DELETE` ni DDL.
- Logs estructurados JSON, errores sin stack en producción.
- Graceful shutdown (`SIGTERM`/`SIGINT`) que cierra HTTP y pool.
- Health check con verificación de DB.

## Despliegue

Ver [`DEPLOY.md`](./DEPLOY.md) para la guía completa de despliegue en Ubuntu (systemd + nginx + Let's Encrypt + ufw + fail2ban + backups).

Resumen del flujo:
1. `git clone` en `/opt/comunicaciones` como usuario `comunicaciones`.
2. `npm ci && npm run build && npm run migrate`.
3. Secretos en `/etc/comunicaciones/env` (modo `640 root:comunicaciones`).
4. `systemctl enable --now comunicaciones`.
5. nginx + `certbot --nginx`.
6. Cron de backup (`deploy/backup/backup-uploads.sh`).
7. Despliegues posteriores: `deploy/deploy.sh` (con rollback automático si el health check falla).

## Tests

```bash
npm test --workspace=server
```

Cubre: helpers de sanitización, validación de magic bytes, middleware de auth (incluye casos de fail-closed y timing-safe), y rutas HTTP (`/api/health`, validación, auth, headers de seguridad) con `db.js` mockeado.

CI ejecuta typecheck + tests + build + `npm audit --omit=dev --audit-level=high` en cada push/PR a `main`.
