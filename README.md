<div align="center">

# 🧱 CASETECH ERP

**Sistema Integral de Planificación de Recursos Empresariales (ERP) para la Fabricación de Casetones de Concreto**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_Alpine-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Astral UV](https://img.shields.io/badge/UV-Fast_Python_Package_Manager-DE5FE9.svg?logo=python&logoColor=white)](https://docs.astral.sh/uv/)
[![PNPM](https://img.shields.io/badge/PNPM-Fast_Disk_Efficient-F69220.svg?logo=pnpm&logoColor=white)](https://pnpm.io)
[![Docker Compose](https://img.shields.io/badge/Docker_Compose-v2-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

</div>

---

## 📖 1. Resumen del Negocio y Motor BOM

**CASETECH** es una solución ERP especializada en la industria de la construcción para la manufactura, ensamblaje y control de inventario de **casetones de concreto**.

El núcleo del sistema es un **Motor BOM (Bill of Materials)** transaccional: cada tipo de casetón (Lona, Guadua, Icopor/EPS) tiene una receta de materias primas (madera, lona, guadua, icopor, alambre, puntillas, etc.) que se descuenta automáticamente del inventario al confirmar el inicio de producción de un pedido. Los 3 tipos de casetón se venden como producto terminado — ninguno regresa a la fábrica — y se tratan igual frente al inventario: no existe ninguna categoría de "material recuperable", todo insumo se descuenta una sola vez al fabricar.

---

## 🛠️ 2. Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────┐
│                       CASETECH ERP                          │
├──────────────────────────────┬──────────────────────────────┤
│       BACKEND (FastAPI)      │       FRONTEND (React 18)    │
│  • Python 3.11 + UV          │  • React 18 + React Router 6 │
│  • SQLAlchemy 2.0 (Async)    │  • Axios + Interceptores JWT │
│  • Alembic 1.13 + Stored Proc│  • PNPM (Corepack) + Vite    │
│  • Pydantic v2 + Bcrypt/JWT  │  • Vanilla CSS Moderno       │
├──────────────────────────────┴──────────────────────────────┤
│                   BASE DE DATOS & INFRAESTRUCTURA           │
│  • PostgreSQL 16 (13 tablas 3FN, transacciones atómicas)    │
│  • Docker Compose v2 (Red aislada: casetech-network)        │
│  • Nginx (producción): sirve la interfaz y reenvía la API   │
└─────────────────────────────────────────────────────────────┘
```

El diagrama de arquitectura completo (contenedores, capas del backend, frontend, CI) está en [`docs/06-arquitectura.md`](./docs/06-arquitectura.md).

---

## 🚀 3. Inicio Rápido con Docker Compose

El proyecto está completamente contenerizado y listo para ejecutarse localmente (modo **desarrollo**):

### Paso 1: Clonar y configurar variables de entorno
```bash
git clone https://github.com/andresactividades1419-cloud/CASETECH.git
cd CASETECH

# Copiar plantilla de variables de entorno
cp .env.example .env
```

### Paso 2: Iniciar todo el stack
```bash
docker compose up --build -d
```

Al arrancar, el backend aplica solo las migraciones de Alembic (incluidos los Stored Procedures) y siembra los roles y los usuarios de demostración. El primer arranque tarda un par de minutos mientras se instalan las dependencias del frontend.

### Paso 3: Verificar que todo esté sano
```bash
docker compose ps                      # los 3 servicios deben decir "healthy" o "Up"
curl http://localhost:8000/health      # {"status":"ok", ..., "database":"ok"}
```

Luego abre [http://localhost:3000](http://localhost:3000) e inicia sesión con las credenciales de la sección 5.

> Si necesitas aplicar las migraciones a mano: `docker compose exec backend alembic upgrade head`.

---

## 🌐 4. Puntos de Acceso del Sistema

Una vez iniciado el stack, los servicios estarán disponibles en:

| Servicio | URL Local | Descripción |
|---|---|---|
| **Frontend Web** | [http://localhost:3000](http://localhost:3000) | Aplicación React SPA (Login, Dashboard, Pedidos, Inventario, Usuarios) |
| **Backend REST API** | [http://localhost:8000](http://localhost:8000) | Endpoints FastAPI `/api/v1` |
| **Documentación OpenAPI** | [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs) | Swagger UI interactivo (solo en desarrollo; se desactiva en producción) |
| **Estado del servicio** | [http://localhost:8000/health](http://localhost:8000/health) | Responde 200 si el backend está arriba y conecta con la base de datos (503 si no) |
| **Base de Datos** | `localhost:5432` | PostgreSQL 16 (`casetech_db`) |

---

## 👥 5. Matriz de Roles y Credenciales de Demostración

En **desarrollo**, el sistema incluye siembra idempotente automática de cuentas base para pruebas y auditoría. **No se crean en producción** (ver la sección 9).

| Rol | Correo Electrónico | Contraseña Inicial | Alcance de Permisos |
|---|---|---|---|
| **ADMINISTRADOR** | `admin@casetech.com` | `Admin1234*` | **Acceso total**: Gestión de usuarios (HU02), proveedores, compras, ajustes de inventario, aprobación de auditorías, recetas y reportes. |
| **OPERARIO** | `operario@casetech.com` | `Operario1234*` | **Operativo**: Registro de pedidos, consulta de balance BOM (HU11), solicitudes de ajuste y visualización de stock. |

---

## 🗄️ 6. Stored Procedures Atómicos en Base de Datos

CASETECH delega la lógica crítica de concurrencia y descuento de inventario directamente en el motor PostgreSQL mediante procedimientos almacenados con bloqueo pesimista (`SELECT ... FOR UPDATE`):

1. **`sp_descontar_receta(pedido_id, usuario_id)`**:
   - Valida existencias en tiempo real de la receta BOM asociada al tipo de casetón.
   - Descuenta cada materia prima de la receta una sola vez, sin distinción por tipo de casetón (los 3 tipos se tratan igual).
   - Si existe déficit de stock, cancela la transacción atómicamente y emite excepción con código `P0001` detallando el insumo faltante.
2. **`sp_revertir_receta(pedido_id, usuario_id)`**:
   - Se ejecuta al cancelar un pedido que está `EN_PRODUCCION`: devuelve al inventario las materias primas ya descontadas, porque la producción no se completó y el material está intacto.
3. **`sp_crear_proveedor(...)`**:
   - Inserta proveedores garantizando unicidad de NIT/RUC.
4. **`sp_ajuste_inventario(ajuste_id, revisor_id, aprobado)`**:
   - Aplica ajustes de inventario con doble firma y registro inmutable en el Kardex.

---

## 🔌 7. API REST

La API vive bajo `/api/v1` y devuelve JSON. En desarrollo se puede explorar y probar de forma interactiva en [Swagger UI](http://localhost:8000/api/v1/docs); en producción esa documentación está desactivada, por eso esta tabla es la referencia.

### Cómo usarla

```bash
# 1) Iniciar sesión (formulario OAuth2: el campo "username" lleva el correo)
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -d "username=admin@casetech.com" -d "password=Admin1234*"
# → {"access_token":"<JWT>","token_type":"bearer"}   (y una cookie httpOnly de renovación)

# 2) Llamar a cualquier endpoint protegido con el token
curl -s http://localhost:8000/api/v1/materials/ -H "Authorization: Bearer <JWT>"
```

- El **token de acceso** dura 30 minutos. `POST /auth/refresh` lo renueva con la cookie de sesión (7 días, se rota en cada uso).
- Los errores siempre tienen el formato `{"detail": "mensaje"}`. Códigos usados: `200`, `201`, `401` (sin sesión), `403` (sin permiso), `404`, `409` (conflicto), `422` (datos inválidos), `429` (demasiados intentos) y `500` (error interno, sin detalles técnicos).
- Los roles son `ADMINISTRADOR` y `OPERARIO`. En la columna **Acceso**, "Autenticado" significa que sirve cualquier usuario con sesión.
- Las rutas de lista y creación se declaran con barra final (`/materials/`). Si se llama sin ella (`/materials`), el servidor responde con una redirección 307 a la forma correcta; conviene usar siempre la barra final.

### Endpoints (50)

Todas las rutas llevan el prefijo `/api/v1` (excepto `/health`).

#### Autenticación

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/auth/login` | Público | Iniciar sesión. Límite: 10 por minuto por IP; bloqueo a los 5 fallos |
| `POST` | `/auth/logout` | Cookie de sesión | Cerrar sesión. |
| `GET` | `/auth/me` | Autenticado | Perfil del usuario actual. |
| `POST` | `/auth/refresh` | Cookie de sesión | Renovar el access token. |
| `POST` | `/auth/register` | ADMINISTRADOR | Registrar nuevo usuario ⚠️ Heredado: duplica `/users` ([#127](https://github.com/andresactividades1419-cloud/CASETECH/issues/127)) |
| `GET` | `/auth/users` | ADMINISTRADOR | Listar usuarios del sistema (HU02) ⚠️ Heredado: duplica `/users` ([#127](https://github.com/andresactividades1419-cloud/CASETECH/issues/127)) |
| `DELETE` | `/auth/users/{user_id}` | ADMINISTRADOR | Desactivar lógicamente un usuario (HU02) ⚠️ Heredado: duplica `/users` ([#127](https://github.com/andresactividades1419-cloud/CASETECH/issues/127)) |
| `PATCH` | `/auth/users/{user_id}` | ADMINISTRADOR | Actualizar cuenta de usuario (HU02) ⚠️ Heredado: duplica `/users` ([#127](https://github.com/andresactividades1419-cloud/CASETECH/issues/127)) |

#### Usuarios

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/users/` | ADMINISTRADOR | Listar usuarios del sistema (HU02). |
| `POST` | `/users/` | ADMINISTRADOR | Registrar nueva cuenta de usuario (HU02/HU14). |
| `GET` | `/users/{user_id}` | ADMINISTRADOR | Detalle de un usuario (HU02). |
| `PUT` | `/users/{user_id}` | ADMINISTRADOR | Actualizar cuenta de usuario (HU02). |
| `PATCH` | `/users/{user_id}/status` | ADMINISTRADOR | Activar o desactivar cuenta de usuario (HU02). |

#### Proveedores

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/providers/` | Autenticado | Listar proveedores. |
| `POST` | `/providers/` | ADMINISTRADOR | Registrar proveedor. |
| `GET` | `/providers/{provider_id}` | Autenticado | Detalle de proveedor. |
| `PUT` | `/providers/{provider_id}` | ADMINISTRADOR | Actualizar proveedor. |
| `PATCH` | `/providers/{provider_id}/status` | ADMINISTRADOR | Alternar estado del proveedor. |

#### Materiales

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/materials/` | Autenticado | Listar materiales e inventario. |
| `POST` | `/materials/` | ADMINISTRADOR | Registrar nuevo material o insumo. |
| `GET` | `/materials/{material_id}` | Autenticado | Detalle de un material. |
| `PUT` | `/materials/{material_id}` | ADMINISTRADOR | Actualizar material. |
| `PATCH` | `/materials/{material_id}/status` | ADMINISTRADOR | Alternar estado activo/inactivo (Borrado Lógico). |

#### Compras

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/purchases/` | Autenticado | Listar órdenes de compra con filtros y paginación. |
| `POST` | `/purchases/` | Autenticado | Registrar una nueva orden de compra e ingresar stock. |
| `GET` | `/purchases/{id}` | Autenticado | Consultar detalle de una orden de compra. |

#### Tipos de Casetón

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/product-types/` | Autenticado | Catálogo de tipos de casetón activos. |

#### Pedidos

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/orders/` | Autenticado | Listar pedidos de producción. |
| `POST` | `/orders/` | Autenticado | Registrar nuevo pedido de producción. |
| `GET` | `/orders/{order_id}` | Autenticado | Detalle de un pedido de producción. |
| `GET` | `/orders/{order_id}/recipe-preview` | Autenticado | Previsualización de consumo BOM y balance de stock (HU11). |
| `PATCH` | `/orders/{order_id}/status` | Autenticado | Cambiar estado del pedido (Motor BOM). |

#### Recetas BOM

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/recipes/` | Autenticado | Listar recetas BOM. |
| `POST` | `/recipes/` | ADMINISTRADOR | Agregar material a una receta. |
| `DELETE` | `/recipes/{recipe_id}` | ADMINISTRADOR | Eliminar un material de una receta. |
| `PUT` | `/recipes/{recipe_id}` | ADMINISTRADOR | Actualizar cantidad de una receta. |

#### Ajustes de Inventario

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/stock-adjustments/` | Autenticado | Listar solicitudes y movimientos de ajuste de inventario. |
| `POST` | `/stock-adjustments/` | Autenticado | Solicitar un nuevo ajuste manual de inventario (HU13). |
| `GET` | `/stock-adjustments/{id}` | Autenticado | Consultar detalle de un ajuste de inventario. |
| `POST` | `/stock-adjustments/{id}/review` | ADMINISTRADOR | Aprobar o rechazar solicitud de ajuste. |

#### Dashboard & Auditoría

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/dashboard/audit-logs` | ADMINISTRADOR | Consultar logs de auditoría del sistema. |
| `GET` | `/dashboard/audit-logs/export-csv` | ADMINISTRADOR | Exportar Bitácora de Auditoría a formato CSV (HU06, RF12). |
| `GET` | `/dashboard/metrics` | Autenticado | Obtener métricas y KPIs globales del ERP (HU15). |
| `GET` | `/dashboard/movements` | Autenticado | Consultar trazabilidad de movimientos de inventario (Kardex). |
| `GET` | `/dashboard/movements/export-csv` | Autenticado | Exportar movimientos de Kardex a formato CSV (HU06, RF12) ⚠️ Abierto al OPERARIO ([#126](https://github.com/andresactividades1419-cloud/CASETECH/issues/126)) |

#### Reportes

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/reports/kardex/export-csv` | ADMINISTRADOR | Exportar historial de Kardex a CSV (HU06, RF12). |
| `GET` | `/reports/materials/export-csv` | ADMINISTRADOR | Exportar Stock Actual a CSV (R04, RF12). |
| `GET` | `/reports/orders/export-csv` | ADMINISTRADOR | Exportar historial de Pedidos a CSV (R01, RF12). |
| `GET` | `/reports/providers/export-csv` | ADMINISTRADOR | Exportar directorio de Proveedores a CSV (R05, RF12). |

#### Infraestructura

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/health` | Público | Estado del servicio. |


> ⚠️ Los defectos conocidos de permisos (#124, #126, #127) están registrados en el tablero y detallados en [`docs/reporte-ejecucion-pruebas.md`](./docs/reporte-ejecucion-pruebas.md).

---

## 🧪 8. Pruebas, Cobertura y Auditorías de Seguridad

La estrategia completa (riesgos, qué se prueba y qué no, ambientes) está en [`docs/estrategia-pruebas.md`](./docs/estrategia-pruebas.md), y los resultados de la última ejecución con el registro de defectos en [`docs/reporte-ejecucion-pruebas.md`](./docs/reporte-ejecucion-pruebas.md).

| Nivel | Pruebas | Herramienta | Cobertura (umbral mínimo) |
|---|---|---|---|
| Backend (unitarias + API) | 106 | pytest + httpx, SQLite en memoria | 76,96 % (76 %) |
| Backend (integración con BD real) | 21 | pytest contra PostgreSQL 16 (`db-test`) | — (se mide aparte) |
| Frontend (unitarias + componentes) | 138 | Vitest + Testing Library + MSW | 73,22 % (73 %) |
| Extremo a extremo (E2E) | 6 | Playwright (Chromium) | — |

Si la cobertura baja de su umbral mínimo, las pruebas fallan (localmente y en el CI).

### Pruebas del backend
```bash
# Usar "uv run", no "pytest" directo: la imagen solo instala dependencias de
# producción; "uv run" sincroniza el grupo "dev" al vuelo.
docker compose exec backend uv run pytest -v tests/
```
Al terminar imprime la cobertura por archivo y las líneas sin cubrir. Las pruebas usan una base SQLite en memoria que se recrea antes de cada test: **no tocan** la base de desarrollo.

### Pruebas de integración con PostgreSQL real
Corren contra una base de pruebas desechable (`db-test`, puerto 5433, BD `casetech_test`) que **no es** la de desarrollo. El esquema se crea con las mismas migraciones de Alembic que producción, y cada test se deshace con rollback al terminar.
```bash
# 1) Levantar la BD de pruebas (espera a que esté lista)
docker compose up -d --wait db-test

# 2) Correr los tests de integración
docker compose exec -e TEST_DATABASE_URL=postgresql+asyncpg://casetech_test:casetech_test@db-test:5432/casetech_test backend uv run pytest tests/integration -o addopts=""

# 3) Apagarla (sus datos viven en memoria: se borran al apagarla)
docker compose stop db-test
```
> ⚠️ **No uses `docker compose down -v`** para apagar la BD de pruebas: ese comando borra también el volumen de la base de **desarrollo** (`postgres_data`).

Sin `TEST_DATABASE_URL`, estos tests aparecen como *skipped* y el resto de la suite (y el CI) sigue igual. Si la URL apunta a una BD cuyo nombre no termina en `_test`, los tests se detienen antes de conectarse.

### Pruebas del frontend
```bash
docker compose exec frontend pnpm run test:run
```

### Pruebas de extremo a extremo (Playwright)
Necesitan el stack de desarrollo levantado (`docker compose up -d`) y los usuarios de demostración.
```bash
cd e2e
pnpm install
pnpm exec playwright install chromium   # solo la primera vez
pnpm test                                # o: pnpm run test:ui  (modo visual)
pnpm run report                          # abre el informe HTML de la última ejecución
```
Si el frontend corre en otro puerto: `FRONT_PORT=3001 pnpm test`.

### Calidad de código
```bash
docker compose exec backend uv run ruff check .      # estilo
docker compose exec backend uv run mypy app/         # tipos
docker compose exec frontend pnpm run lint           # ESLint
docker compose exec frontend pnpm run build          # compilación de producción
```

### Auditorías de Vulnerabilidades (CVE)
```bash
# Backend (pip-audit estricto) — primero exportar los requisitos de
# producción (--no-emit-project excluye el propio paquete editable,
# que no se puede verificar por hash), luego auditar:
docker compose exec backend sh -c "uv export --no-dev --no-emit-project --format requirements-txt > req.txt && uv run pip-audit -r req.txt --strict"

# Frontend (PNPM audit)
docker compose exec frontend pnpm audit --audit-level=moderate
```

### Integración continua
`.github/workflows/tests.yml` ejecuta en cada *push* o *pull request* hacia `main` o `develop`: **Backend** (Ruff, MyPy, pip-audit, Pytest) y **Frontend** (ESLint, pnpm audit, Vitest, build). Ambos son obligatorios para fusionar a `main`. Los E2E se ejecutan a mano.

---

## 🏭 9. Despliegue en Producción

Producción usa `docker-compose.prod.yml`: solo se publica el puerto de Nginx; el backend y la base de datos quedan en una red interna.

```bash
# 1) Configurar .env con valores REALES (POSTGRES_PASSWORD y JWT_SECRET son obligatorios)
cp .env.example .env

# 2) Construir y levantar
docker compose -f docker-compose.prod.yml up --build -d

# 3) Crear el primer administrador (en producción no se siembran usuarios)
docker compose -f docker-compose.prod.yml exec backend python -m app.scripts.create_admin --email admin@tuempresa.com
```

| Variable | Obligatoria | Para qué sirve |
|---|---|---|
| `POSTGRES_PASSWORD` | Sí | Contraseña de la base de datos (no puede ser la de `.env.example`) |
| `JWT_SECRET` | Sí | Clave de firma de los tokens, mínimo 32 bytes y distinta a la de `.env.example`: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `FRONTEND_PORT` | No (80) | Puerto donde se publica el sitio |
| `CORS_ORIGINS` | No | Solo si el frontend y la API están en dominios distintos |
| `SQL_ECHO` | No (`false`) | Imprime cada consulta SQL en el log (solo para depurar) |

Si falta una variable obligatoria, el backend **no arranca** y explica cuál. Para un servidor real hace falta **HTTPS** (la cookie de sesión es `Secure`). Guía completa, problemas conocidos y detalles de HTTPS: [`docs/07-despliegue.md`](./docs/07-despliegue.md).

---

## 📚 10. Documentación del Proyecto

| Documento | Contenido |
|---|---|
| [`docs/01-analisis-y-alcance.md`](./docs/01-analisis-y-alcance.md) | Análisis del negocio y alcance |
| [`docs/02-requisitos-sistema.md`](./docs/02-requisitos-sistema.md) | Requisitos funcionales (RF01–RF19) y no funcionales |
| [`docs/03-historias-de-usuario.md`](./docs/03-historias-de-usuario.md) | 30 historias de usuario con criterios de aceptación y Sprints |
| [`docs/04-modelo-datos.md`](./docs/04-modelo-datos.md) | Modelo de datos (13 tablas) y diccionario |
| [`docs/05-modelado-y-diagramas.md`](./docs/05-modelado-y-diagramas.md) | MER, modelo relacional, casos de uso, clases, secuencia y estados |
| [`docs/06-arquitectura.md`](./docs/06-arquitectura.md) | Arquitectura del sistema, decisiones y limitaciones |
| [`docs/07-despliegue.md`](./docs/07-despliegue.md) | Despliegue, variables de entorno y HTTPS |
| [`docs/estrategia-pruebas.md`](./docs/estrategia-pruebas.md) | Plan de pruebas |
| [`docs/reporte-ejecucion-pruebas.md`](./docs/reporte-ejecucion-pruebas.md) | Resultados de ejecución y registro de defectos con severidad |
| [`docs/scrum/`](./docs/scrum) | Product backlog y planning poker |
| [`docs/equipo-y-retrospectiva.md`](./docs/equipo-y-retrospectiva.md) | Roles Scrum, reparto del trabajo, proceso de revisión y plantilla de retrospectiva |
| [`docs/matriz-rotacion.md`](./docs/matriz-rotacion.md) | Rotación de capas por semana y cobertura semanal |
| [`docs/lista-de-chequeo-entrega.md`](./docs/lista-de-chequeo-entrega.md) | Estado de los 14 criterios de entrega, con evidencia y pendientes |

---

## 📁 11. Estructura del Repositorio

```
CASETECH/
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints v1 (auth, users, orders, materials, providers, etc.)
│   │   ├── core/         # Configuración (SecretStr, fail-fast), seguridad y BD
│   │   ├── models/       # 13 Modelos ORM SQLAlchemy 2.0 (3FN)
│   │   ├── schemas/      # Validación y serialización Pydantic v2
│   │   ├── scripts/      # Comandos de administración (create_admin)
│   │   └── services/     # Lógica de dominio y consumo de Stored Procedures
│   ├── alembic/          # Migraciones de esquema y scripts SQL de Stored Procedures
│   ├── tests/            # Pruebas pytest (46)
│   └── pyproject.toml    # Gestión de paquetes con Astral UV
├── frontend/
│   ├── src/
│   │   ├── api/          # Clientes Axios tipados
│   │   ├── components/   # Modales y componentes modulares (BOM, Usuarios, etc.)
│   │   ├── context/      # Contexto global de autenticación JWT
│   │   ├── pages/        # Vistas completas del ERP
│   │   ├── routes/       # Enrutamiento y Guards RBAC (ProtectedRoute)
│   │   └── tests/        # Pruebas Vitest
│   ├── nginx.conf        # Nginx de producción (proxy de /api y SPA)
│   └── package.json      # Gestión con PNPM
├── e2e/                  # Pruebas de extremo a extremo (Playwright)
├── docs/                 # Documentación técnica, de negocio, de pruebas y Scrum
├── .github/workflows/    # CI con GitHub Actions
├── .env.example          # Plantilla pública de variables de entorno
├── docker-compose.yml    # Orquestación para desarrollo
├── docker-compose.prod.yml # Orquestación para producción
├── LICENSE               # Licencia MIT
├── SECURITY.md           # Política de seguridad y reporte CVE
└── README.md             # Documentación principal
```

---

## 📄 12. Licencia y Gobernanza

Este proyecto se distribuye bajo la licencia **MIT**. Consulta el archivo [LICENSE](./LICENSE) para más detalles.

Para detalles sobre contribución y estándares Git Flow / Conventional Commits, consulta [CONTRIBUTING.md](./CONTRIBUTING.md).
