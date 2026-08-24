# Guía de Contribución — CASETECH

Gracias por contribuir al ERP de Gestión de Casetones **CASETECH**.  
Lee esta guía completa antes de abrir tu primera rama o PR.

---

## Estrategia de Ramas — Git Flow

El proyecto sigue **Git Flow** adaptado para un equipo de 4 desarrolladores:

```
main
 └── develop
      ├── feature/<modulo>-<tarea>
      ├── fix/<modulo>-<descripcion>
      └── release/<version>
```

### Descripción de ramas

| Rama | Propósito | Acceso |
|------|-----------|--------|
| `main` | Código en producción, siempre estable | Solo merge desde `release/*` via PR |
| `develop` | Integración continua del equipo | Merge desde `feature/*` via PR |
| `feature/<modulo>-<tarea>` | Desarrollo de nuevas funcionalidades | Cada desarrollador |
| `fix/<modulo>-<descripcion>` | Corrección de bugs en develop | Cada desarrollador |
| `release/<version>` | Preparación de release (semver) | Tech Lead |
| `hotfix/<descripcion>` | Parches urgentes en producción | Tech Lead |

### Ejemplos de nombres de rama válidos

```
feature/inventario-crud-material
feature/auth-login-jwt
fix/pedidos-calculo-total
release/1.2.0
hotfix/seguridad-sql-injection
```

---

## Conventional Commits

**Todos los commits deben** seguir el estándar [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/).

### Formato

```
<tipo>(<alcance>): <descripción corta en imperativo>

[cuerpo opcional — explica el QUÉ y el POR QUÉ]

[footer opcional — referencias a Issues: Closes #ID]
```

### Tipos permitidos

| Tipo | Cuándo usarlo |
|------|---------------|
| `feat` | Nueva funcionalidad para el usuario |
| `fix` | Corrección de un bug |
| `docs` | Cambios solo en documentación |
| `refactor` | Refactorización sin cambio de comportamiento |
| `chore` | Tareas de mantenimiento (deps, CI, configuración) |
| `test` | Añadir o corregir tests |
| `style` | Cambios de formato (espacios, comas) sin lógica |
| `perf` | Mejora de rendimiento |

### Ejemplos válidos

```
feat(inventario): agregar endpoint GET /materiales con paginación

fix(auth): corregir validación de token JWT expirado

Closes #42

docs(readme): actualizar instrucciones de instalación con UV

refactor(pedidos): extraer lógica de cálculo a servicio independiente

chore(deps): actualizar fastapi a 0.110.0 y ejecutar pnpm audit
```

---

## Flujo de trabajo paso a paso

### 1. Preparación

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<modulo>-<tarea>
```

### 2. Desarrollo

- Trabaja en tu rama local.
- Haz commits atómicos y descriptivos siguiendo Conventional Commits.
- **Nunca** hagas commits directamente a `main` o `develop`.

### 3. Antes de abrir el PR

```bash
# Backend
cd backend
uv pip audit                  # Auditoría CVE
uv run pytest                 # Tests unitarios

# Frontend
cd frontend
pnpm audit --audit-level=moderate
pnpm run lint
pnpm run build
```

### 4. Abrir Pull Request

- Abre el PR hacia `develop` usando la plantilla `.github/PULL_REQUEST_TEMPLATE.md`.
- Vincula el Issue correspondiente con `Closes #ID`.
- Asigna al menos **1 revisor** del equipo.
- Asegúrate de que **todos los checks del CI** pasan.

### 5. Code Review

- El revisor tiene **48 horas** para aprobar o solicitar cambios.
- Se requiere **1 aprobación** para merge a `develop`.
- Se requieren **2 aprobaciones** para merge a `main`.

### 6. Merge

- Usar **Squash and Merge** para ramas `feature/*`.
- Usar **Merge Commit** para `release/*` → `main`.
- Eliminar la rama remota tras el merge.

---

## Configuración del entorno local

### Backend

```bash
cd backend
uv venv
source .venv/bin/activate   # Linux/Mac
.venv\Scripts\activate      # Windows
uv pip install -e .
```

### Frontend

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm run dev
```

### Con Docker (recomendado)

```bash
docker compose up --build
```

---

## Estándares de código

- **Python**: Seguir PEP 8, usar `ruff` para linting y formateo.
- **JavaScript/JSX**: ESLint con configuración del proyecto.
- Las funciones deben tener docstrings o JSDoc cuando la lógica no es trivial.
- Cobertura de tests mínima: **70%** por módulo nuevo.
