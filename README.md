# CASETECH — ERP de Gestión de Casetones

> Sistema de planificación de recursos empresariales (ERP) diseñado para la gestión integral de casetones: inventario de materiales, pedidos, facturación y reportes operativos.

---

## Stack Tecnológico

| Capa | Tecnología | Versión | Justificación |
|------|-----------|---------|---------------|
| **Base de datos** | PostgreSQL | 16 (`postgres:16-alpine`) | Última versión LTS con soporte activo, mejoras de rendimiento en consultas complejas y soporte nativo de JSON |
| **Backend runtime** | Python | 3.11-slim | Versión estable con mejoras significativas en rendimiento (10-60% vs 3.10) y soporte hasta 2027 |
| **Backend framework** | FastAPI | 0.110.0 | Framework ASGI de alto rendimiento, tipado nativo con Pydantic v2, documentación OpenAPI automática |
| **ORM** | SQLAlchemy | 2.0.28 | API moderna con soporte async/await, tipado estricto y compatibilidad total con Alembic |
| **Migraciones** | Alembic | 1.13.1 | Herramienta oficial de migraciones para SQLAlchemy, control de versiones de esquema reproducible |
| **Driver DB** | psycopg2-binary | 2.9.9 | Driver de producción para PostgreSQL, rendimiento y estabilidad comprobados |
| **Validación** | Pydantic | 2.6.4 | Validación y serialización de datos con rendimiento 5-50x superior a v1 (core en Rust) |
| **Gestor deps. Python** | UV | latest | Reemplaza pip+venv: instalación 10-100x más rápida, resolución determinista, lock file integrado |
| **Frontend framework** | React | 18.2.0 | Biblioteca UI estándar de la industria con Concurrent Mode y Server Components |
| **Routing frontend** | React Router DOM | 6.22.3 | Enrutamiento declarativo para React, compatible con React 18 |
| **Cliente HTTP** | Axios | 1.6.7 | Cliente HTTP con interceptores, manejo de errores y soporte a TypeScript |
| **Frontend runtime** | Node.js | 20 LTS (`node:20-alpine`) | Versión LTS con soporte hasta abril 2026, mejoras de rendimiento V8 y compatibilidad ESM nativa |
| **Gestor deps. Node** | PNPM | (vía Corepack) | 2x más rápido que npm, ahorro de espacio en disco con almacén de contenido, lockfile estricto |
| **Orquestación** | Docker Compose | v2 | Orquestación local multi-servicio con red virtual aislada `casetech-network` |

---

## ¿Por qué UV y PNPM?

### UV (Gestor de dependencias Python)

**UV** es el reemplazo moderno de `pip` + `venv` + `pip-tools`, desarrollado por Astral (creadores de Ruff):

- ⚡ **10-100x más rápido** que pip gracias a su resolver escrito en Rust.
- 🔒 **Determinismo total**: `uv.lock` garantiza instalaciones idénticas en todos los entornos.
- 🛡️ **Auditoría integrada**: `uv pip audit` verifica CVEs sin dependencias adicionales.
- 📦 **Todo en uno**: gestiona entornos virtuales, dependencias y scripts de proyecto.

### PNPM (Gestor de paquetes Node)

**PNPM** supera a `npm` y `yarn` en equipos de desarrollo:

- 💾 **Almacén global de contenido**: los paquetes no se duplican entre proyectos (ahorro de ~60% de espacio en disco).
- ⚡ **2-3x más rápido** en instalaciones que npm gracias a la instalación paralela y caché inteligente.
- 🔒 **`--frozen-lockfile`**: las instalaciones en CI/Docker garantizan reproducibilidad exacta del `pnpm-lock.yaml`.
- 🚫 **Sin `node_modules` fantasmas**: las dependencias no declaradas no pueden importarse (seguridad por diseño).

---

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 26.0 con Docker Compose v2.
- Git ≥ 2.40.

---

## Inicio rápido

### 1. Clonar el repositorio

```bash
git clone https://github.com/<org>/casetech.git
cd casetech
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Edita .env con tus valores locales (contraseñas, secretos JWT, etc.)
```

### 3. Levantar el proyecto

```bash
docker compose up --build
```

Los servicios quedarán disponibles en:

| Servicio | URL |
|----------|-----|
| Frontend React | http://localhost:5173 |
| Backend FastAPI | http://localhost:8000 |
| Docs API (Swagger) | http://localhost:8000/docs |
| PostgreSQL | `localhost:5432` |

### 4. Detener los servicios

```bash
docker compose down
# Para eliminar también los volúmenes de datos:
docker compose down -v
```

---

## Migraciones de base de datos (Alembic)

Las migraciones se ejecutan automáticamente al iniciar el backend.  
Para gestión manual:

```bash
# Acceder al contenedor del backend
docker compose exec backend bash

# Crear una nueva migración
alembic revision --autogenerate -m "descripcion_del_cambio"

# Aplicar migraciones pendientes
alembic upgrade head

# Revertir la última migración
alembic downgrade -1

# Ver historial de migraciones
alembic history --verbose
```

---

## Auditorías de seguridad CVE

### Backend (Python)

```bash
docker compose exec backend uv pip audit
```

### Frontend (Node)

```bash
docker compose exec frontend pnpm audit --audit-level=moderate
```

> ⚠️ **Ambas auditorías deben ejecutarse antes de cada PR y en el pipeline de CI.**  
> Ver [SECURITY.md](./SECURITY.md) para la política completa.

---

## Desarrollo sin Docker

### Backend

```bash
cd backend
uv venv
source .venv/bin/activate   # Linux/Mac
.venv\Scripts\activate      # Windows PowerShell
uv pip install -e .
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm run dev
```

---

## Estructura del repositorio

```
casetech/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── feature_request.md
│   │   └── bug_report.md
│   └── PULL_REQUEST_TEMPLATE.md
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── alembic/
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── .env.example
├── .gitignore
├── CONTRIBUTING.md
├── SECURITY.md
├── README.md
└── docker-compose.yml
```

---

## Contribuir

Lee [CONTRIBUTING.md](./CONTRIBUTING.md) para conocer la estrategia Git Flow, Conventional Commits y el proceso de PR.

## Seguridad

Lee [SECURITY.md](./SECURITY.md) para reportar vulnerabilidades y conocer las políticas de seguridad del proyecto.

---

> **CASETECH** — Construido con ❤️ por el equipo de desarrollo.
