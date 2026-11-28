# Matriz de rotación de capas

> Copia este archivo en tu repo como `docs/matriz-rotacion.md` y llénalo al inicio de cada semana.

**Grupo**: CASETECH · **Ficha**: ADSO · **Stack**: React + FastAPI + PostgreSQL

Capas: **Front** (React) · **API** (backend) · **BD** (integración) · **E2E** (Playwright)

Reglas:

- Cada semana cambias de capa. No repites capa hasta haber pasado por las cuatro.
- En la columna escribe la capa y, al cerrar la semana, el enlace a tu PR de tests.
- Quien revisa tu PR debe haber trabajado en otra capa esa semana.

| Integrante (usuario GitHub) | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|
| @andres141918-prog | E2E | API | Front: ProtectedRoute + menú por rol | Front (contrato que consume el frontend) | E2E: estados simulados con page.route (+ cliente HTTP con MSW) | BD: Stored Procedures contra PostgreSQL (+ montaje de la BD de pruebas) | | | |
| @javieburgossepul-cpu | E2E | Front | Front: OrderModal (+ responsable del backend ≥ 40 %) | E2E (seguridad y contrato de errores) | API: dependencia del reloj | BD: restricciones de las tablas materiales y proveedores | | | |
| @oscark2209 | E2E | E2E (CI con umbral) | Front: LoginPage | API (recurso principal: pedidos) | BD: sesión de base de datos como dependencia | API: pedidos contra PostgreSQL real | | | |

> **Excepción S2**: en S1 los tres integrantes trabajaron en E2E. Con un grupo de 3 (Front, API y E2E) es inevitable que una persona repita E2E en S2. La asume @oscark2209 con el montaje del CI con umbral (`.github/workflows/tests.yml`), que es un entregable distinto al test Playwright de S1. Según la regla de rotación, en S3–S5 debe pasar por Front, API y BD antes de volver a E2E.

### Ramas de trabajo S2 (desde `develop`)

| Integrante | Capa | Rama | Entregable |
|---|---|---|---|
| @andres141918-prog | API | `test/week-02-api-<unidad>` | ≥ 3 tests unitarios (pytest parametrizado) sobre una regla de servicio o validación del backend + mutante |
| @javieburgossepul-cpu | Front | `test/week-02-front-order-validation` (ya existe en GitHub) | ≥ 3 tests unitarios (Vitest) sobre `src/utils/validateOrderForm.js` + mutante |
| @oscark2209 | E2E | `ci/week-02-tests-workflow` | `tests.yml` con lint, tests con cobertura y build; prueba de umbral en rojo/verde; regla de rama |

### Ramas de trabajo S3 (desde `develop`) — semana de tema común: todos en Front

Primero se fusiona la preparación compartida (React Testing Library, jsdom, `renderWithProviders`); después cada integrante trabaja su componente.

| Integrante | Componente | Rama | Entregable |
|---|---|---|---|
| @andres141918-prog | Preparación compartida | `chore/week-03-testing-library-setup` | Librerías de test, `src/tests/setup.js` y `src/tests/renderWithProviders.jsx` |
| @andres141918-prog | `ProtectedRoute` + menú por rol | `test/week-03-front-protected-route` | ≥ 3 tests de componente + mutante |
| @javieburgossepul-cpu | `OrderModal` | `test/week-03-front-order-modal` | ≥ 3 tests de componente + mutante; páginas extra Pedidos y Materiales. Responsable del backend ≥ 40 % (hoy 69 %) |
| @oscark2209 | `LoginPage` | `test/week-03-front-login-page` | ≥ 3 tests de componente + mutante + arreglo de accesibilidad; páginas extra Dashboard y Proveedores |

### Ramas de trabajo S4 (desde `develop`) — pruebas de API, vuelve la rotación

Cada integrante tomó una capa distinta a la de S2 (grupo de 3: API, Front y E2E).

| Integrante | Capa / ángulo | Rama | Entregable |
|---|---|---|---|
| @oscark2209 | API: recurso principal (pedidos) | `test/week-04-api-orders` | 8 tests de API + mutante; hallazgo: fechas fijas `2026-12-31` que caducaban |
| @javieburgossepul-cpu | E2E: seguridad y contrato de errores | `test/week-04-api-security-errors` | 9 tests de API (401/403/autorizado) + mutante; hallazgo corregido: JSON mal formado respondía 422 con lista interna |
| @andres141918-prog | Front: contrato que consume el frontend | `test/week-04-front-contract` | 7 tests de API + mutante; hallazgos corregidos: fuga del error crudo de PostgreSQL en proveedores y "Usuario #undefined" en Compras. Además, tests de las páginas Compras y Ajustes para el piso del 50 % del frontend |

### Ramas de trabajo S5 (desde `develop`) — dobles de prueba

Cada integrante tomó una capa distinta a la de S4. Inventario de dependencias externas de CASETECH: el reloj (fecha de entrega, expiración de tokens), PostgreSQL (procedimientos almacenados; en tests, SQLite en memoria como fake) y el backend visto desde el frontend. No hay correo, pagos ni APIs de terceros.

| Integrante | Capa / ángulo | Rama | Entregable |
|---|---|---|---|
| @javieburgossepul-cpu | API: dependencia del reloj | `test/week-05-api-clock-doubles` | 6 tests con stub y mock de `hoy()` + mutante; hallazgo: pedidos con fecha de entrega vencida respondían 500 al leerlos |
| @oscark2209 | BD: sesión de base de datos | `test/week-05-db-session-doubles` | 3 tests con stub, mock y fake de `AsyncSession` + mutante |
| @andres141918-prog | E2E: estados simulados con `page.route` | `test/week-05-front-msw` | 3 E2E con `page.route` (API caído, lista vacía, 422 en login) + mutante. Aporte extra para la cobertura: 41 tests de `src/api` con MSW; hallazgo: respuestas HTML de un proxy llegaban como datos |

### Ramas de trabajo S6 (desde `develop`) — integración con BD real

**Excepción S6**: @andres141918-prog y @javieburgossepul-cpu son los dos únicos que aún no pasan por BD (los dos ya hicieron Front, API y E2E). Para no romper la regla de rotación, los dos toman BD esta semana, con ángulos distintos; @oscark2209 ya completó las cuatro capas y toma API. Nadie toma Front: los tests que faltan para el piso del 70 % del frontend los aporta @andres141918-prog.

Primero se fusiona la preparación compartida (BD de pruebas `db-test` y fixtures en `backend/tests/integration/conftest.py`); después cada integrante trabaja su ángulo. Limpieza entre tests: **transacción con rollback** (savepoints), porque los servicios de CASETECH hacen `commit()` y `rollback()` propios y el truncado borraría también los datos semilla de las migraciones.

| Integrante | Capa / ángulo | Rama | Entregable |
|---|---|---|---|
| @andres141918-prog | Preparación compartida | `chore/week-06-test-database-setup` | Servicio `db-test` (puerto 5433, `tmpfs`), fixtures `pg_session` / `pg_client` / `pg_admin_headers`, 4 tests de humo + mutante del savepoint, comandos en el README |
| @andres141918-prog | BD: Stored Procedures | `test/week-06-db-stored-procedures` | ≥ 3 tests de los SP reales (descontar, déficit, revertir) + mutante (issue #123) |
| @javieburgossepul-cpu | BD: restricciones de tablas | `test/week-06-db-materials-constraints` | ≥ 3 tests de `NOT NULL`, longitud, `UNIQUE` y `NUMERIC(12,3)` en materiales y proveedores + mutante |
| @oscark2209 | API: pedidos contra BD real | `test/week-06-api-orders-real-db` | ≥ 3 tests de endpoints verificados en la BD + hallazgo de un `500` corregido con regla y test unitario + mutante |

## Cobertura semanal

Anota la cobertura real al cerrar cada semana. El umbral de la semana siguiente es el mayor entre el piso del plan y este valor, redondeado hacia abajo.

| Semana | Frontend (%) | Backend (%) | Umbral configurado para la semana siguiente |
|---|---|---|---|
| S1 (línea base) | 0.57% | 56.26% | Front: 0.5% · Back: 56% |
| S2 | 1.30% | 69.15% | Front: 0.5% · Back: 68% — el frontend **no alcanzó el piso del 30 %** en S2 (solo tenía tests de lógica pura); lo superó en S3. El backend subió de 56 % a 69 % al corregir la medición (greenlet) |
| S3 | 44.83% | 69.15% | Front: 44% · Back: 69% |
| S4 | 61.63% | 76.50% | Front: 61% · Back: 76% — ambos ya superan el piso de S5 (60 %) |
| S5 | 66.53% | 76.93% | Front: 66% · Back: 76% — el frontend todavía no alcanza el piso de S6 (70 %): faltan ~3.5 puntos |

## Registro de vocero aleatorio

El vocero escribe su respuesta **antes** de que el instructor llegue a la mesa; el instructor la verifica con una pregunta corta y anota el resultado.

| Semana | Vocero | Capa preguntada | Respuesta escrita | Resultado (Alto / Medio / Bajo) |
|---|---|---|---|---|
| S1 | | | | |
