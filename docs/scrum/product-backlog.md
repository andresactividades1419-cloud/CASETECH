# Product Backlog y Sprint Backlog — CASETECH ERP

> **Metodología:** Scrum aplicado sobre GitHub (issues + tablero GitHub Projects con columnas Backlog · Todo · In Progress · Done).
> **Generado con datos reales** de los issues de GitHub y de `docs/03-historias-de-usuario.md`. Última actualización: ver historial de git de este archivo.
> **Escala de puntos:** Fibonacci (1, 2, 3, 5, 8, 13). Método de estimación: [Planning Poker](./planning-poker.md).

## 1. Resumen del producto

| Indicador | Valor |
|---|---|
| Historias de usuario | 30 (HU01 a HU30) |
| Puntos de historia | 166 (150 entregados · 16 pendientes) |
| Historias Must Have / Should Have | 18 / 12 |
| Sprints | 7 (4 planificados, 1 de consolidación, 1 de despliegue y 1 siguiente sin iniciar) |
| Estado de las historias | 27 de 30 implementadas · 3 pendientes (HU28 a HU30) |
| Issues en GitHub | 69 (51 cerrados · 18 abiertos) |

## 2. Roles Scrum

| Rol | Responsable |
|---|---|
| Product Owner | Andrés Fernández — decide prioridades y alcance, y acepta o rechaza el trabajo terminado |
| Scrum Master | Javier Sepúlveda — facilita el proceso, cuida las reglas de calidad (revisión de PR, CI) y quita impedimentos |
| Equipo de desarrollo | Andrés Fernández · Javier Sepúlveda · Oscar Ruiz |

Responsabilidades, reparto del trabajo y retrospectiva del equipo: [equipo-y-retrospectiva.md](../equipo-y-retrospectiva.md).

## 3. Product Backlog (todas las historias, priorizadas)

El orden es por prioridad MoSCoW y luego por sprint. Los puntos de HU16 a HU30 son una estimación inicial pendiente de confirmar en planning poker. HU28 a HU30 **no están implementadas**: son el siguiente trabajo propuesto (el responsable es una propuesta que el Product Owner debe confirmar). HU28 corresponde al issue [#99](https://github.com/andresactividades1419-cloud/CASETECH/issues/99); HU29 y HU30 todavía no tienen issue y se crean al planificar el Sprint 7.

| ID | Historia | MoSCoW | Puntos | Sprint | Estado | Responsable |
|---|---|---|---|---|---|---|
| HU01 | Iniciar sesión de forma segura | Must Have | 8 | 1 | Hecha | Andrés Fernández |
| HU02 | Gestionar cuentas de usuario | Must Have | 5 | 1 | Hecha | Oscar Ruiz |
| HU03 | Registrar nuevo proveedor | Must Have | 5 | 1 | Hecha | Oscar Ruiz |
| HU14 | Visualizar dashboard con KPIs operativos | Must Have | 8 | 1 | Hecha | Andrés Fernández |
| HU07 | Registrar un pedido de casetones | Must Have | 8 | 2 | Hecha | Andrés Fernández |
| HU10 | Gestionar el estado de un pedido | Must Have | 8 | 2 | Hecha | Andrés Fernández |
| HU11 | Ver consumo de materiales requerido por receta | Must Have | 5 | 2 | Hecha | Oscar Ruiz |
| HU04 | Buscar y filtrar proveedores | Must Have | 3 | 3 | Hecha | Oscar Ruiz |
| HU05 | Visualizar inventario de materiales | Must Have | 5 | 3 | Hecha | Javier Sepúlveda |
| HU08 | Confirmar inicio de producción con descuento automático | Must Have | 13 | 3 | Hecha | Andrés Fernández |
| HU09 | Registrar ajuste de inventario con justificación | Must Have | 8 | 3 | Hecha | Javier Sepúlveda |
| HU13 | Recibir alertas de stock mínimo | Must Have | 5 | 3 | Hecha | Javier Sepúlveda |
| HU16 | Registrar compra a proveedor e ingresar stock | Must Have | 8 | 5 | Hecha | Javier Sepúlveda |
| HU18 | Gestionar materias primas | Must Have | 5 | 5 | Hecha | Javier Sepúlveda |
| HU19 | Administrar recetas BOM | Must Have | 5 | 5 | Hecha | Andrés Fernández |
| HU26 | Crear el primer administrador al desplegar en producción | Must Have | 3 | 6 | Hecha | Andrés Fernández |
| HU27 | Arrancar el sistema de forma segura y verificar su estado | Must Have | 5 | 6 | Hecha | Andrés Fernández |
| HU30 | Publicar el sistema con HTTPS | Must Have | 5 | 7 | Pendiente | Oscar Ruiz (propuesto) |
| HU06 | Generar reportes operativos | Should Have | 8 | 4 | Hecha | Javier Sepúlveda |
| HU12 | Consultar historial de movimientos de inventario | Should Have | 5 | 4 | Hecha | Javier Sepúlveda |
| HU15 | Consultar log de auditoría de acciones | Should Have | 5 | 4 | Hecha | Oscar Ruiz |
| HU17 | Consultar compras y su detalle | Should Have | 3 | 5 | Hecha | Javier Sepúlveda |
| HU20 | Mantener y cerrar la sesión de forma segura | Should Have | 5 | 5 | Hecha | Andrés Fernández |
| HU21 | Bloquear la cuenta tras intentos fallidos | Should Have | 3 | 5 | Hecha | Andrés Fernández |
| HU22 | Editar los datos de un proveedor | Should Have | 3 | 5 | Hecha | Andrés Fernández |
| HU23 | Buscar y filtrar pedidos | Should Have | 3 | 5 | Hecha | Andrés Fernández |
| HU24 | Editar, buscar y filtrar cuentas de usuario | Should Have | 5 | 5 | Hecha | Andrés Fernández |
| HU25 | Consultar y filtrar solicitudes de ajuste de inventario | Should Have | 3 | 5 | Hecha | Andrés Fernández |
| HU28 | Crear una nueva receta (producto) desde la interfaz | Should Have | 8 | 7 | Pendiente | Javier Sepúlveda (propuesto) |
| HU29 | Cambiar mi propia contraseña | Should Have | 3 | 7 | Pendiente | Oscar Ruiz (propuesto) |

## 4. Sprint Backlog

### Sprint 1 — Cimientos: seguridad y proveedores

| HU | Historia | Puntos | Responsable |
|---|---|---|---|
| HU01 | Iniciar sesión de forma segura | 8 | Andrés Fernández |
| HU02 | Gestionar cuentas de usuario | 5 | Oscar Ruiz |
| HU03 | Registrar nuevo proveedor | 5 | Oscar Ruiz |
| HU14 | Visualizar dashboard con KPIs operativos | 8 | Andrés Fernández |
| | **Total del sprint** | **26** | |

### Sprint 2 — Núcleo: pedidos y recetas

| HU | Historia | Puntos | Responsable |
|---|---|---|---|
| HU07 | Registrar un pedido de casetones | 8 | Andrés Fernández |
| HU10 | Gestionar el estado de un pedido | 8 | Andrés Fernández |
| HU11 | Ver consumo de materiales requerido por receta | 5 | Oscar Ruiz |
| | **Total del sprint** | **21** | |

### Sprint 3 — Inventario: automatización y ajustes

| HU | Historia | Puntos | Responsable |
|---|---|---|---|
| HU04 | Buscar y filtrar proveedores | 3 | Oscar Ruiz |
| HU05 | Visualizar inventario de materiales | 5 | Javier Sepúlveda |
| HU08 | Confirmar inicio de producción con descuento automático | 13 | Andrés Fernández |
| HU09 | Registrar ajuste de inventario con justificación | 8 | Javier Sepúlveda |
| HU13 | Recibir alertas de stock mínimo | 5 | Javier Sepúlveda |
| | **Total del sprint** | **34** | |

### Sprint 4 — Reportes: trazabilidad y auditoría

| HU | Historia | Puntos | Responsable |
|---|---|---|---|
| HU06 | Generar reportes operativos | 8 | Javier Sepúlveda |
| HU12 | Consultar historial de movimientos de inventario | 5 | Javier Sepúlveda |
| HU15 | Consultar log de auditoría de acciones | 5 | Oscar Ruiz |
| | **Total del sprint** | **18** | |

### Sprint 5 — Consolidación: abastecimiento, catálogos y seguridad de sesión

| HU | Historia | Puntos | Responsable |
|---|---|---|---|
| HU16 | Registrar compra a proveedor e ingresar stock | 8 | Javier Sepúlveda |
| HU17 | Consultar compras y su detalle | 3 | Javier Sepúlveda |
| HU18 | Gestionar materias primas | 5 | Javier Sepúlveda |
| HU19 | Administrar recetas BOM | 5 | Andrés Fernández |
| HU20 | Mantener y cerrar la sesión de forma segura | 5 | Andrés Fernández |
| HU21 | Bloquear la cuenta tras intentos fallidos | 3 | Andrés Fernández |
| HU22 | Editar los datos de un proveedor | 3 | Andrés Fernández |
| HU23 | Buscar y filtrar pedidos | 3 | Andrés Fernández |
| HU24 | Editar, buscar y filtrar cuentas de usuario | 5 | Andrés Fernández |
| HU25 | Consultar y filtrar solicitudes de ajuste de inventario | 3 | Andrés Fernández |
| | **Total del sprint** | **43** | |

### Sprint 6 — Despliegue y operación segura

| HU | Historia | Puntos | Responsable |
|---|---|---|---|
| HU26 | Crear el primer administrador al desplegar en producción | 3 | Andrés Fernández |
| HU27 | Arrancar el sistema de forma segura y verificar su estado | 5 | Andrés Fernández |
| | **Total del sprint** | **8** | |

### Sprint 7 — Siguiente: recetas nuevas, credenciales propias y HTTPS (planificado, sin iniciar)

| HU | Historia | Puntos | Responsable |
|---|---|---|---|
| HU28 | Crear una nueva receta (producto) desde la interfaz | 8 | Javier Sepúlveda (propuesto) |
| HU29 | Cambiar mi propia contraseña | 3 | Oscar Ruiz (propuesto) |
| HU30 | Publicar el sistema con HTTPS | 5 | Oscar Ruiz (propuesto) |
| | **Total del sprint** | **16** | |

**Velocidad por sprint (puntos entregados):** S1 = 26 · S2 = 21 · S3 = 34 · S4 = 18 · S5 = 43 · S6 = 8. El Sprint 7 (16 puntos) está planificado y aún no se inicia.

## 5. Distribución de la carga por historia (según el plan)

| Integrante | Historias | Puntos |
|---|---|---|
| Andrés Fernández | 14 | 80 |
| Javier Sepúlveda | 9 | 55 |
| Oscar Ruiz | 7 | 31 |

> La columna "Responsable" de las historias HU01 a HU15 viene del plan original (`docs/03`), salvo HU02, HU06 y HU14, que se reasignaron el 2026-11-23 (una por integrante) porque su responsable original ya no hace parte del equipo. En HU16 a HU27 es el autor principal del código según el historial de git (HU22 a HU27 se escribieron casi por completo en commits de Andrés Fernández). Para HU28 a HU30, que aún no se construyen, el responsable es una **propuesta** que busca equilibrar la carga: Oscar Ruiz es quien menos puntos tiene. La distribución sigue sin ser pareja: Andrés Fernández concentra la mayor carga. Se recomienda rebalancearla en el siguiente planning (ver [retrospectiva](../equipo-y-retrospectiva.md)).

## 6. Tareas asignadas en GitHub (issues)

Cantidad de issues por persona (69 en total):

| Asignado a | Issues |
|---|---|
| Andrés Fernández | 40 |
| Oscar Ruiz | 15 |
| Javier Sepúlveda | 11 |
| — sin asignar — | 3 |

### 6.1 Pendientes (Product Backlog abierto)

| Issue | Tarea | Asignado |
|---|---|---|
| [#99](https://github.com/andresactividades1419-cloud/CASETECH/issues/99) | feat(recipes): permitir crear un producto/receta nuevo desde la UI | Javier Sepúlveda |
| [#105](https://github.com/andresactividades1419-cloud/CASETECH/issues/105) | docs: RNF-SEG desactualizado (passlib, refresh token, RBAC de proveedores) | Oscar Ruiz |
| [#106](https://github.com/andresactividades1419-cloud/CASETECH/issues/106) | docs: RNF-BD-01 no contempla el uso intencional de SQLite en tests | Javier Sepúlveda |
| [#107](https://github.com/andresactividades1419-cloud/CASETECH/issues/107) | chore(ci): agregar medición de cobertura de tests (pytest-cov) en backend | Andrés Fernández |
| [#108](https://github.com/andresactividades1419-cloud/CASETECH/issues/108) | perf: falta índice en materiales.activo (documentado en RNF-PERF-01, no implementado) | Andrés Fernández |
| [#109](https://github.com/andresactividades1419-cloud/CASETECH/issues/109) | chore(deps): fijar axios y vite a versión exacta en frontend/package.json | Oscar Ruiz |
| [#110](https://github.com/andresactividades1419-cloud/CASETECH/issues/110) | test: cobertura de tests del frontend es casi nula (solo 2 tests, ningún componente) | Oscar Ruiz |
| [#112](https://github.com/andresactividades1419-cloud/CASETECH/issues/112) | fix(sp): typo cosmético 'ms' en vez de 'm' en mensaje de déficit de stock | Andrés Fernández |
| [#118](https://github.com/andresactividades1419-cloud/CASETECH/issues/118) | fix(frontend): las fechas de entrega se muestran un día antes (UTC vs hora local) | Oscar Ruiz |
| [#119](https://github.com/andresactividades1419-cloud/CASETECH/issues/119) | fix(frontend): el signo del Kardex no refleja si el stock sube o baja (pantalla y CSV) | Oscar Ruiz |
| [#120](https://github.com/andresactividades1419-cloud/CASETECH/issues/120) | fix(dashboard): 'Total Fabricado' cuenta pedidos pendientes y cancelados | Andrés Fernández |
| [#121](https://github.com/andresactividades1419-cloud/CASETECH/issues/121) | fix(auth): reactivar un usuario bloqueado no reinicia su contador de intentos fallidos | Javier Sepúlveda |
| [#122](https://github.com/andresactividades1419-cloud/CASETECH/issues/122) | fix(frontend): ReviewModal dice que el admin puede autoaprobar un ajuste, pero el backend responde 403 | Oscar Ruiz |
| [#123](https://github.com/andresactividades1419-cloud/CASETECH/issues/123) | test: los Stored Procedures no se prueban contra PostgreSQL y su lógica está duplicada en Python | Andrés Fernández |
| [#124](https://github.com/andresactividades1419-cloud/CASETECH/issues/124) | docs: RF05 dice que solo el ADMINISTRADOR crea pedidos, pero el OPERARIO puede crearlos y cancelarlos | Andrés Fernández |
| [#125](https://github.com/andresactividades1419-cloud/CASETECH/issues/125) | fix(security): el límite de intentos de login se cuenta por separado en cada worker | Javier Sepúlveda |
| [#126](https://github.com/andresactividades1419-cloud/CASETECH/issues/126) | fix(security): la exportación del Kardex a CSV queda abierta al OPERARIO por /dashboard y el test protege otra ruta | Javier Sepúlveda |
| [#127](https://github.com/andresactividades1419-cloud/CASETECH/issues/127) | test: el CRUD de usuarios se prueba en endpoints heredados (/auth/*) y la interfaz usa /users | Javier Sepúlveda |

### 6.2 Terminadas

| Issue | Tarea | Asignado |
|---|---|---|
| [#1](https://github.com/andresactividades1419-cloud/CASETECH/issues/1) | readme.md | — sin asignar — |
| [#2](https://github.com/andresactividades1419-cloud/CASETECH/issues/2) | Configuración inicial de gobernanza, Docker Compose, UV y PNPM | Andrés Fernández |
| [#4](https://github.com/andresactividades1419-cloud/CASETECH/issues/4) | Diseño del modelo entidad-relación y diccionario de datos PostgreSQL 16 | Andrés Fernández |
| [#6](https://github.com/andresactividades1419-cloud/CASETECH/issues/6) | Configuración de conexión PostgreSQL, modelos ORM SQLAlchemy y migración Alembic | Andrés Fernández |
| [#8](https://github.com/andresactividades1419-cloud/CASETECH/issues/8) | Implementación de Autenticación Segura (JWT, bcrypt) y Esquemas Pydantic | Andrés Fernández |
| [#10](https://github.com/andresactividades1419-cloud/CASETECH/issues/10) | Implementación del Módulo de Proveedores (CRUD, Stored Procedure y Borrado Lógico) | Andrés Fernández |
| [#13](https://github.com/andresactividades1419-cloud/CASETECH/issues/13) | Implementación del Frontend Base, Autenticación JWT y Layout (HU01 & HU06) | — sin asignar — |
| [#15](https://github.com/andresactividades1419-cloud/CASETECH/issues/15) | Implementación de la Vista y Gestión de Proveedores en React (HU02 & HU03) | Andrés Fernández |
| [#17](https://github.com/andresactividades1419-cloud/CASETECH/issues/17) | Implementación del Módulo de Materiales e Insumos de Producción (HU10) | Andrés Fernández |
| [#21](https://github.com/andresactividades1419-cloud/CASETECH/issues/21) | cambio de logo de casetech | Oscar Ruiz |
| [#23](https://github.com/andresactividades1419-cloud/CASETECH/issues/23) | cambio en documentacion | Oscar Ruiz |
| [#25](https://github.com/andresactividades1419-cloud/CASETECH/issues/25) | Implementación del Módulo de Pedidos y Motor de Recetas BOM (HU07, HU11) | Andrés Fernández |
| [#27](https://github.com/andresactividades1419-cloud/CASETECH/issues/27) | Implementación del Módulo de Ajustes Manuales de Inventario y Auditoría (HU13) | Andrés Fernández |
| [#29](https://github.com/andresactividades1419-cloud/CASETECH/issues/29) | Implementación del Módulo de Compras a Proveedores e Ingreso de Stock (HU07 Compras) | Andrés Fernández |
| [#31](https://github.com/andresactividades1419-cloud/CASETECH/issues/31) | Implementación del Dashboard de Auditoría, Trazabilidad y Reportes (HU15) | — sin asignar — |
| [#34](https://github.com/andresactividades1419-cloud/CASETECH/issues/34) | Rediseño De Login | Andrés Fernández |
| [#36](https://github.com/andresactividades1419-cloud/CASETECH/issues/36) | Rediseño del dahsboard | Andrés Fernández |
| [#39](https://github.com/andresactividades1419-cloud/CASETECH/issues/39) | rediseño y ajustes del dahsboard | Andrés Fernández |
| [#41](https://github.com/andresactividades1419-cloud/CASETECH/issues/41) | Corrección de Procedimientos Transaccionales (sp_crear_proveedor, Doble Firma en Ajustes) y Unificación de Consumo de Producción | Andrés Fernández |
| [#43](https://github.com/andresactividades1419-cloud/CASETECH/issues/43) | corrección de pantalla en negro (crash) al confirmar compras y registrar ajustes de inventario | Oscar Ruiz |
| [#45](https://github.com/andresactividades1419-cloud/CASETECH/issues/45) | Cambio de logo principal | Oscar Ruiz |
| [#48](https://github.com/andresactividades1419-cloud/CASETECH/issues/48) | fix: corrección de vulnerabilidades críticas de autenticación JWT, init_db y configuración CORS | Andrés Fernández |
| [#49](https://github.com/andresactividades1419-cloud/CASETECH/issues/49) | chore: actualización de dependencias con CVEs críticas y auditoría de seguridad | Oscar Ruiz |
| [#50](https://github.com/andresactividades1419-cloud/CASETECH/issues/50) | ci: implementación de pipeline de integración continua (CI) en GitHub Actions | Javier Sepúlveda |
| [#51](https://github.com/andresactividades1419-cloud/CASETECH/issues/51) | chore: actualización de dependencias con CVEs críticas y auditoría de seguridad | Oscar Ruiz |
| [#52](https://github.com/andresactividades1419-cloud/CASETECH/issues/52) | ci: implementación de pipeline de integración continua (CI) en GitHub Actions | Javier Sepúlveda |
| [#53](https://github.com/andresactividades1419-cloud/CASETECH/issues/53) | test: pruebas de integración de procedimientos transaccionales (BOM, Estados, Doble Firma) | Javier Sepúlveda |
| [#54](https://github.com/andresactividades1419-cloud/CASETECH/issues/54) | docs: actualización exhaustiva de README.md, licencia y optimización de assets | Oscar Ruiz |
| [#55](https://github.com/andresactividades1419-cloud/CASETECH/issues/55) | feat: previsualización de recetas de producción BOM y gestión de usuarios (HU11, HU02) | Andrés Fernández |
| [#56](https://github.com/andresactividades1419-cloud/CASETECH/issues/56) | feat: exportación de reportes a formato CSV en Kardex y Bitácora (HU06) | Oscar Ruiz |
| [#57](https://github.com/andresactividades1419-cloud/CASETECH/issues/57) | ops: configuración de despliegue para producción con Nginx y Docker Compose | Javier Sepúlveda |
| [#58](https://github.com/andresactividades1419-cloud/CASETECH/issues/58) | release: validación limpia, protección de ramas y publicación final | Andrés Fernández |
| [#67](https://github.com/andresactividades1419-cloud/CASETECH/issues/67) | fix: implementar fail-fast en credenciales sensibles y alinear licencia mit | Andrés Fernández |
| [#68](https://github.com/andresactividades1419-cloud/CASETECH/issues/68) | chore: fijar pnpm 9.1.0 en dockerfile y optimizar logotipo a webp | Oscar Ruiz |
| [#69](https://github.com/andresactividades1419-cloud/CASETECH/issues/69) | perf: resolver consulta n+1 en pedidos y agregar rate limiting en auth | Javier Sepúlveda |
| [#70](https://github.com/andresactividades1419-cloud/CASETECH/issues/70) | release: proteccion de rama main validacion limpia | Andrés Fernández |
| [#75](https://github.com/andresactividades1419-cloud/CASETECH/issues/75) | fix(orders): revertir inventario al cancelar un pedido en producción (RF06) | Andrés Fernández |
| [#76](https://github.com/andresactividades1419-cloud/CASETECH/issues/76) | fix(auth): mover el token JWT de localStorage a memoria (RF01) | Andrés Fernández |
| [#77](https://github.com/andresactividades1419-cloud/CASETECH/issues/77) | feat(reports): completar los 3 reportes CSV faltantes de RF12 | Andrés Fernández |
| [#78](https://github.com/andresactividades1419-cloud/CASETECH/issues/78) | refactor(bom): eliminar distinción RECUPERABLE/PERDIDO del motor BOM | Andrés Fernández |
| [#79](https://github.com/andresactividades1419-cloud/CASETECH/issues/79) | chore(deps): eliminar dependencia passlib sin usar | Andrés Fernández |
| [#80](https://github.com/andresactividades1419-cloud/CASETECH/issues/80) | feat(auth): evaluar e implementar bloqueo de cuenta a 5 intentos fallidos (RF01) | Andrés Fernández |
| [#81](https://github.com/andresactividades1419-cloud/CASETECH/issues/81) | chore(db): agregar naming_convention a SQLAlchemy Base | Andrés Fernández |
| [#82](https://github.com/andresactividades1419-cloud/CASETECH/issues/82) | fix(db): poblar updated_at desde la creación del registro | Andrés Fernández |
| [#83](https://github.com/andresactividades1419-cloud/CASETECH/issues/83) | docs: revisar formato de RFs/HUs contra la plantilla de referencia | Andrés Fernández |
| [#86](https://github.com/andresactividades1419-cloud/CASETECH/issues/86) | feat(auth): implementar flujo de refresh token | Andrés Fernández |
| [#88](https://github.com/andresactividades1419-cloud/CASETECH/issues/88) | chore(data): configurar recetas BOM reales para desarrollo y demo | Andrés Fernández |
| [#92](https://github.com/andresactividades1419-cloud/CASETECH/issues/92) | chore(deps): actualizar uv para que soporte [dependency-groups] correctamente | Andrés Fernández |
| [#95](https://github.com/andresactividades1419-cloud/CASETECH/issues/95) | docs: corregir referencias a RECUPERABLE/PERDIDO tras el #78 | Andrés Fernández |
| [#96](https://github.com/andresactividades1419-cloud/CASETECH/issues/96) | fix: 3 bugs encontrados en el arranque limpio (docker compose down -v) | Andrés Fernández |
| [#128](https://github.com/andresactividades1419-cloud/CASETECH/issues/128) | fix(security): el JWT_SECRET de ejemplo de .env.example se aceptaba en producción | Andrés Fernández |

## 7. Definición de Hecho (DoD)

Una historia está **Hecha** cuando:

1. Cumple todos sus criterios de aceptación (escenarios Gherkin de `docs/03`).
2. Tiene su rama propia, commits en formato Conventional Commits y un Pull Request revisado.
3. El CI está en verde (lint, tipos, auditoría de dependencias, pruebas y build).
4. Se probó funcionando en Docker (no solo en las pruebas automáticas).
5. La documentación afectada (RF, HU, modelo de datos) quedó actualizada.

## 8. Ceremonias

| Ceremonia | Para qué | Evidencia en el repositorio |
|---|---|---|
| Planning (y Planning Poker) | Estimar y comprometer las historias del sprint | [`planning-poker.md`](./planning-poker.md) |
| Daily | Sincronizar avances y bloqueos | Sin registro formal; el avance se ve en issues, tablero y commits. Se recomienda anotar acuerdos y bloqueos en el tablero. |
| Sprint Review | Mostrar el incremento funcionando | Releases publicados (v0.1.0-alpha a v1.6.3) |
| Retrospectiva | Qué mejorar del proceso | Sección 10 del informe Scrum |
