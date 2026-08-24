# Análisis y Alcance del Sistema — CASETECH ERP

> **Versión:** 1.0.0  
> **Fecha:** Agosto 2026  
> **Equipo:** Andrés Fernández · Oscar Ruiz · Javier Sepúlveda · Angélica Arregoces  
> **Clasificación:** Documento Interno — Requisitos de Negocio  
> **Enfoque arquitectónico:** ERP Web Modular de Producción y Manufactura por Recetas (BOM — Bill of Materials)

---

## Tabla de Contenidos

1. [Descripción del Negocio](#1-descripción-del-negocio)
2. [Justificación del Proyecto](#2-justificación-del-proyecto)
3. [Reto Operativo Identificado](#3-reto-operativo-identificado)
4. [Objetivo General](#4-objetivo-general)
5. [Objetivos Específicos](#5-objetivos-específicos)
6. [Alcance del Sistema](#6-alcance-del-sistema)
7. [Módulos del Sistema](#7-módulos-del-sistema)
8. [Fuera del Alcance](#8-fuera-del-alcance)
9. [Supuestos y Restricciones](#9-supuestos-y-restricciones)
10. [Partes Interesadas (Stakeholders)](#10-partes-interesadas-stakeholders)

---

## 1. Descripción del Negocio

### 1.1 Naturaleza del Sistema

**CASETECH** implementa el patrón **ERP Web Modular de Producción y Manufactura por Recetas (BOM — Bill of Materials)**. Aunque el caso de uso inicial es una fábrica de casetones para construcción, la arquitectura de base de datos y el backend han sido diseñados de forma **genérica y parametrizable** para adaptarse a cualquier proceso de ensamble o manufactura que opere bajo el modelo:

```
Pedido  →  Receta (BOM)  →  Descuento de insumos  →  Producto terminado
```

La sustitución de `tipos_caseton` y `recetas` por cualquier otro catálogo de productos y su lista de materiales permite reutilizar el núcleo del sistema sin cambios estructurales en la base de datos ni en los Stored Procedures.

### 1.2 Caso de Uso Inicial: Fábrica de Casetones

Los casetones son elementos de construcción utilizados en el sector de la edificación para conformar placas aligeradas de concreto. La fábrica produce dos naturalezas fundamentales de producto, con comportamientos distintos frente al inventario:

| Naturaleza | Tipos | Característica operativa |
|------------|-------|--------------------------|
| **Recuperable / Reutilizable** | Casetón de Lona · Casetón de Guadua | El módulo fabricado regresa a la fábrica después de cada uso en obra y puede reutilizarse. Las materias primas se descuentan **una sola vez** al fabricar el módulo. |
| **Perdido / No Reutilizable** | Casetón de Icopor (EPS) | El bloque de Poliestireno Expandido queda **fundido de forma permanente** en la losa de concreto. Cada pedido implica un descuento **definitivo e irrecuperable** de bloques de EPS del inventario. |

Su fabricación requiere el manejo preciso de múltiples materias primas (madera, lona, icopor/EPS, guadua) bajo recetas de producción estandarizadas por tipo de casetón.

La fábrica opera en un entorno de producción por lotes donde cada pedido activa un ciclo completo que involucra:

- **Recepción de pedidos** del cliente con especificaciones de tipo y cantidad de casetón.
- **Validación de inventario** de materias primas contra la receta del producto.
- **Descuento automático** de insumos conforme avanza la producción.
- **Registro y trazabilidad** de cada unidad producida y despachada.
- **Gestión de proveedores** y órdenes de compra para reposición de stock.

---

## 2. Justificación del Proyecto

### 2.1 Situación Actual (AS-IS)

La fábrica gestiona actualmente sus operaciones mediante un conjunto de **hojas de cálculo en Microsoft Excel y documentos de Word**, distribuidos entre distintos usuarios sin control centralizado de versiones ni integridad referencial. Este enfoque presenta las siguientes deficiencias críticas:

| Problema Actual | Impacto Operativo |
|-----------------|-------------------|
| Hojas de cálculo compartidas sin control de acceso | Cualquier usuario puede modificar datos de inventario sin registro de auditoría |
| Cálculo manual de consumo de materias primas por receta | Errores frecuentes de transcripción generan descuadres entre el inventario físico y el registrado |
| Órdenes de compra registradas en documentos Word independientes | Pérdida de trazabilidad: no existe vinculación entre compra, proveedor, lote y producción |
| Ausencia de alertas de stock mínimo | Paros de producción por agotamiento de insumos no anticipados |
| Ajustes de inventario informales (mermas, devoluciones) | Imposibilidad de auditar la causa raíz de pérdidas de material |
| Sin control de roles ni autenticación | Riesgo de manipulación intencional o accidental de datos críticos |

### 2.2 Impacto Económico Estimado

Los descuadres de inventario detectados en auditorías internas representan una discrepancia promedio del **8-12% mensual** entre el inventario teórico calculado en Excel y el inventario físico real. Esta brecha se traduce en:

- Compras de emergencia con sobrecosto de hasta un 20% sobre el precio negociado.
- Paros de producción no planificados de 4-8 horas por evento.
- Tiempo administrativo invertido en conciliación manual: estimado en 16 horas/mes por persona.

---

## 3. Reto Operativo Identificado

El reto operativo central que CASETECH debe resolver se articula en cuatro ejes:

### Eje 1 — Descuadres en Consumo por Receta

Cada tipo de casetón tiene una **receta de producción** que especifica la cantidad exacta de cada materia prima requerida por unidad. Al procesar manualmente los pedidos en Excel, los operarios:

1. Calculan el consumo total multiplicando la receta por la cantidad pedida.
2. Actualizan manualmente el saldo de inventario en una celda distinta.
3. Omiten frecuentemente actualizar todos los insumos de la receta (especialmente materiales auxiliares como clavos o puntillas).

**Solución requerida:** El sistema debe calcular y descontar automáticamente todos los insumos de la receta mediante un Stored Procedure en PostgreSQL 16 que opere en una transacción atómica, garantizando consistencia incluso bajo acceso concurrente.

### Eje 2 — Pérdida de Trazabilidad de Compras

Las órdenes de compra no están vinculadas digitalmente a los proveedores, los ingresos de inventario ni a los pedidos de producción que las originaron. Al surgir un reclamo de calidad o un descuadre de inventario, no es posible rastrear:

- Qué proveedor suministró el lote afectado.
- En qué pedidos se utilizó ese lote.
- Si hubo merma o devolución registrada.

**Solución requerida:** Modelo de datos relacional con integridad referencial completa y tabla de auditoría (`ajustes_inventario`) que registre causa, cantidad, usuario y timestamp de cada movimiento.

### Eje 3 — Ausencia de Control de Acceso

El acceso a la información no está segmentado por rol. Operarios de producción tienen visibilidad y capacidad de edición sobre datos financieros y de proveedores que no corresponden a sus responsabilidades.

**Solución requerida:** Sistema de autenticación JWT con RBAC de dos niveles (ADMINISTRADOR / OPERARIO) implementado desde el backend.

### Eje 4 — Escalabilidad Operativa

A medida que la fábrica crece, el modelo de hojas de cálculo no escala: múltiples usuarios editando simultáneamente el mismo archivo generan conflictos de versión y corrupción de datos.

**Solución requerida:** Sistema centralizado en una base de datos PostgreSQL con acceso multiusuario concurrente y seguro desde una interfaz web moderna.

---

## 4. Objetivo General

Desarrollar e implementar **CASETECH**, un **ERP Web Modular de Producción por Recetas (BOM)** estructurado en tres capas (Frontend React, Backend FastAPI, Base de Datos PostgreSQL 16) cuya arquitectura genérica y parametrizable centralice, automatice y audite el ciclo completo de manufactura —desde la gestión de proveedores hasta el despacho del producto terminado— con el caso de uso inicial en la fábrica de casetones, y con capacidad de adaptarse a cualquier proceso de ensamble por lista de materiales (BOM) sin cambios estructurales en el núcleo del sistema.

---

## 5. Objetivos Específicos

### 5.1 Objetivos Técnicos

| ID | Objetivo Técnico |
|----|-----------------|
| OT-01 | Implementar autenticación stateless con JWT y autorización basada en roles (ADMINISTRADOR / OPERARIO) aplicada en cada endpoint de la API. |
| OT-02 | Diseñar un modelo de base de datos PostgreSQL 16 con integridad referencial completa, incluyendo llaves foráneas, restricciones CHECK y borrado lógico (campo `activo`). |
| OT-03 | Implementar Stored Procedures en PostgreSQL 16 para el descuento atómico de inventario por receta, invocados desde FastAPI mediante `CALL`, eliminando condiciones de carrera en producción concurrente. |
| OT-04 | Gestionar las migraciones de esquema con Alembic 1.13.1 bajo control de versiones, garantizando entornos reproducibles en desarrollo, staging y producción. |
| OT-05 | Contenerizar todos los servicios (base de datos, backend, frontend) con Docker Compose y una red virtual unificada `casetech-network`, asegurando portabilidad total del entorno. |
| OT-06 | Validar todos los datos de entrada y salida de la API con Pydantic v2, previniendo inyecciones y datos malformados en cada capa de la aplicación. |
| OT-07 | Implementar auditoría de cambios en inventario mediante la tabla `ajustes_inventario`, registrando usuario, tipo de movimiento, cantidad, justificación y timestamp de cada operación. |
| OT-08 | Diseñar el modelo de datos BOM (`tipos_producto`, `recetas`, `materiales`) de forma genérica y parametrizable, permitiendo incorporar nuevos tipos de producto y sus listas de materiales sin modificar la lógica de los Stored Procedures ni la estructura de los endpoints de producción. |

### 5.2 Objetivos Operativos

| ID | Objetivo Operativo |
|----|-------------------|
| OO-01 | Eliminar los descuadres de inventario causados por el cálculo manual de consumo de materias primas, logrando concordancia del 100% entre el inventario del sistema y el inventario físico en auditorías mensuales. |
| OO-02 | Centralizar el registro de proveedores con información completa (NIT único, contacto, productos suministrados) y un mecanismo de borrado lógico que preserve el historial. |
| OO-03 | Establecer un flujo de estados para los pedidos (PENDIENTE → EN_PRODUCCION → COMPLETADO → CANCELADO) que permita al administrador conocer en tiempo real el estado de cada orden. |
| OO-04 | Automatizar el cálculo de materias primas requeridas por pedido en función de la receta del casetón solicitado, mostrando déficit o superávit antes de confirmar la producción. |
| OO-05 | Reducir el tiempo administrativo de conciliación de inventario de 16 horas/mes a menos de 2 horas/mes mediante reportes automáticos y alertas de stock mínimo. |
| OO-06 | Proporcionar a los usuarios una interfaz web intuitiva que no requiera capacitación técnica especializada, con flujos de trabajo lineales y mensajes de error comprensibles. |

---

## 6. Alcance del Sistema

### 6.1 Alcance Funcional

CASETECH cubrirá el ciclo operativo completo desde la gestión de proveedores hasta el control de inventario post-producción, articulado en **cuatro módulos funcionales** numerados del 0 al 3.

### 6.2 Alcance Técnico

- **Arquitectura:** Monolito en 3 capas (no microservicios).
- **Patrón BOM parametrizable:** El núcleo de producción (`tipos_producto` / `recetas` / `materiales`) es genérico; el caso de uso de casetones se configura en datos, no en código. Cambiar o agregar líneas de producto no requiere modificar el backend ni los Stored Procedures.
- **Acceso:** Aplicación web accesible desde la red interna de la fábrica (no se contempla acceso público a Internet en la v1.0).
- **Usuarios concurrentes estimados:** 4 a 8 usuarios simultáneos.
- **Volumen de datos inicial:** Migración desde Excel; se estiman < 500 proveedores, < 10,000 pedidos históricos.
- **Disponibilidad:** Horario laboral (no se requiere 24/7 en v1.0).

---

## 7. Módulos del Sistema

### Módulo 0 — Seguridad y Gestión de Roles

**Propósito:** Controlar el acceso al sistema garantizando que cada usuario solo pueda ejecutar las operaciones correspondientes a su rol.

**Descripción:**  
Este módulo es la base transversal del ERP. Todo endpoint de la API requiere un token JWT válido en el encabezado `Authorization: Bearer <token>`. La autorización es granular por rol:

| Rol | Capacidades |
|-----|-------------|
| **ADMINISTRADOR** | Acceso total: CRUD de usuarios, proveedores, pedidos, inventario, reportes y configuración del sistema. Puede aprobar ajustes de inventario. |
| **OPERARIO** | Acceso restringido: consulta de pedidos asignados, registro de avance de producción, visualización de inventario. No puede modificar proveedores ni usuarios. |

**Entidades principales:**
- `usuarios` (id, nombre, email, password_hash, rol, activo, created_at)
- Tokens JWT con expiración configurable (default: 8 horas laborales).

**Flujos cubiertos:**
1. Login con email y contraseña → validación bcrypt → emisión de JWT.
2. Cambio de contraseña obligatorio en primer inicio de sesión.
3. Bloqueo de cuenta tras 5 intentos fallidos consecutivos.
4. Creación y desactivación de usuarios (solo ADMINISTRADOR).

---

### Módulo 1 — Gestión de Proveedores

**Propósito:** Centralizar el directorio de proveedores con información completa y trazabilidad de cada entidad suministradora de materias primas.

**Descripción:**  
Cada proveedor que suministra madera, lona, icopor, guadua u otros insumos debe estar registrado en el sistema antes de poder asociarse a una orden de compra. El módulo garantiza unicidad de NIT y preserva el historial mediante borrado lógico.

**Entidades principales:**
- `proveedores` (id, nit, nombre_empresa, nombre_contacto, telefono, email, direccion, activo, created_at, updated_at)

**Flujos cubiertos:**
1. Registro de nuevo proveedor con validación de NIT único.
2. Edición de datos de contacto (NIT no modificable una vez creado).
3. Borrado lógico: el campo `activo = false` desvincula al proveedor de nuevas órdenes pero preserva el historial de compras.
4. Listado con filtros por nombre, NIT y estado activo/inactivo.
5. Búsqueda por NIT para vinculación rápida en órdenes de compra.

**Reglas de negocio:**
- El NIT debe ser único en todo el sistema.
- No es posible eliminar físicamente un proveedor que tenga compras asociadas.
- Un proveedor inactivo no aparece en los desplegables de nuevas órdenes de compra.

---

### Módulo 2 — Pedidos y Control de Producción

**Propósito:** Gestionar el ciclo completo de un pedido de casetones desde su recepción hasta el despacho, automatizando el cálculo de materias primas y el control de estados.

**Descripción:**  
Este es el módulo central del ERP. Un pedido representa la solicitud de un cliente por una cantidad determinada de casetones de un tipo específico. El sistema valida la disponibilidad de materias primas usando la receta correspondiente, descuenta el inventario al confirmar la producción mediante un Stored Procedure y permite el seguimiento por estado.

**Entidades principales:**
- `pedidos` (id, cliente, tipo_caseton, cantidad, estado, fecha_pedido, fecha_entrega_estimada, observaciones, usuario_id)
- `tipos_caseton` (id, nombre, descripcion)
- `recetas` (id, tipo_caseton_id, material_id, cantidad_por_unidad)
- `materiales` (id, nombre, unidad_medida, stock_actual, stock_minimo)

**Estados del pedido:**

```
PENDIENTE ──► EN_PRODUCCION ──► COMPLETADO
                    │
                    └──► CANCELADO
```

| Estado | Descripción | Quién puede cambiar |
|--------|-------------|---------------------|
| `PENDIENTE` | Pedido registrado, inventario no comprometido | ADMINISTRADOR |
| `EN_PRODUCCION` | Inventario descontado (Stored Procedure ejecutado) | ADMINISTRADOR |
| `COMPLETADO` | Unidades producidas y despachadas | ADMINISTRADOR |
| `CANCELADO` | Pedido anulado; si estaba EN_PRODUCCION, se revierte el inventario | ADMINISTRADOR |

**Flujos cubiertos:**
1. Registro de pedido con selección de tipo de casetón y cantidad.
2. **Cálculo automático de receta:** el sistema calcula el total de cada insumo requerido (cantidad × receta) y muestra la disponibilidad vs. el requerimiento.
3. **Confirmación de producción:** transición a `EN_PRODUCCION` ejecuta `CALL sp_descontar_inventario(pedido_id)` en PostgreSQL.
4. El Stored Procedure valida stock suficiente, descuenta insumo a insumo dentro de una transacción y genera el registro en el historial de movimientos.
5. Si el stock es insuficiente, el SP lanza una excepción y la transacción se revierte completamente (rollback).
6. Cancelación con reversión opcional de inventario si la producción ya había iniciado.

**Tipos de casetón y sus recetas de producción:**

#### 🧵 Casetón de Lona — *Recuperable*
> Bastidor fabricado con **madera** (listones y tablas que forman el marco estructural) y **lona** tensada sobre el bastidor como superficie de contacto con el concreto. El módulo terminado regresa a la fábrica tras su uso en obra.
- 🌲 **Madera** (listones/tablas) — unidad: metros lineales o unidades según dimensión
- 🧵 **Lona** — unidad: metros cuadrados
- Insumos auxiliares: grapas, puntillas (según receta)

**Lógica de inventario:** El descuento ocurre al fabricar el módulo. Como el módulo es reutilizable, **no** se descuenta inventario adicional en cada uso en obra.

#### 🪵 Casetón de Guadua — *Recuperable*
> Cercha estructural fabricada con **guadua** (culmos y esterilla) reforzada con **madera** y unida mediante **amarres** (alambre, puntillas). El módulo terminado regresa a la fábrica tras su uso en obra.
- 🪵 **Guadua** (culmos / esterilla) — unidad: metros lineales / culmos
- 🌲 **Madera** (listones de refuerzo) — unidad: metros lineales
- Insumos auxiliares: alambre de amarre, puntillas

**Lógica de inventario:** Igual que el Casetón de Lona, el descuento es único al momento de fabricar el módulo reutilizable.

#### 🟡 Casetón de Icopor / EPS — *Perdido (No Reutilizable)*
> Bloque de **Poliestireno Expandido (EPS)** cortado a la dimensión requerida que se incorpora de forma **permanente e irrecuperable** a la losa de concreto durante el proceso constructivo. No existe retorno a inventario.
- 🟡 **Icopor / EPS** (bloques o planchas) — unidad: unidades / metros cúbicos

**Lógica de inventario:** Cada pedido genera un descuento **definitivo** del inventario de EPS. Este material **nunca retorna** al inventario: no aplica reversión por cancelación post-producción, y no genera movimiento de devolución al proveedor.

---

### Módulo 3 — Inventario y Auditoría de Ajustes

**Propósito:** Mantener el inventario actualizado en tiempo real y registrar con trazabilidad completa cualquier movimiento manual que afecte los saldos.

**Descripción:**  
El inventario se actualiza automáticamente en dos momentos: al confirmar la producción (descuento vía Stored Procedure) y al registrar una compra (ingreso). La lógica de descuento difiere según la naturaleza del casetón:

- **Casetones recuperables (Lona, Guadua):** El descuento de materias primas ocurre **una sola vez** al fabricar el módulo. Si un pedido se cancela *antes* de iniciar producción, no hay inventario comprometido. Si se cancela *durante* la producción, se ofrecerá la opción de revertir el descuento (las materias primas como madera, lona y guadua pueden reincorporarse al stock si el material físico no fue consumido).
- **Casetón de Icopor/EPS (perdido):** El descuento es **definitivo e irrecuperable**. Una vez que el SP ejecuta el descuento de bloques EPS, ese movimiento se registra como `DESCUENTO_PRODUCCION_DEFINITIVO` y **no puede revertirse**, ya que el material queda fundido en la estructura de concreto. La cancelación de un pedido de Icopor en producción **no genera reversión de inventario**.

La realidad operativa también requiere ajustes manuales: mermas por deterioro, devoluciones a proveedores, conteos físicos que difieren del sistema. Todos estos ajustes deben quedar auditados.

**Entidades principales:**
- `materiales` (id, nombre, unidad_medida, stock_actual, stock_minimo, activo)
- `ajustes_inventario` (id, material_id, tipo_ajuste, cantidad_antes, cantidad_ajuste, cantidad_despues, justificacion, usuario_id, created_at)
- `movimientos_inventario` (id, material_id, tipo_movimiento, cantidad, referencia_id, referencia_tipo, created_at)

**Tipos de ajuste en `ajustes_inventario`:**

| Tipo de Ajuste | Descripción | Requiere aprobación |
|----------------|-------------|---------------------|
| `MERMA` | Pérdida por deterioro, mal manejo o daño | Sí (solo ADMINISTRADOR puede aprobar) |
| `DEVOLUCION` | Regreso de material al proveedor | Sí |
| `CONTEO_FISICO` | Corrección tras inventario físico | Sí |
| `INGRESO_COMPRA` | Entrada de material por orden de compra | No (automático) |
| `DESCUENTO_PRODUCCION` | Salida por pedido confirmado | No (automático vía SP) |

**Flujos cubiertos:**
1. Visualización del inventario actual con indicador visual de alertas de stock mínimo.
2. Registro de ajuste manual con tipo, cantidad, justificación y usuario.
3. Los ajustes de tipo `MERMA`, `DEVOLUCION` y `CONTEO_FISICO` quedan en estado `PENDIENTE_APROBACION` hasta que el ADMINISTRADOR los aprueba o rechaza.
4. Al aprobar un ajuste, el sistema actualiza `stock_actual` del material.
5. Reporte de auditoría: listado cronológico de todos los ajustes con filtros por material, tipo, usuario y rango de fechas.
6. Alerta de stock mínimo: los materiales con `stock_actual <= stock_minimo` aparecen destacados en el dashboard y en la sección de inventario.

---

## 8. Fuera del Alcance (v1.0)

Los siguientes elementos han sido **explícitamente excluidos** de la versión 1.0 de CASETECH para mantener el foco y los plazos del proyecto:

| Elemento | Justificación de exclusión |
|----------|---------------------------|
| Módulo de facturación y cartera | Requiere integración con normativa tributaria (DIAN); se contempla para v2.0 |
| Aplicación móvil nativa | No hay requerimiento actual; web responsive satisface la necesidad |
| Integración con sistemas contables externos (SIIGO, World Office) | Fuera del presupuesto de la v1.0 |
| Gestión de activos fijos (maquinaria) | No identificado como prioridad por el cliente |
| Portal de clientes (autogestión de pedidos) | Se prioriza la gestión interna; portal externo en v2.0 |
| Acceso desde Internet / VPN | La v1.0 opera exclusivamente en red local de la fábrica |
| Módulo de nómina y RRHH | Fuera del alcance del ERP de producción |
| Inteligencia artificial / ML | No requerido en v1.0 |

---

## 9. Supuestos y Restricciones

### 9.1 Supuestos

- La fábrica dispone de infraestructura de red local (LAN) estable para todos los puestos de trabajo.
- Existe al menos un servidor o PC de escritorio dedicado para alojar Docker Compose en ambiente de producción local.
- Los datos históricos de Excel serán migrados manualmente por el equipo de desarrollo en una jornada de carga inicial de datos.
- Los 4 desarrolladores tienen disponibilidad de tiempo parcial (no dedicación exclusiva) durante el desarrollo del proyecto.
- Las recetas de producción serán provistas por el cliente antes del Sprint 2.

### 9.2 Restricciones

- **Tecnología fija:** El stack (React + FastAPI + PostgreSQL 16) no puede modificarse durante el desarrollo; cambios de stack requieren aprobación formal del cliente.
- **Versiones fijas:** Todas las dependencias están fijadas en versiones específicas (ver `pyproject.toml` y `package.json`); no se aplicarán actualizaciones no planificadas.
- **Presupuesto:** El proyecto no contempla licencias de software comercial; todo el stack es open-source.
- **Plazo:** 4 sprints de 2 semanas cada uno (total: 8 semanas de desarrollo activo).

---

## 10. Partes Interesadas (Stakeholders)

| Stakeholder | Rol | Interés principal |
|-------------|-----|------------------|
| **Gerente de la fábrica** | Sponsor del proyecto | Visibilidad en tiempo real del inventario y los pedidos; eliminación de descuadres |
| **Jefe de producción** | Usuario primario (ADMINISTRADOR) | Confirmación de pedidos, visualización de recetas, aprobación de ajustes |
| **Operarios de producción** | Usuarios secundarios (OPERARIO) | Registro de avance de producción; consulta de pedidos asignados |
| **Responsable de compras** | Usuario primario (ADMINISTRADOR) | Gestión de proveedores y órdenes de compra; alertas de stock mínimo |
| **Equipo de desarrollo** | Implementadores | Entrega de un sistema funcional, mantenible y documentado |

---

> **Documento revisado y aprobado por:** Andrés Fernández (Tech Lead)  
> **Próxima revisión:** Inicio del Sprint 3  
> **Documentos relacionados:** [`02-requisitos-sistema.md`](./02-requisitos-sistema.md) · [`03-historias-de-usuario.md`](./03-historias-de-usuario.md)
