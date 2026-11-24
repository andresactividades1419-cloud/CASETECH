# Estrategia de pruebas — CASETECH ERP

**Grupo**: CASETECH (Andrés Fernández · Oscar Ruiz · Javier Sepúlveda) · **Ficha**: ADSO · **Stack**: React 18 + FastAPI + PostgreSQL 16 · **Fecha**: 2026-11-20

## 1. Qué hace la app y qué no puede fallar

CASETECH es un ERP de producción e inventario para la fabricación de casetones de concreto: administra materiales, proveedores, compras, pedidos y recetas (BOM, la lista de materiales que lleva cada tipo de casetón). Los roles son ADMINISTRADOR y OPERARIO.

| Riesgo | Por qué importa |
|---|---|
| Descontar mal el inventario al iniciar producción (`sp_descontar_receta`) | El stock queda distinto del real: se compra de más o se promete un pedido que no se puede fabricar. |
| No devolver el inventario al cancelar un pedido en producción (`sp_revertir_receta`) | Se pierde stock "en el papel" que sigue físicamente en la bodega. |
| Dejar pasar a quien no debe (login, roles, sesión, bloqueo de cuenta) | Un OPERARIO podría gestionar usuarios o recetas; alguien podría adivinar contraseñas. |
| Ajustes de inventario aprobados por quien los pidió (doble firma) | Se pierde el control que evita fraudes o errores de conteo. |
| Dos pedidos con el mismo código | Se confunden pedidos y su inventario. |
| El sistema no arranca, o arranca con credenciales de ejemplo | Nadie puede trabajar, o cualquiera entra como administrador. |

## 2. Qué prueba cada capa y por qué

| Capa | Qué verifica | Herramienta | Cantidad de tests |
|---|---|---|---|
| Unitarias | Validación de la configuración (credenciales de ejemplo rechazadas fuera de desarrollo, mensajes claros si falta una variable) y el interceptor de Axios que renueva la sesión | pytest · Vitest | 18 (16 backend + 2 frontend) |
| Componentes React | — (ninguna de las 9 páginas ni los modales tiene prueba de componente) | Vitest | 0 |
| API | Login, bloqueo a los 5 intentos, renovación y rotación del refresh token, roles, CRUD de usuarios y recetas, exportaciones CSV, `/health`, errores 422/409, máquina de estados de pedidos, doble firma | pytest + httpx | 24 |
| Integración con BD | Script `create_admin` contra una base real de tablas (crea, no pisa, restablece, valida contraseña). **Contra PostgreSQL: 0** | pytest + SQLite en memoria | 6 |
| E2E (flujos críticos) | Login correcto, login con usuario inexistente y recorrido por todos los módulos del menú | Playwright (Chromium) | 3 |
| **Total** | | | **51** |

**Por qué esta forma**: la lógica de negocio vive en el backend y en los Stored Procedures, no en las pantallas, así que casi toda la suite se concentra en la API (24 de 51) y en las reglas de seguridad (login, roles, configuración). El frontend casi no tiene lógica propia y por eso hoy solo tiene probado el cliente HTTP, que es lo que decide si la sesión se mantiene. Los 3 E2E cubren únicamente lo imprescindible: que se pueda entrar y que cada módulo abra. La capa que más falta es **integración con PostgreSQL**, que es justo donde está el riesgo más alto (ver sección 3).

## 3. Qué no se prueba y por qué

| Fuera de la suite o de la cobertura | Motivo |
|---|---|
| Los 4 Stored Procedures ejecutados en PostgreSQL | Los tests usan SQLite, que no soporta `CALL`. Los servicios tienen ramas `if is_sqlite:` que **repiten la lógica del SP en Python** (3 copias de ~50 líneas en `order_service.py` y `stock_adjustment_service.py`); los tests verifican esa copia, no el SP real. Es el mayor riesgo conocido: las dos versiones pueden divergir. |
| Concurrencia (`SELECT ... FOR UPDATE`) | Requiere dos transacciones reales sobre PostgreSQL. |
| 9 páginas y ~10 modales de React | Tarea pendiente (Issue #110): hoy el frontend mide 0,76 % de cobertura. |
| E2E en el CI | El workflow solo ejecuta 2 trabajos (backend y frontend); Playwright se corre a mano. |
| Despliegue de producción (Nginx + backend + BD) | Se verificó manualmente con una prueba de extremo a extremo (ver `docs/07-despliegue.md`), pero no es una prueba automática. |
| Accesibilidad, carga y diseño responsive | Fuera del alcance de esta etapa. |

## 4. Datos y entornos

- **BD de pruebas (backend)**: SQLite en memoria, separada de la de desarrollo. `conftest.py` fija `ENVIRONMENT=test` y, antes de **cada** test, borra y recrea todas las tablas y siembra roles, usuarios, tipos de casetón, materiales y recetas. También reinicia el contador del límite de intentos de login para que un test no herede el de otro.
- **Dobles y reales**: se prueban reales la aplicación FastAPI completa, JWT, bcrypt, Pydantic y el ORM. Se reemplaza PostgreSQL por SQLite y los Stored Procedures por su copia en Python. Un test usa un `AsyncMock` para forzar la colisión de códigos de pedido.
- **E2E**: corren contra el stack de desarrollo (Vite en el puerto 3000, backend y PostgreSQL de desarrollo), con los usuarios que siembra `init_db` (`admin@casetech.com`). Los 3 flujos son de solo lectura (iniciar sesión y navegar), así que no crean ni modifican datos; **no tienen una BD aparte**.
- **CI**: levanta un servicio PostgreSQL 16, pero ningún test lo usa hoy (ver sección 3).

## 5. CI y umbrales

- Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). Último run en verde de `main`: [PR #116, 2026-09-08](https://github.com/andresactividades1419-cloud/CASETECH/actions/runs/34177133352).
- Jobs obligatorios en la protección de `main`: **Backend CI (Lint, Typecheck, Audit, Tests)** y **Frontend CI (Lint, Security Audit, Vitest, Build)**, con la rama al día y 1 aprobación.
- El CI solo se dispara con *push* o *pull request* hacia `main` o `develop`: la rama `test/semana-01`, donde están los umbrales de cobertura y los E2E, **todavía no ha corrido en el CI**. Se verá en el primer PR.

| Parte | Cobertura actual | Umbral configurado |
|---|---|---|
| Frontend | 0,76 % de líneas (local; la línea base del CI fue 0,57 %) | 0,5 % de líneas |
| Backend | 68,90 % (46 tests) | 68 % (`fail_under`) |

El umbral del frontend es casi simbólico: refleja que solo se prueba `client.js`.

**Corrección de la medición (2026-11-20):** la línea base del backend (56 %) estaba subestimada. SQLAlchemy asíncrono ejecuta los servicios dentro de *greenlets* y `coverage` no los contaba sin `concurrency = ["greenlet", "thread"]`. Con la configuración corregida la misma suite mide 68,90 % (por ejemplo, `order_service.py` pasó de 17 % a 67 % y `auth.py` de 37 % a 90 %). Los servicios que siguen con cobertura baja son `provider_service` (14 %), `user_service` (15 %), `material_service` (16 %), `purchase_service` (19 %), `stock_adjustment_service` (36 %) y `dashboard_service` (36 %).

## 6. Hallazgos y riesgos conocidos

| Defecto | Capa que lo encontró | Estado |
|---|---|---|
| Cancelar un pedido en producción no devolvía el inventario | API (pytest) | Corregido (Issue #75) |
| Dos pedidos simultáneos podían recibir el mismo código | API (pytest, con colisión simulada) | Corregido (v1.6.3) |
| Iniciar producción con déficit daba error 500 en lugar de 422 sobre PostgreSQL real | Arranque limpio manual (SQLite no lo ve) | Corregido (Issue #96) |
| La receta de Icopor quedaba vacía en una instalación nueva | Arranque limpio manual | Corregido (Issue #96) |
| El backend de producción no era alcanzable desde Nginx (uvicorn arrancaba sin sus flags) | Prueba manual de despliegue | Corregido |
| El healthcheck de producción siempre decía "healthy" (`\|\| exit 0`) | Revisión + prueba de despliegue | Corregido |
| Se podía saltar el límite de login falseando `X-Forwarded-For` | Revisión + prueba con un backend falso | Corregido |
| Las credenciales de ejemplo funcionaban como reales fuera de desarrollo | Un compañero al clonar el repositorio | Corregido (Issue #113) |
| El `JWT_SECRET` de ejemplo de `.env.example` se aceptaba en producción (permitía falsificar sesiones) | Revisión del despliegue | Corregido ([#128](https://github.com/andresactividades1419-cloud/CASETECH/issues/128)) |
| La cobertura del backend se subestimaba (57 % medido, 69 % real) por no seguir los *greenlets* | Análisis de la suite | Corregido (`pyproject.toml`) |
| Las fechas de entrega se muestran un día antes (`OrdersPage.jsx:281`, zona horaria) | Revisión visual | Abierto [#118](https://github.com/andresactividades1419-cloud/CASETECH/issues/118) |
| El signo del Kardex (pantalla y CSV) no refleja si el stock sube o baja | Revisión visual y de datos | Abierto [#119](https://github.com/andresactividades1419-cloud/CASETECH/issues/119) |
| La exportación del Kardex queda abierta al OPERARIO por `/dashboard`; el test protege otra ruta | Revisión de la tabla de endpoints | Abierto [#126](https://github.com/andresactividades1419-cloud/CASETECH/issues/126) |
| El CRUD de usuarios se prueba en endpoints heredados; la interfaz usa `/users` | Revisión de la tabla de endpoints | Abierto [#127](https://github.com/andresactividades1419-cloud/CASETECH/issues/127) |
| "Total fabricado" del dashboard cuenta pedidos pendientes y cancelados | Revisión visual | Abierto [#120](https://github.com/andresactividades1419-cloud/CASETECH/issues/120) |
| Reactivar un usuario bloqueado no reinicia su contador de intentos fallidos | Revisión de código | Abierto [#121](https://github.com/andresactividades1419-cloud/CASETECH/issues/121) |
| `ReviewModal` dice que el admin puede autoaprobar, pero el backend responde 403 | Revisión de código | Abierto [#122](https://github.com/andresactividades1419-cloud/CASETECH/issues/122) |
| Stored Procedures sin prueba contra PostgreSQL y con lógica duplicada en Python | Análisis de la suite | Abierto [#123](https://github.com/andresactividades1419-cloud/CASETECH/issues/123) (riesgo alto) |
| Permisos del OPERARIO sobre pedidos distintos a lo que dice RF05 | Revisión de requisitos | Abierto [#124](https://github.com/andresactividades1419-cloud/CASETECH/issues/124) (requiere decisión) |
| El límite de logins por IP se cuenta por separado en cada worker | Revisión de arquitectura | Abierto [#125](https://github.com/andresactividades1419-cloud/CASETECH/issues/125) |

El detalle completo, con severidad y estado de cada defecto, está en [`reporte-ejecucion-pruebas.md`](./reporte-ejecucion-pruebas.md).

## 7. Evidencia individual

| Integrante | Capas trabajadas (matriz) | Commits de test (`git shortlog`) |
|---|---|---|
| Andrés Fernández | E2E (S1) | 3 `test:` (E2E, umbrales de cobertura) + 1 `ci:` |
| Javier Sepúlveda | E2E (S1) | 1 `test:` (integración BOM, estados y doble firma) + 1 `ci:` |
| Oscar Ruiz | E2E (S1) | 1 `test(e2e):` |

Los commits de `test/semana-01` aún no están en `main`; los conteos incluyen todas las ramas.
