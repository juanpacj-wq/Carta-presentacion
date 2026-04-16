# Migraciones de esquema

Archivos SQL aplicados automáticamente por `npm run migrate --workspace=server`.

## Convenciones

- Nombre: `NNN_descripcion_corta.sql` con `NNN` secuencial y sin saltos (`001`, `002`, …).
- Sintaxis SQLite. Deben ser **idempotentes** siempre que sea posible (`CREATE TABLE IF NOT EXISTS ...`, `CREATE INDEX IF NOT EXISTS ...`).
- Una migración por cambio lógico. No editar migraciones ya aplicadas en otros entornos; crear una nueva.
- Un archivo puede contener varias sentencias separadas por `;` — el runner las pasa a `db.exec`.
- El runner ejecuta cada archivo en una transacción; si falla, hace rollback y detiene el proceso.

## Runner

Ubicación: `server/src/scripts/migrate.ts`.

- Crea la tabla `SchemaMigrations (filename TEXT PRIMARY KEY, applied_at TEXT)` si no existe.
- Lista los archivos de este directorio ordenados alfabéticamente.
- Ejecuta los que aún no están en `SchemaMigrations`.
- Registra cada uno al terminar.

El runner abre el mismo archivo SQLite que usa el servidor (`DB_PATH` del `.env`, o el default `server/data/comunicaciones.db`). En SQLite no hay usuarios separados — los permisos son a nivel de filesystem (el archivo lo posee el usuario del servicio).
