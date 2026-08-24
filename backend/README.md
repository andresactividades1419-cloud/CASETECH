# CASETECH Backend

Backend FastAPI del ERP CASETECH para gestión de producción e inventario de casetones de concreto.

## Stack

- **FastAPI** 0.110.0 — Framework web ASGI
- **SQLAlchemy** 2.0 — ORM async con asyncpg
- **Alembic** 1.13.1 — Migraciones de base de datos
- **Pydantic v2** 2.6.4 — Validación y serialización
- **PostgreSQL** 16 — Base de datos principal
- **UV** — Gestor de paquetes y entornos virtuales

## Desarrollo local

```bash
# Levantar servicios con Docker Compose
docker compose up --build

# Aplicar migraciones
docker compose exec backend alembic upgrade head
```

## Documentación de la API

Disponible en `http://localhost:8000/api/v1/docs` al levantar el servicio.
