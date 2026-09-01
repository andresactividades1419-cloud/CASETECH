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

El núcleo del sistema es un **Motor BOM (Bill of Materials)** transaccional que procesa dos naturalezas de materias primas:

| Naturaleza | Materiales de Ejemplo | Comportamiento en Inventario |
|---|---|---|
| **Recuperable** | Lona de alta resistencia, Guadua tratada | Se reutiliza en múltiples ciclos de vaciado; descuento parcial por desgaste o mantenimiento. |
| **Material Perdido** | Icopor EPS, cemento, acero, malla | Se consume íntegramente en cada orden de producción. |

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
│  • PostgreSQL 16 (12 tablas 3FN, transacciones atómicas)    │
│  • Docker Compose v2 (Red aislada: casetech-network)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 3. Inicio Rápido con Docker Compose

El proyecto está completamente contenerizado y listo para desplegarse localmente con un único comando:

### Paso 1: Clonar y configurar variables de entorno
```bash
git clone https://github.com/andres1419/CASETECH.git
cd CASETECH

# Copiar plantilla de variables de entorno
cp .env.example .env
```

### Paso 2: Iniciar todo el stack
```bash
docker compose up --build -d
```

### Paso 3: Aplicar migraciones iniciales y Stored Procedures
```bash
docker compose exec backend alembic upgrade head
```

---

## 🌐 4. Puntos de Acceso del Sistema

Una vez iniciado el stack, los servicios estarán disponibles en:

| Servicio | URL Local | Descripción |
|---|---|---|
| **Frontend Web** | [http://localhost:3000](http://localhost:3000) | Aplicación React SPA (Login, Dashboard, Pedidos, Inventario, Usuarios) |
| **Backend REST API** | [http://localhost:8000](http://localhost:8000) | Endpoints FastAPI `/api/v1` |
| **Documentación OpenAPI** | [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs) | Swagger UI interactivo |
| **Base de Datos** | `localhost:5432` | PostgreSQL 16 (`casetech_db`) |

---

## 👥 5. Matriz de Roles y Credenciales de Demostración

El sistema incluye siembra idempotente automática de cuentas base para pruebas y auditoría:

| Rol | Correo Electrónico | Contraseña Inicial | Alcance de Permisos |
|---|---|---|---|
| **ADMINISTRADOR** | `admin@casetech.com` | `Admin1234*` | **Acceso total**: Gestión de usuarios (HU02), proveedores, compras, ajustes de inventario, aprobación de auditorías y reportes. |
| **OPERARIO** | `operario@casetech.com` | `Operario1234*` | **Operativo**: Registro de pedidos, consulta de balance BOM (HU11), solicitudes de ajuste y visualización de stock. |

---

## 🗄️ 6. Stored Procedures Atómicos en Base de Datos

CASETECH delega la lógica crítica de concurrencia y descuento de inventario directamente en el motor PostgreSQL mediante procedimientos almacenados con bloqueo pesimista (`SELECT ... FOR UPDATE`):

1. **`sp_descontar_receta(pedido_id, usuario_id)`**:
   - Valida existencias en tiempo real de la receta BOM asociada al tipo de casetón.
   - Aplica descuento diferenciado de materias primas recuperables vs. perdidas.
   - Si existe déficit de stock, cancela la transacción atómicamente y emite excepción con código `P0001` detallando el insumo faltante.
2. **`sp_crear_proveedor(...)`**:
   - Inserta proveedores garantizando unicidad de NIT/RUC.
3. **`sp_ajuste_inventario(ajuste_id, revisor_id, aprobado)`**:
   - Aplica ajustes de inventario con doble firma y registro inmutable en el Kardex.

---

## 🧪 7. Pruebas y Auditorías de Seguridad

### Pruebas Unitarias e Integración
```bash
# Backend (Pytest async)
docker compose exec backend pytest -v tests/

# Frontend (Vitest)
docker compose exec frontend pnpm run test -- --run
```

### Auditorías de Vulnerabilidades (CVE)
```bash
# Backend (pip-audit estricto)
docker compose exec backend uv run pip-audit -r req.txt --strict

# Frontend (PNPM audit)
docker compose exec frontend pnpm audit --audit-level=moderate
```

---

## 📁 8. Estructura del Repositorio

```
CASETECH/
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints v1 (auth, users, orders, materials, providers, etc.)
│   │   ├── core/         # Configuración (SecretStr, fail-fast), seguridad y BD
│   │   ├── models/       # 12 Modelos ORM SQLAlchemy 2.0 (3FN)
│   │   ├── schemas/      # Validación y serialización Pydantic v2
│   │   └── services/     # Lógica de dominio y consumo de Stored Procedures
│   ├── alembic/          # Migraciones de esquema y scripts SQL de Stored Procedures
│   └── pyproject.toml    # Gestión de paquetes con Astral UV
├── frontend/
│   ├── src/
│   │   ├── api/          # Clientes Axios tipados
│   │   ├── components/   # Modales y componentes modulares (BOM, Usuarios, etc.)
│   │   ├── context/      # Contexto global de autenticación JWT
│   │   ├── pages/        # Vistas completas del ERP
│   │   └── routes/       # Enrutamiento y Guards RBAC (ProtectedRoute)
│   └── package.json      # Gestión con PNPM
├── docs/                 # Documentación técnica de arquitectura y negocio
├── .env.example          # Plantilla pública de variables de entorno
├── docker-compose.yml    # Orquestación multi-contenedor
├── LICENSE               # Licencia MIT
├── SECURITY.md           # Política de seguridad y reporte CVE
└── README.md             # Documentación principal
```

---

## 📄 9. Licencia y Gobernanza

Este proyecto se distribuye bajo la licencia **MIT**. Consulta el archivo [LICENSE](./LICENSE) para más detalles.

Para detalles sobre contribución y estándares Git Flow / Conventional Commits, consulta [CONTRIBUTING.md](./CONTRIBUTING.md).
