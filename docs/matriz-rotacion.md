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
| @andres141918-prog | E2E | API | Front: ProtectedRoute + menú por rol | | | | | | |
| @javieburgossepul-cpu | E2E | Front | Front: OrderModal (+ responsable del backend ≥ 40 %) | | | | | | |
| @oscark2209 | E2E | E2E (CI con umbral) | Front: LoginPage | | | | | | |

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

## Cobertura semanal

Anota la cobertura real al cerrar cada semana. El umbral de la semana siguiente es el mayor entre el piso del plan y este valor, redondeado hacia abajo.

| Semana | Frontend (%) | Backend (%) | Umbral configurado para la semana siguiente |
|---|---|---|---|
| S1 (línea base) | 0.57% | 56.26% | Front: 0.5% · Back: 56% |

## Registro de vocero aleatorio

El vocero escribe su respuesta **antes** de que el instructor llegue a la mesa; el instructor la verifica con una pregunta corta y anota el resultado.

| Semana | Vocero | Capa preguntada | Respuesta escrita | Resultado (Alto / Medio / Bajo) |
|---|---|---|---|---|
| S1 | | | | |
