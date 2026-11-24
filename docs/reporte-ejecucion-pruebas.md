# Reporte de ejecución de pruebas y registro de defectos — CASETECH ERP

> **Fecha de ejecución:** 2026-11-20 · **Rama:** `test/semana-01` (commit base `b72a89c` más cambios aún sin commitear)
> **Responsables:** Andrés Fernández · Oscar Ruiz · Javier Sepúlveda
> **Relacionado:** [`estrategia-pruebas.md`](./estrategia-pruebas.md) (qué se prueba y por qué) · [`06-arquitectura.md`](./06-arquitectura.md) · [`07-despliegue.md`](./07-despliegue.md)

## 1. Resumen

- **51 pruebas automáticas ejecutadas, 51 aprobadas, 0 fallidas** (46 backend + 2 frontend + 3 E2E). Lint, tipos y build en verde.
- **29 defectos registrados: 15 corregidos y 14 abiertos.** No hay defectos críticos abiertos; hay **1 de severidad alta** abierto ([#123](https://github.com/andresactividades1419-cloud/CASETECH/issues/123): los Stored Procedures no se prueban contra PostgreSQL).
- Cobertura: backend **68,90 %** (umbral 68 %), frontend **0,76 %** (umbral 0,5 %). El frontend es el punto más débil.

## 2. Entorno de la ejecución

| Elemento | Valor |
|---|---|
| Equipo | Windows 11 + Docker Desktop (stack de desarrollo: `casetech-backend`, `casetech-db`, `casetech-frontend`) |
| Backend | Python 3.11, FastAPI 0.141.1, UV 0.12.10 |
| Base de datos de las pruebas de backend | SQLite en memoria, recreada antes de cada test (la de desarrollo, PostgreSQL 16.15, no se toca) |
| Frontend | Node 20.20.2, PNPM 9.1.0, Vitest 3.2.7 |
| E2E | Playwright (Chromium) contra el stack de desarrollo, con los usuarios sembrados por `init_db` |

## 3. Resultados por suite

| Suite | Comando | Ejecutadas | Aprobadas | Fallidas | Duración | Resultado |
|---|---|---|---|---|---|---|
| Pruebas backend | `pytest -v tests/` | 46 | 46 | 0 | 56 s | ✅ |
| Lint backend | `ruff check .` | — | — | 0 errores | — | ✅ |
| Tipos backend | `mypy app/` | 60 archivos | — | 0 errores | — | ✅ |
| Lint frontend | `pnpm run lint` | — | — | 0 avisos | — | ✅ |
| Pruebas frontend | `pnpm run test:run` | 2 | 2 | 0 | 16 s | ✅ |
| Build de producción | `pnpm run build` | 127 módulos | — | 0 errores | 10 s | ✅ |
| E2E | `npx playwright test` | 3 | 3 | 0 | 20 s | ✅ |
| **Total de pruebas** | | **51** | **51** | **0** | | ✅ |

Detalle de las pruebas de backend:

| Archivo | Pruebas | Qué cubre |
|---|---|---|
| `test_endpoints.py` | 9 | CRUD de usuarios y recetas (solo admin), vista previa de receta, 6 exportaciones CSV con control de rol |
| `test_transactions.py` | 5 | Déficit de stock → 422, máquina de estados, doble firma, reversión al cancelar, reintento por colisión de código |
| `test_config_security.py` | 13 | Credenciales y `JWT_SECRET` de ejemplo rechazados fuera de desarrollo |
| `test_auth_refresh.py` | 5 | Cookie de renovación, rotación del token, cierre de sesión |
| `test_startup.py` | 6 | `/health` (200 y 503), errores 500 sin filtrar detalles, mensajes de variables faltantes |
| `test_create_admin.py` | 6 | Script del primer administrador |
| `test_auth_lockout.py` | 2 | Bloqueo a los 5 intentos y reinicio con login correcto |

Los 3 E2E: login de administrador, login con usuario inexistente (mensaje "Credenciales inválidas") y recorrido por todos los módulos del menú verificando su título.

## 4. Cobertura

| Parte | Cobertura | Umbral | Estado |
|---|---|---|---|
| Backend | 68,90 % | 68 % | ✅ |
| Frontend | 0,76 % (solo `client.js`, 56,6 %) | 0,5 % | ✅ (pero casi sin pruebas) |

Módulos del backend con **menor cobertura** (las rutas que más conviene cubrir):

| Módulo | Cobertura |
|---|---|
| `user_service.py` | 15 % |
| `provider_service.py` | 14 % |
| `material_service.py` | 16 % |
| `purchase_service.py` | 19 % |
| `init_db.py` | 20 % |
| `stock_adjustment_service.py` | 36 % |
| `dashboard_service.py` | 36 % |

Módulos mejor cubiertos: `recipes` (100 % en endpoints, 86 % en servicio), `auth` (90 %), `reports` (84 %), `order_service` (67 %).

> **Nota sobre la medición.** Antes de hoy el backend se medía en 57 %. Era un error de medición: `coverage` no seguía el código que corre dentro de *greenlets* (usados por SQLAlchemy asíncrono). Se añadió `concurrency = ["greenlet", "thread"]` y el valor real es 68,90 %. Ver la fila 14 de la tabla de defectos corregidos.

## 5. Registro de defectos

### 5.1 Escala de severidad

| Severidad | Criterio |
|---|---|
| **Crítica** | Pérdida o corrupción de datos, o brecha de seguridad explotable. Sin alternativa. |
| **Alta** | Función clave rota o dato de negocio incorrecto. Alternativa limitada. |
| **Media** | Comportamiento incorrecto o confuso; la función principal sigue operando. |
| **Baja** | Cosmético, documentación o riesgo remoto. |

Cada issue de GitHub lleva su etiqueta `severidad: crítica | alta | media | baja`. Los estados son: **Abierto** (issue abierto, en el tablero) y **Corregido** (cerrado, o corregido en esta rama pendiente de commit).

### 5.2 Resumen

| Severidad | Corregidos | Abiertos | Total |
|---|---|---|---|
| Crítica | 2 | 0 | 2 |
| Alta | 8 | 1 | 9 |
| Media | 3 | 7 | 10 |
| Baja | 2 | 6 | 8 |
| **Total** | **15** | **14** | **29** |

### 5.3 Defectos abiertos

| ID | Defecto | Severidad | Capa que lo detectó |
|---|---|---|---|
| [#123](https://github.com/andresactividades1419-cloud/CASETECH/issues/123) | Stored Procedures sin prueba contra PostgreSQL y lógica duplicada en Python (`if is_sqlite`) | **Alta** | Análisis de la suite |
| [#118](https://github.com/andresactividades1419-cloud/CASETECH/issues/118) | Las fechas de entrega se muestran un día antes (UTC vs hora local) | Media | Revisión visual |
| [#119](https://github.com/andresactividades1419-cloud/CASETECH/issues/119) | El signo del Kardex (pantalla y CSV) no refleja si el stock sube o baja: la columna `cantidad` mezcla convenciones | Media | Revisión visual y de datos |
| [#126](https://github.com/andresactividades1419-cloud/CASETECH/issues/126) | La exportación del Kardex queda abierta al OPERARIO por `/dashboard` y el test protege otra ruta (falsa seguridad) | Media | Revisión de la tabla de endpoints |
| [#127](https://github.com/andresactividades1419-cloud/CASETECH/issues/127) | El CRUD de usuarios se prueba en endpoints heredados (`/auth/*`) y la interfaz usa `/users` | Media | Revisión de la tabla de endpoints |
| [#120](https://github.com/andresactividades1419-cloud/CASETECH/issues/120) | "Total Fabricado" cuenta pedidos pendientes y cancelados | Media | Revisión de código y visual |
| [#122](https://github.com/andresactividades1419-cloud/CASETECH/issues/122) | `ReviewModal` dice que el admin puede autoaprobar, pero el backend responde 403 | Media | Revisión de código |
| [#124](https://github.com/andresactividades1419-cloud/CASETECH/issues/124) | RF05 dice que solo el ADMINISTRADOR crea pedidos, pero el OPERARIO puede crearlos y cancelarlos (**requiere decisión**) | Media | Revisión de requisitos |
| [#121](https://github.com/andresactividades1419-cloud/CASETECH/issues/121) | Reactivar un usuario bloqueado no reinicia sus intentos fallidos | Baja | Revisión de código |
| [#125](https://github.com/andresactividades1419-cloud/CASETECH/issues/125) | El límite de logins por IP se cuenta por separado en cada worker | Baja | Revisión de arquitectura |
| [#112](https://github.com/andresactividades1419-cloud/CASETECH/issues/112) | Typo "ms" en vez de "m" en el mensaje de déficit de stock | Baja | Prueba manual |
| [#108](https://github.com/andresactividades1419-cloud/CASETECH/issues/108) | Falta el índice en `materiales.activo` (documentado en RNF-PERF-01) | Baja | Auditoría RF/RNF |
| [#105](https://github.com/andresactividades1419-cloud/CASETECH/issues/105) | RNF-SEG desactualizado (passlib, refresh token, RBAC de proveedores) | Baja | Auditoría RF/RNF |
| [#106](https://github.com/andresactividades1419-cloud/CASETECH/issues/106) | RNF-BD-01 no contempla el uso intencional de SQLite en tests | Baja | Auditoría RF/RNF |

### 5.4 Defectos corregidos

| # | ID | Defecto | Severidad | Capa que lo detectó | Corregido en |
|---|---|---|---|---|---|
| 1 | PR [#113](https://github.com/andresactividades1419-cloud/CASETECH/pull/113) | Las credenciales de ejemplo de `.env.example` funcionaban como reales fuera de desarrollo | **Crítica** | Un compañero al clonar el repo | v1.6.2 |
| 2 | [#75](https://github.com/andresactividades1419-cloud/CASETECH/issues/75) | Cancelar un pedido en producción no devolvía el inventario | Alta | API (pytest) | `develop` |
| 3 | [#96](https://github.com/andresactividades1419-cloud/CASETECH/issues/96) | 3 errores del arranque limpio: migraciones con constraints duplicados, receta de Icopor vacía y 500 en vez de 422 con PostgreSQL real | Alta | Arranque limpio manual | `develop` |
| 4 | [#41](https://github.com/andresactividades1419-cloud/CASETECH/issues/41) | Procedimientos transaccionales (`sp_crear_proveedor`, doble firma) y consumo de producción | Alta | Ver issue | `develop` |
| 5 | [#43](https://github.com/andresactividades1419-cloud/CASETECH/issues/43) | Pantalla en negro (crash) al confirmar compras y registrar ajustes | Alta | Ver issue | `develop` |
| 6 | — | El backend de producción no era alcanzable desde Nginx (uvicorn arrancaba sin sus flags por el `command: >` de YAML) | Alta | Prueba manual de despliegue | Esta rama (sin commit) |
| 7 | — | El frontend de producción llamaba a `localhost:8000` (URL de desarrollo compilada) | Alta | Prueba manual de despliegue | Esta rama (sin commit) |
| 8 | — | Las listas fallaban en producción: la redirección `/materials` → `/materials/` perdía el puerto y el protocolo | Alta | Prueba manual de despliegue | Esta rama (sin commit) |
| 9 | — | Producción quedaba sin ningún usuario y sin herramienta para crearlo | Alta | Prueba manual de despliegue | Esta rama: script `create_admin` |
| 10 | — | Dos pedidos simultáneos podían recibir el mismo código | Media | API (pytest, colisión simulada) | v1.6.3 |
| 11 | — | El healthcheck de producción siempre decía "healthy" (`\|\| exit 0`) | Media | Revisión + prueba de despliegue | Esta rama (sin commit) |
| 12 | — | Se podía saltar el límite de login falseando `X-Forwarded-For` | Media | Revisión + prueba con backend falso | Esta rama (sin commit) |
| 13 | — | `/health` informaba la versión `1.0.0` y no comprobaba la base de datos | Baja | Revisión de código | Esta rama (sin commit) |
| 14 | — | La cobertura del backend se subestimaba (57 % medido, 69 % real) | Baja | Análisis de la suite | Esta rama (sin commit) |
| 15 | [#128](https://github.com/andresactividades1419-cloud/CASETECH/issues/128) | El `JWT_SECRET` de ejemplo de `.env.example` se aceptaba en producción: permitía falsificar la sesión de un administrador | **Crítica** | Revisión del despliegue (prueba del `.env.example` en producción) | Esta rama (sin commit) |

> Las filas "Esta rama (sin commit)" ya están corregidas y probadas, pero los cambios aún no se han commiteado. Se crearon sin issue propio porque se encontraron y corrigieron en el mismo paso; su explicación técnica está en [`07-despliegue.md`](./07-despliegue.md#5-problemas-que-ya-aparecieron-y-por-qué).

### 5.5 Deuda técnica (no son defectos)

Mejoras abiertas que no encajan como defecto y se priorizan en el documento de deuda técnica: [#110](https://github.com/andresactividades1419-cloud/CASETECH/issues/110) (pruebas de componentes del frontend), [#109](https://github.com/andresactividades1419-cloud/CASETECH/issues/109) (versiones exactas de `axios` y `vite`), [#107](https://github.com/andresactividades1419-cloud/CASETECH/issues/107) (medición de cobertura: ya está hecha en esta rama, se cierra al integrarla) y [#99](https://github.com/andresactividades1419-cloud/CASETECH/issues/99) (función "Nueva Receta").

## 6. Conclusión

- **Criterio de calidad cumplido:** todas las pruebas automáticas pasan, no hay defectos críticos abiertos y los controles de lint, tipos y build están en verde.
- **Riesgo principal que queda:** [#123](https://github.com/andresactividades1419-cloud/CASETECH/issues/123). La lógica de inventario solo se ha verificado a mano contra PostgreSQL.
- **Decisión pendiente del equipo:** [#124](https://github.com/andresactividades1419-cloud/CASETECH/issues/124) (qué puede hacer un OPERARIO con los pedidos).
- **Antes de entregar:** commitear los cambios de esta rama y abrir el PR hacia `develop`. El CI aún no ha corrido sobre estos cambios.

## 7. Cómo repetir esta ejecución

```powershell
docker compose up --build -d
docker compose exec backend uv run pytest -v tests/
docker compose exec backend uv run ruff check .
docker compose exec backend uv run mypy app/
docker compose exec frontend pnpm run lint
docker compose exec frontend pnpm run test:run
docker compose exec frontend pnpm run build
cd e2e; npx playwright test
```
