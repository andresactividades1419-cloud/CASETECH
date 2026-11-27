# Lista de chequeo de entrega — CASETECH ERP

> **Fecha:** 2026-11-26 · **Equipo:** Andrés Fernández · Javier Sepúlveda · Oscar Ruiz
> **Para qué sirve:** reúne, criterio por criterio, qué se hizo, dónde está la evidencia y qué falta. Cada estado se verificó contra el repositorio, no se estimó.
> **Leyenda:** ✅ Cumple · ⚠️ Cumple en parte · ❌ Pendiente · ➖ Opcional (bonificación)

## 1. Resumen

| # | Criterio | Estado |
|---|---|---|
| 1 | Documentación general (MER, modelo relacional, UML, casos de uso, clases) | ✅ |
| 2 | Informes Scrum (backlog, sprints, historias puntuadas, tareas, planning poker) | ⚠️ |
| 3 | El backend arranca sin errores | ✅ |
| 4 | Variables de entorno y despliegue apropiado (backend y frontend) | ✅ |
| 5 | Diagrama de arquitectura | ✅ |
| 6 | Bonificación IoT | ➖ |
| 7 | Plan de pruebas (alcance, niveles, ambiente separado) | ✅ |
| 8 | Al menos 20 pruebas unitarias automatizadas | ✅ |
| 9 | Reporte de ejecución y defectos con severidad y estado | ✅ |
| 10 | Frontend (pantallas, rutas, colores, UX/UI) | ✅ |
| 11 | README con sección de pruebas y API documentada | ✅ |
| 12 | Repositorio: ramas y commits | ⚠️ |
| 13 | Feedback del equipo, trabajo dividido y tareas | ⚠️ |
| 14 | Reflexión comparativa de los 4 backends y deuda técnica priorizada | ❌ |

**Resultado:** 9 criterios cumplen, 3 cumplen en parte, 1 está pendiente y 1 es opcional.

---

## 2. Detalle por criterio

### 1. Documentación general ✅

| Qué se pide | Dónde está |
|---|---|
| Modelo entidad-relación (MER) | [`04-modelo-datos.md`](./04-modelo-datos.md) (completo, 13 tablas) y [`05-modelado-y-diagramas.md`](./05-modelado-y-diagramas.md) §1 (vista por dominios) |
| Modelo relacional (MR) y diccionario de datos | `05` §2 y `04` §2 (llaves, tipos, índices y 4 Stored Procedures) |
| Casos de uso | `05` §3: 24 casos de uso (CU01 a CU24) con su historia de usuario y su endpoint. Los pendientes se dibujan con línea punteada |
| Diagrama de clases | `05` §4 |
| Diagramas de secuencia | `05` §5 (iniciar producción, login con bloqueo y renovación, ajuste con doble firma) |
| Diagramas de estado | `05` §6 (pedido y ajuste) |

**Falta:** nada.

### 2. Informes Scrum ⚠️

| Qué se pide | Dónde está |
|---|---|
| Historias de usuario con puntos | [`03-historias-de-usuario.md`](./03-historias-de-usuario.md): **30 historias** (HU01 a HU30), 166 puntos, escenarios en Gherkin, prioridad MoSCoW |
| Product Backlog y Sprint Backlog | [`scrum/product-backlog.md`](./scrum/product-backlog.md): 7 sprints, velocidad por sprint, carga por persona |
| Planning poker | [`scrum/planning-poker.md`](./scrum/planning-poker.md): reglas, historias de referencia, hoja de estimación de HU16 a HU30 y razonamiento de cada valor |
| Tareas | 69 issues en GitHub, gestionados en un tablero de GitHub Projects; los 18 abiertos tienen responsable (6 por persona) |
| Roles Scrum | Product Owner: Andrés Fernández. Scrum Master: Javier Sepúlveda ([`equipo-y-retrospectiva.md`](./equipo-y-retrospectiva.md)) |
| Informe para entregar | `Informe-Scrum-CASETECH-ERP.docx` y `.pdf` (13 páginas, con gráfico de avance). Está en `evidencias-entrega/`, **fuera del repositorio** |

**Falta:** una **sesión real de planning poker**. La hoja existe, pero los votos de los tres integrantes están en blanco y los puntos de HU16 a HU30 son una estimación inicial. Sin esa sesión no hay evidencia de votos reales.

### 3. El backend arranca sin errores ✅

- Se verificó un arranque limpio (`docker compose down -v` y `up --build`): 8 migraciones, datos semilla y los 4 Stored Procedures.
- Si falta una variable o tiene el valor de ejemplo fuera de desarrollo, el backend se detiene con un mensaje claro y sin traceback (historia HU27).
- `/health` informa si el backend conecta con la base de datos (200 o 503).
- Se corrigió el error de recarga de archivos en Windows (`WATCHFILES_FORCE_POLLING`).
- Evidencia: [`07-despliegue.md`](./07-despliegue.md), issue [#96](https://github.com/andresactividades1419-cloud/CASETECH/issues/96).

**Falta:** nada.

### 4. Variables de entorno y despliegue ✅

- Variables documentadas en `.env.example` y en una tabla de [`07-despliegue.md`](./07-despliegue.md): cuáles son obligatorias, para qué sirven y qué pasa si están mal.
- `docker-compose.yml` (desarrollo) y `docker-compose.prod.yml` (producción: solo se publica Nginx; backend y base de datos en red interna; healthchecks encadenados).
- Se probó el despliegue de producción de punta a punta y se corrigieron 4 fallas reales (comando de uvicorn, URL de la API compilada, redirecciones y usuario inicial) más 2 de seguridad: el límite de login falseable ([`docs/07`](./07-despliegue.md#5-problemas-que-ya-aparecieron-y-por-qué)) y el `JWT_SECRET` de ejemplo aceptado en producción ([#128](https://github.com/andresactividades1419-cloud/CASETECH/issues/128)).
- Script para crear el primer administrador: `backend/app/scripts/create_admin.py` (HU26).

**Falta:** HTTPS. Es una limitación documentada y está planificada como **HU30** (Sprint 7).

### 5. Diagrama de arquitectura ✅

[`06-arquitectura.md`](./06-arquitectura.md): contenedores y comunicación, capas del backend, estructura del frontend, recorrido de una petición, orden de arranque en producción y pipeline del CI. Incluye seguridad por capas, decisiones de arquitectura, versiones y 8 limitaciones conocidas. Imágenes en `evidencias-entrega/capturas/` (20 y 21).

**Falta:** nada.

### 6. Bonificación IoT ➖

No existe nada de IoT en el proyecto. Es bonificación, no obligatorio.

**Falta:** decisión del equipo: hacerlo o descartarlo.

### 7. Plan de pruebas ✅

[`estrategia-pruebas.md`](./estrategia-pruebas.md): riesgos, qué prueba cada capa y por qué, qué no se prueba, datos y entornos (base de pruebas separada, recreada antes de cada test), CI y umbrales, hallazgos y evidencia individual.

> Las cifras de pruebas y de cobertura de ese documento, del reporte y del README corresponden al **2026-11-20**. El número vigente es el del CI de GitHub.

**Falta:** nada.

### 8. Pruebas unitarias automatizadas ✅

Hay pruebas automatizadas de backend (pytest), de frontend (Vitest) y de extremo a extremo (Playwright), muy por encima de 20. El detalle por archivo y el resultado de la ejecución están en [`reporte-ejecucion-pruebas.md`](./reporte-ejecucion-pruebas.md) y en el CI.

**Falta:** nada.

### 9. Reporte de ejecución y defectos ✅

[`reporte-ejecucion-pruebas.md`](./reporte-ejecucion-pruebas.md): resultados por suite, cobertura y un registro de **29 defectos** (15 corregidos y 14 abiertos) con escala de severidad. En GitHub existen las etiquetas `severidad: crítica | alta | media | baja` y cada defecto abierto es un issue con pasos para reproducir, evidencia y capa que lo detectó (#118 a #128).

**Falta:** nada. El defecto de severidad alta abierto es [#123](https://github.com/andresactividades1419-cloud/CASETECH/issues/123).

### 10. Frontend ✅

9 pantallas, rutas protegidas por rol, paleta de botones unificada y formularios que se activan solo al validar. Capturas de todas las pantallas en `evidencias-entrega/capturas/` (01 a 19).

**Falta:** tres defectos visuales ya registrados: fechas un día antes ([#118](https://github.com/andresactividades1419-cloud/CASETECH/issues/118)), signo del Kardex ([#119](https://github.com/andresactividades1419-cloud/CASETECH/issues/119)) y el aviso de doble firma ([#122](https://github.com/andresactividades1419-cloud/CASETECH/issues/122)).

### 11. README con pruebas y API documentada ✅

[`README.md`](../README.md): sección de pruebas (backend, frontend, Playwright, cobertura, calidad de código, auditorías de CVE y CI), **tabla de 50 endpoints** con rol requerido, cómo autenticarse, despliegue en producción con tabla de variables e índice de toda la documentación.

**Falta:** nada.

### 12. Repositorio: ramas y commits ⚠️

- Ramas `main` y `develop`, nombres de rama `tipo/descripción` en inglés, commits en formato Conventional Commits y 70 Pull Requests.
- `develop` protegida (Pull Request, 1 aprobación de otra persona y los dos jobs del CI) y `main` con 1 aprobación.
- 10 releases publicados (v0.1.0-alpha a v1.6.3).

**Falta:**
- El PR [#129](https://github.com/andresactividades1419-cloud/CASETECH/pull/129) (de `chore/deploy-hardening-and-docs` hacia `main`) sigue abierto; el mismo cambio ya está en `develop` por el PR #130. Hay que decidir si se cierra.
- Llevar `develop` a `main` para que `main` tenga lo corregido (hoy `main` no incluye nada de esto).
- Subir los cambios de historias de usuario de este documento.

### 13. Feedback del equipo, trabajo dividido y tareas ⚠️

[`equipo-y-retrospectiva.md`](./equipo-y-retrospectiva.md): roles Scrum, reparto de historias (14 / 9 / 7 historias; 80 / 55 / 31 puntos), reparto de los 18 issues abiertos (6 por persona), métricas reales del repositorio, análisis de la revisión de código (88 % de los PRs sin review registrada), 8 acuerdos de trabajo propuestos y plantilla de retrospectiva. La matriz de rotación está en [`matriz-rotacion.md`](./matriz-rotacion.md).

**Falta:** que el equipo **llene la plantilla de retrospectiva** (autoevaluación y feedback entre pares). Esa parte la escriben ustedes, no se puede inferir de los datos.

### 14. Reflexión comparativa de los 4 backends y deuda técnica ❌

La deuda técnica existe dispersa, pero no consolidada ni priorizada: limitaciones en [`06-arquitectura.md`](./06-arquitectura.md) §10, deuda en el reporte §5.5 y 18 issues abiertos.

**Falta:**
- Un documento de deuda técnica **priorizada**.
- La **reflexión comparativa** con los otros 3 backends del programa. Necesita saber cuáles son y qué tecnología usó cada uno.

---

## 3. Qué falta para cerrar, en orden

| Prioridad | Pendiente | Quién decide o lo hace |
|---|---|---|
| 1 | Llevar lo corregido a `develop` y `main` (y decidir qué pasa con el PR #129) | Andrés, con la aprobación de otra persona |
| 2 | Documento de deuda técnica priorizada y reflexión de los 4 backends (criterio 14) | Equipo; falta la información de los otros 3 backends |
| 3 | Llenar la plantilla de retrospectiva (criterio 13) | Los tres integrantes |
| 4 | Sesión real de planning poker para HU16 a HU30 (criterio 2) | Los tres integrantes |
| 5 | Decidir si se hace la bonificación IoT (criterio 6) | Equipo |
| 6 | Decisiones de producto abiertas: permisos del OPERARIO ([#124](https://github.com/andresactividades1419-cloud/CASETECH/issues/124)) y qué cuenta como "fabricado" ([#120](https://github.com/andresactividades1419-cloud/CASETECH/issues/120)) | Product Owner |

---

## 4. Historias de usuario: de 21 a 30

Se agregaron 9 historias. Seis describen funcionalidad **ya construida** que no tenía historia; tres son trabajo **pendiente** que salió de la revisión de calidad.

| HU | Historia | Estado | Sprint | Puntos |
|---|---|---|---|---|
| HU22 | Editar los datos de un proveedor | Hecha | 5 | 3 |
| HU23 | Buscar y filtrar pedidos | Hecha | 5 | 3 |
| HU24 | Editar, buscar y filtrar cuentas de usuario | Hecha | 5 | 5 |
| HU25 | Consultar y filtrar solicitudes de ajuste de inventario | Hecha | 5 | 3 |
| HU26 | Crear el primer administrador al desplegar en producción | Hecha | 6 | 3 |
| HU27 | Arrancar el sistema de forma segura y verificar su estado | Hecha | 6 | 5 |
| HU28 | Crear una nueva receta (producto) desde la interfaz | Pendiente ([#99](https://github.com/andresactividades1419-cloud/CASETECH/issues/99)) | 7 | 8 |
| HU29 | Cambiar mi propia contraseña | Pendiente | 7 | 3 |
| HU30 | Publicar el sistema con HTTPS | Pendiente | 7 | 5 |

Con ellas el producto pasa a **30 historias y 166 puntos** (150 entregados y 16 pendientes). Los escenarios de HU22 a HU27 usan los mensajes y textos reales del sistema. Los de HU28 a HU30 son una **propuesta** que el Product Owner debe confirmar antes de construirlas.
