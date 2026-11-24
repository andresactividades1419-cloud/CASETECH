# Planning Poker — Estimación de historias de usuario

> **Qué es:** técnica de estimación del equipo. Cada integrante vota en secreto cuántos puntos de esfuerzo cree que cuesta una historia; se muestran todos los votos a la vez y, si hay diferencias grandes, quien votó más alto y más bajo explican sus razones y se vota de nuevo hasta llegar a un acuerdo.
> **Para qué sirve:** que la estimación sea del equipo y no de una sola persona, y descubrir riesgos antes de empezar a programar.

## 1. Reglas del equipo

| Regla | Detalle |
|---|---|
| Escala | Fibonacci: **1, 2, 3, 5, 8, 13** (si una historia pasa de 13, se parte en historias más pequeñas) |
| Qué se estima | Esfuerzo total de la historia: backend + base de datos + frontend + pruebas |
| Qué mide un punto | Esfuerzo **relativo** (comparar contra una historia ya conocida), no horas |
| Quién vota | Los 3 integrantes: Andrés Fernández, Javier Sepúlveda, Oscar Ruiz |
| Cómo se vota | Todos a la vez, sin mirar al compañero (cartas físicas, o una votación simultánea en el chat) |
| Cuándo se acepta | Cuando todos votan igual o con un solo escalón de diferencia; si no, se discute y se repite (máximo 3 rondas) |
| Quién facilita | Una persona distinta en cada sesión (rota) |

## 2. Historias de referencia

Se usan como "regla de medir" para comparar las demás:

| Referencia | Puntos | Por qué |
|---|---|---|
| **HU04** — Buscar y filtrar proveedores | **3** | Solo lectura con filtros y paginación. Sin transacciones ni reglas de negocio complejas. |
| **HU03** — Registrar proveedor con NIT único | **5** | Alta con validaciones, regla de unicidad y un Stored Procedure. Es el CRUD "típico". |
| **HU08** — Descuento automático al iniciar producción | **13** | Núcleo del sistema: Stored Procedure con bloqueo pesimista, varias tablas y manejo de errores. |

## 3. Hoja de estimación — HU16 a HU21

Estas seis historias describen funcionalidad que ya estaba construida y se documentó de forma retroactiva (Sprint 5). La columna **Estimación inicial** es una propuesta razonada por comparación con las referencias; **debe confirmarse con el equipo** llenando las columnas de votos.

| HU | Historia | Estimación inicial | Voto Andrés | Voto Javier | Voto Oscar | **Puntos finales (equipo)** |
|---|---|---|---|---|---|---|
| HU16 | Registrar compra a proveedor e ingresar stock | 8 | | | | _pendiente_ |
| HU17 | Consultar compras y su detalle | 3 | | | | _pendiente_ |
| HU18 | Gestionar materias primas | 5 | | | | _pendiente_ |
| HU19 | Administrar recetas BOM | 5 | | | | _pendiente_ |
| HU20 | Mantener y cerrar la sesión de forma segura | 5 | | | | _pendiente_ |
| HU21 | Bloquear la cuenta tras intentos fallidos | 3 | | | | _pendiente_ |

### Razonamiento de la estimación inicial

| HU | Por qué ese valor |
|---|---|
| HU16 — **8** | Una compra tiene varias líneas y todo debe ocurrir en una sola transacción: crear la compra, sumar stock de cada material y escribir el Kardex. Validaciones de proveedor y materiales, código consecutivo, total calculado y un formulario con filas dinámicas. Más complejo que HU03 (5), pero sin el bloqueo pesimista de HU08 (13). |
| HU17 — **3** | Solo lectura: listado paginado con tres filtros y un modal de detalle. Equivalente a HU04 (3). |
| HU18 — **5** | CRUD de un catálogo con validaciones, nombre único (409) y borrado lógico. Comparable a HU03 (5). |
| HU19 — **5** | CRUD con unicidad compuesta (tipo de casetón + material), selector que oculta lo ya usado y una pestaña por tipo. Comparable a HU03 (5). |
| HU20 — **5** | Poco código pero alto riesgo de seguridad: rotación de tokens, cookie `httpOnly`, hash en base de datos y un interceptor que renueva la sesión sin repetir peticiones. La incertidumbre sube el valor. |
| HU21 — **3** | Lógica simple (contador, bloqueo y límite por IP), pero crítica; se probó con casos específicos. |

## 4. Historias HU01 a HU15

Se estimaron en la planificación inicial del proyecto (agosto de 2026) y su puntaje está en [`03-historias-de-usuario.md`](../03-historias-de-usuario.md). **No se conserva el detalle de los votos individuales** de esa planificación. A partir del Sprint 6 el detalle de cada sesión se registra en la sección siguiente.

## 5. Registro de sesiones

Copiar este bloque por cada sesión de planning poker y llenarlo en el momento (no después).

### Sesión _(AAAA-MM-DD)_

- **Facilitador:**
- **Participantes:**
- **Historias estimadas:**

| HU | Ronda 1 (votos) | Ronda 2 | Ronda 3 | Puntos acordados | Quién votó más alto / más bajo y por qué |
|---|---|---|---|---|---|
| | | | | | |

**Riesgos o dudas que salieron de la discusión:**

## 6. Cómo corre la estimación en el repositorio

1. Cada historia nueva se crea como issue (plantilla `feature_request`) con su estimación inicial.
2. En la reunión de planning se vota y se anota el resultado en la sección 5.
3. Los puntos finales se actualizan en [`03-historias-de-usuario.md`](../03-historias-de-usuario.md) y en [`product-backlog.md`](./product-backlog.md).
4. Al cerrar el sprint se compara lo estimado con lo realmente entregado para calibrar el siguiente.
