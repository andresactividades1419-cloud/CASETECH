# Equipo, reparto del trabajo y retrospectiva — CASETECH ERP

> **Fecha:** 2026-11-20 · **Periodo analizado:** 2026-08-24 (primer PR) a 2026-11-20
> **Equipo:** Andrés Fernández · Javier Sepúlveda · Oscar Ruiz
> **Fuente de los datos:** historial de git (todas las ramas), PRs, issues y reviews de GitHub, y `docs/03-historias-de-usuario.md`. Las cifras se calcularon, no se estimaron.
> **Relacionado:** [`scrum/product-backlog.md`](./scrum/product-backlog.md) · [`matriz-rotacion.md`](./matriz-rotacion.md) · [`reporte-ejecucion-pruebas.md`](./reporte-ejecucion-pruebas.md)

## 1. Roles Scrum

| Rol | Persona | Qué hace |
|---|---|---|
| **Product Owner** | Andrés Fernández | Decide las prioridades y el alcance, mantiene el backlog y acepta o rechaza el trabajo terminado. Resuelve las decisiones de negocio pendientes (por ejemplo [#124](https://github.com/andresactividades1419-cloud/CASETECH/issues/124)). |
| **Scrum Master** | Javier Sepúlveda | Facilita el proceso y cuida las reglas del equipo: que los PR se revisen, que el CI esté en verde y que las retrospectivas se hagan. Quita impedimentos. |
| **Equipo de desarrollo** | Andrés · Javier · Oscar | Construye, prueba y documenta. Cada integrante toma los issues de su columna (sección 4). |

Roles confirmados el 2026-11-20. Andrés ya cumplía de hecho el rol de dueño del producto (decide alcance y mantiene tablero e issues); Javier ya era quien aprobaba los PR hacia `main`.

## 2. Reparto del trabajo: lo acordado frente a lo real

### 2.1 Lo acordado

- **División técnica** (guía interna del proyecto): Andrés lleva base de datos y backend; Javier y Oscar se dividen el frontend por módulos.
- **Responsables por historia de usuario** (`docs/03-historias-de-usuario.md`), sobre 21 historias y 128 puntos:

| Integrante | Historias | Puntos | Historias a su cargo |
|---|---|---|---|
| Andrés Fernández | 8 | 58 | HU01, HU07, HU08, HU10, HU14, HU19, HU20, HU21 |
| Javier Sepúlveda | 8 | 47 | HU05, HU06, HU09, HU12, HU13, HU16, HU17, HU18 |
| Oscar Ruiz | 5 | 23 | HU02, HU03, HU04, HU11, HU15 |

HU02, HU06 y HU14 se reasignaron el 2026-11-23, una por integrante, porque su responsable original ya no hace parte del equipo.

### 2.2 Lo real (repositorio)

| Métrica | Andrés | Javier | Oscar |
|---|---|---|---|
| Commits (sin merges, todas las ramas) | 65 | 4 | 3 |
| Líneas modificadas (sin archivos de bloqueo)¹ | 31.832 (83 %) | 6.446 (17 %) | 60 (0,2 %) |
| — en frontend | 14.737 | 2.486 | 0 |
| — en backend | 11.351 | 2.469 | 0 |
| — en pruebas (backend, frontend, E2E) | 690 | 948 | 58 |
| — en documentación | 4.710 | 0 | 2 |
| PRs abiertos / mergeados | 54 / 54 | 4 / 3 | 1 / 1 |
| PRs que aprobó (reviews) | 0 | 7 | 0 |
| Issues cerrados asignados | 34 | 5 | 9 |

¹ Líneas añadidas más borradas, excluyendo `uv.lock` y `pnpm-lock.yaml`. Los datos usan el nombre del autor de cada commit; las dos cuentas de Andrés y las dos de Oscar se unificaron.

**Cómo leer estas cifras con justicia:**
- Los commits y las líneas **no miden el valor** del trabajo. Javier tiene solo 4 commits, pero grandes (de 1.600 líneas en promedio) y que mezclan varias cosas: la configuración de despliegue con Nginx y Docker, el pipeline de CI, las pruebas de integración de BOM, estados y doble firma, un E2E de navegación y las correcciones de código que acompañaron a esos cambios. El mensaje de cada commit no describe todo lo que cambió, por eso las cifras por área de Javier son aproximadas.
- Si alguien trabajó en pareja y el commit lo hizo una sola persona, el repositorio no lo refleja. Conviene que cada integrante lo diga en la retrospectiva (sección 6).
- **Issues cerrados:** los de Javier (5) y Oscar (9) se les asignaron cuando se trabajaron. De los 34 de Andrés, **14 se le asignaron después de cerrarse** (#75 a #96, trabajo ya hecho), así que la cifra de Andrés refleja el trabajo realizado y no una asignación previa. Los 9 de Oscar no tienen commits propios que los respalden (solo 3 commits, 58 líneas de E2E): conviene revisar con él cómo se integró ese trabajo.

### 2.3 Diferencias entre lo acordado y lo real

| Lo acordado | Lo real |
|---|---|
| Andrés lleva BD y backend; Javier y Oscar el frontend | Andrés modificó más frontend (14.737 líneas) que backend (11.351). Javier trabajó casi por igual en ambos (2.486 y 2.469); Oscar no tiene líneas en ninguno de los dos. |
| Reparto de historias 8 / 8 / 5 | El código de las historias originales de Oscar (HU03, HU04, HU11, HU15) no aparece en commits suyos. HU02, HU06 y HU14 (reasignadas el 2026-11-23) las programaron Andrés y Javier. |
| Rotación de capa cada semana (`matriz-rotacion.md`) | Solo existe la semana 1, con los tres integrantes de la matriz en E2E. |

## 3. Proceso de revisión de código

| Indicador | Valor |
|---|---|
| PRs mergeados | 58 (46 hacia `develop`, 12 hacia `main`) |
| PRs mergeados **sin ninguna review registrada** | **51 (88 %)** |
| PRs mergeados por la misma persona que los abrió | 53 de 58 (los mergeó Andrés) |
| Reviews registradas | 7, todas aprobaciones de Javier, todas en PRs hacia `main` |
| Comentarios de revisión en el código | 0 |

Las 7 reviews existen porque la protección de `main` exige 1 aprobación. Hacia `develop` la regla está configurada pero en la práctica no ha bloqueado merges. La matriz de rotación pide que "quien revisa tu PR haya trabajado en otra capa esa semana"; hoy esa regla no se cumple porque casi ningún PR se revisa.

## 4. Reparto de los issues abiertos (18)

Hasta hoy, 18 issues abiertos no tenían responsable. El Product Owner los repartió el 2026-11-20 entre Andrés, Javier y Oscar, **6 para cada uno**, según la capa y el esfuerzo:

| Responsable | Issue | Qué hay que hacer | Severidad |
|---|---|---|---|
| **Andrés** | [#123](https://github.com/andresactividades1419-cloud/CASETECH/issues/123) | Pruebas de los Stored Procedures contra PostgreSQL y eliminar la lógica duplicada | Alta |
| | [#124](https://github.com/andresactividades1419-cloud/CASETECH/issues/124) | Decidir qué puede hacer el OPERARIO con los pedidos (decisión del PO) | Media |
| | [#120](https://github.com/andresactividades1419-cloud/CASETECH/issues/120) | "Total Fabricado" cuenta pedidos pendientes y cancelados | Media |
| | [#112](https://github.com/andresactividades1419-cloud/CASETECH/issues/112) | Typo "ms" en el mensaje de déficit de stock (migración nueva) | Baja |
| | [#108](https://github.com/andresactividades1419-cloud/CASETECH/issues/108) | Índice faltante en `materiales.activo` | Baja |
| | [#107](https://github.com/andresactividades1419-cloud/CASETECH/issues/107) | Medición de cobertura del backend (ya hecha; se cierra al integrar la rama) | — |
| **Javier** | [#99](https://github.com/andresactividades1419-cloud/CASETECH/issues/99) | "Nueva Receta": crear un producto desde la interfaz (endpoint nuevo + formulario) | — |
| | [#127](https://github.com/andresactividades1419-cloud/CASETECH/issues/127) | Pruebas del CRUD de usuarios sobre `/users` y retirar los endpoints heredados | Media |
| | [#126](https://github.com/andresactividades1419-cloud/CASETECH/issues/126) | Exportación del Kardex abierta al OPERARIO | Media |
| | [#121](https://github.com/andresactividades1419-cloud/CASETECH/issues/121) | Reactivar usuario no reinicia los intentos fallidos | Baja |
| | [#125](https://github.com/andresactividades1419-cloud/CASETECH/issues/125) | Límite de logins por IP contado por worker | Baja |
| | [#106](https://github.com/andresactividades1419-cloud/CASETECH/issues/106) | RNF-BD-01 no contempla SQLite en las pruebas (documentación) | Baja |
| **Oscar** | [#110](https://github.com/andresactividades1419-cloud/CASETECH/issues/110) | Pruebas de componentes del frontend (hoy 0,76 % de cobertura) | — |
| | [#118](https://github.com/andresactividades1419-cloud/CASETECH/issues/118) | Fechas de entrega un día antes | Media |
| | [#119](https://github.com/andresactividades1419-cloud/CASETECH/issues/119) | Signo del Kardex en pantalla y CSV | Media |
| | [#122](https://github.com/andresactividades1419-cloud/CASETECH/issues/122) | `ReviewModal` contradice la doble firma | Media |
| | [#109](https://github.com/andresactividades1419-cloud/CASETECH/issues/109) | Versiones exactas de `axios` y `vite` | — |
| | [#105](https://github.com/andresactividades1419-cloud/CASETECH/issues/105) | RNF-SEG desactualizado (documentación) | Baja |

Quedan 3 issues **cerrados** históricos sin responsable ([#1](https://github.com/andresactividades1419-cloud/CASETECH/issues/1), [#13](https://github.com/andresactividades1419-cloud/CASETECH/issues/13) y [#31](https://github.com/andresactividades1419-cloud/CASETECH/issues/31)).

## 5. Acuerdos de trabajo (propuesta para ratificar)

Propuestos por el Product Owner y el Scrum Master a partir de los datos de la sección 3. Se ratifican, se ajustan o se descartan en la próxima reunión del equipo.

1. **Todo PR se revisa antes de mergear.** Lo revisa una persona distinta de quien lo abrió, y preferiblemente que haya trabajado en otra capa esa semana (regla de la matriz). Nadie mergea su propio PR sin una review registrada en GitHub.
2. **Meta medible:** que al menos el 80 % de los PRs mergeados tengan una review registrada. Hoy es el 12 %.
3. **Definición de "terminado":** una tarea se cierra cuando tiene su prueba, el CI en verde, el PR revisado y la documentación afectada actualizada.
4. **Máximo 2 issues en progreso por persona.** El tablero debe reflejar la realidad.
5. **Rotación de capa** al inicio de cada semana según la matriz, anotando a cada integrante.
6. **Retrospectiva corta al cerrar cada semana** con la plantilla de la sección 6; el Scrum Master la convoca y guarda el resultado en este documento.
7. **Trabajo en pareja visible:** si dos personas trabajan juntas, el commit lleva `Co-authored-by` para que el repositorio lo refleje.
8. **Commits pequeños y con un solo propósito**, con el mensaje en formato Conventional Commits que describa lo que de verdad cambió. Así el historial sirve para revisar y para repartir el mérito con justicia (hoy hay commits de más de 1.000 líneas que mezclan varios temas).

## 6. Plantilla de retrospectiva

> **Cómo usarla:** cada integrante la llena por su cuenta antes de la reunión (10 minutos); luego se lee en voz alta y se acuerdan las acciones. El contenido de esta sección lo escribe el equipo: aquí está solo la estructura.

**Fecha:** ____ · **Periodo revisado:** ____ · **Facilita:** Javier Sepúlveda · **Asisten:** ____

### 6.1 Lo que sale en equipo

| Qué salió bien | Qué salió mal o nos frenó | Qué aprendimos |
|---|---|---|
| | | |

### 6.2 Autoevaluación y feedback por persona

Para cada integrante, escrito por la propia persona (autoevaluación) y por el resto del equipo.

| Integrante | Continuar (lo que hace bien) | Empezar (lo que debería hacer) | Parar (lo que debería dejar de hacer) |
|---|---|---|---|
| Andrés Fernández | | | |
| Javier Sepúlveda | | | |
| Oscar Ruiz | | | |

### 6.3 Feedback entre pares

Una fila por cada par que se da feedback. Se escribe pensando en el trabajo, no en la persona.

| De → A | Lo que valoro de tu trabajo | Lo que te pediría mejorar |
|---|---|---|
| Andrés → Javier | | |
| Andrés → Oscar | | |
| Javier → Andrés | | |
| Javier → Oscar | | |
| Oscar → Andrés | | |
| Oscar → Javier | | |

### 6.4 Acciones acordadas

| Acción concreta | Responsable | Fecha límite | ¿Cumplida? |
|---|---|---|---|
| | | | |

### 6.5 Registro de retrospectivas realizadas

| Fecha | Participantes | Principales acuerdos |
|---|---|---|
| | | |
