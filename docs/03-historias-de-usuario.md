# Historias de Usuario — CASETECH ERP

> **Versión:** 1.0.0  
> **Fecha:** Agosto 2026  
> **Equipo:** Andrés Fernández · Oscar Ruiz · Javier Sepúlveda  
> **Clasificación:** Documento Interno — Product Backlog  
> **Patrón:** ERP Web Modular de Producción por Recetas (BOM) · Caso de uso inicial: fábrica de casetones

---

> [!NOTE]
> Las historias de usuario de este documento describen el comportamiento del sistema **CASETECH** como caso de uso inicial del **ERP Web Modular BOM**. La arquitectura subyacente (tablas `tipos_caseton` / `recetas` / `materiales`, Stored Procedures de descuento atómico y endpoints REST) es **genérica y parametrizable**: nuevos tipos de producto y sus listas de materiales se incorporan como datos, sin reescribir código. Las HU que involucran recetas (HU07, HU08, HU11) son directamente aplicables a cualquier proceso de manufactura que opere bajo el patrón BOM.

## Tabla de Contenidos

1. [Matriz de Priorización MoSCoW](#1-matriz-de-priorización-moscow)
2. [Planificación por Sprints](#2-planificación-por-sprints)
3. [Historias de Usuario](#3-historias-de-usuario)
4. [Glosario de Roles](#4-glosario-de-roles)

---

## 1. Matriz de Priorización MoSCoW

| ID | Historia de Usuario | MoSCoW | Sprint |
|----|---------------------|--------|--------|
| HU01 | Iniciar sesión de forma segura | **Must Have** | Sprint 1 |
| HU02 | Gestionar cuentas de usuario | **Must Have** | Sprint 1 |
| HU03 | Registrar nuevo proveedor | **Must Have** | Sprint 1 |
| HU04 | Buscar y filtrar proveedores | **Must Have** | Sprint 3 |
| HU05 | Visualizar inventario de materiales | **Must Have** | Sprint 3 |
| HU06 | Generar reportes operativos | **Should Have** | Sprint 4 |
| HU07 | Registrar un pedido de casetones | **Must Have** | Sprint 2 |
| HU08 | Confirmar inicio de producción con descuento automático | **Must Have** | Sprint 3 |
| HU09 | Registrar ajuste de inventario con justificación | **Must Have** | Sprint 3 |
| HU10 | Gestionar el estado de un pedido | **Must Have** | Sprint 2 |
| HU11 | Ver consumo de materiales requerido por receta | **Must Have** | Sprint 2 |
| HU12 | Consultar historial de movimientos de inventario | **Should Have** | Sprint 4 |
| HU13 | Recibir alertas de stock mínimo | **Must Have** | Sprint 3 |
| HU14 | Visualizar dashboard con KPIs operativos | **Must Have** | Sprint 1 |
| HU15 | Consultar log de auditoría de acciones | **Should Have** | Sprint 4 |
| HU16 | Registrar compra a proveedor e ingresar stock | **Must Have** | Sprint 5 |
| HU17 | Consultar compras y su detalle | **Should Have** | Sprint 5 |
| HU18 | Gestionar materias primas (crear, editar, desactivar) | **Must Have** | Sprint 5 |
| HU19 | Administrar recetas BOM de cada tipo de casetón | **Must Have** | Sprint 5 |
| HU20 | Mantener y cerrar la sesión de forma segura | **Should Have** | Sprint 5 |
| HU21 | Bloquear la cuenta tras intentos fallidos de acceso | **Should Have** | Sprint 5 |

---

## 2. Planificación por Sprints

### Sprint 1 — Cimientos: Seguridad y Proveedores
**Duración:** 2 semanas | **Objetivo:** Sistema desplegable con autenticación funcional, gestión de usuarios, registro de proveedores y dashboard base.

| HU | Historia | Puntos estimados |
|----|----------|-----------------|
| HU01 | Iniciar sesión de forma segura | 8 |
| HU02 | Gestionar cuentas de usuario | 5 |
| HU03 | Registrar nuevo proveedor | 5 |
| HU14 | Visualizar dashboard con KPIs operativos | 8 |
| **Total** | | **26 puntos** |

**Criterio de éxito del Sprint 1:** Un usuario ADMINISTRADOR puede autenticarse, crear cuentas de operario, registrar proveedores y ver el dashboard con datos reales desde PostgreSQL.

---

### Sprint 2 — Núcleo: Pedidos y Recetas
**Duración:** 2 semanas | **Objetivo:** Flujo completo de pedidos con cálculo de receta y transición de estados.

| HU | Historia | Puntos estimados |
|----|----------|-----------------|
| HU07 | Registrar un pedido de casetones | 8 |
| HU10 | Gestionar el estado de un pedido | 8 |
| HU11 | Ver consumo de materiales requerido por receta | 5 |
| **Total** | | **21 puntos** |

**Criterio de éxito del Sprint 2:** Un ADMINISTRADOR puede registrar un pedido, consultar cuántos materiales requiere y cambiar el estado del pedido (sin descuento de inventario aún).

---

### Sprint 3 — Inventario: Automatización y Ajustes
**Duración:** 2 semanas | **Objetivo:** Stored Procedure de descuento atómico, gestión completa de inventario, ajustes auditados y alertas de stock.

| HU | Historia | Puntos estimados |
|----|----------|-----------------|
| HU04 | Buscar y filtrar proveedores | 3 |
| HU05 | Visualizar inventario de materiales | 5 |
| HU08 | Confirmar inicio de producción con descuento automático | 13 |
| HU09 | Registrar ajuste de inventario con justificación | 8 |
| HU13 | Recibir alertas de stock mínimo | 5 |
| **Total** | | **34 puntos** |

**Criterio de éxito del Sprint 3:** Al confirmar producción, el inventario se descuenta atómicamente. Los ajustes manuales quedan auditados. Las alertas de stock funcionan en tiempo real.

---

### Sprint 4 — Reportes: Trazabilidad y Auditoría
**Duración:** 2 semanas | **Objetivo:** Reportes operativos, historial de movimientos y log de auditoría completo. Estabilización y pruebas finales.

| HU | Historia | Puntos estimados |
|----|----------|-----------------|
| HU06 | Generar reportes operativos | 8 |
| HU12 | Consultar historial de movimientos de inventario | 5 |
| HU15 | Consultar log de auditoría de acciones | 5 |
| **Total** | | **18 puntos** |

**Criterio de éxito del Sprint 4:** El ADMINISTRADOR puede generar y exportar todos los reportes. El sistema completo pasa las pruebas de aceptación con el cliente.

---

### Sprint 5 — Consolidación: Abastecimiento, Catálogos y Seguridad de Sesión
**Objetivo:** Completar el ciclo de abastecimiento (compras que alimentan el inventario), los catálogos que el motor BOM necesita (materias primas y recetas) y endurecer la seguridad de la sesión. Estas funcionalidades se construyeron durante el desarrollo (incrementos v1.3.0 a v1.6.0) y se incorporaron al backlog de forma retroactiva para que cada módulo del sistema tenga su historia de usuario.

| HU | Historia | Puntos estimados* |
|----|----------|-----------------|
| HU16 | Registrar compra a proveedor e ingresar stock | 8 |
| HU17 | Consultar compras y su detalle | 3 |
| HU18 | Gestionar materias primas (crear, editar, desactivar) | 5 |
| HU19 | Administrar recetas BOM de cada tipo de casetón | 5 |
| HU20 | Mantener y cerrar la sesión de forma segura | 5 |
| HU21 | Bloquear la cuenta tras intentos fallidos de acceso | 3 |
| **Total** | | **29 puntos** |

\* Estimación inicial por analogía con las historias ya puntuadas (ver [`scrum/planning-poker.md`](./scrum/planning-poker.md)); se confirma con el equipo en la sesión de planning poker.

**Criterio de éxito del Sprint 5:** Una compra registrada aumenta el stock y queda en el Kardex; el ADMINISTRADOR puede mantener el catálogo de materias primas y las recetas; la sesión se renueva sola y una cuenta con 5 intentos fallidos queda bloqueada.

**Total del producto (HU01 a HU21):** 99 + 29 = **128 puntos**.

---

## 3. Historias de Usuario

---

### HU01 — Iniciar Sesión de Forma Segura

> **Como** usuario del sistema (ADMINISTRADOR u OPERARIO),  
> **Quiero** autenticarme con mi correo electrónico y contraseña,  
> **Para** acceder de forma segura a las funcionalidades correspondientes a mi rol.

**Sprint:** 1 | **MoSCoW:** Must Have | **Puntos:** 8  
**RF relacionados:** RF01 | **Responsable:** Andrés Fernández

---

#### Criterios de Aceptación

**Escenario 1 — Login exitoso como ADMINISTRADOR**

```gherkin
Dado que soy un usuario ADMINISTRADOR registrado y activo en el sistema
  Y accedo al formulario de login en la pantalla de inicio
Cuando ingreso mi correo "admin@casetech.com" y mi contraseña correcta
  Y hago clic en "Ingresar"
Entonces el sistema valida mis credenciales contra la base de datos
  Y el backend emite un token JWT firmado con HS256, vigente por 8 horas
  Y soy redirigido al dashboard principal
  Y en el menú de navegación aparecen todas las opciones del rol ADMINISTRADOR
```

**Escenario 2 — Login exitoso como OPERARIO**

```gherkin
Dado que soy un usuario OPERARIO registrado y activo
Cuando ingreso mis credenciales correctas
Entonces soy redirigido al dashboard principal
  Y en el menú de navegación solo aparecen las opciones disponibles para OPERARIO
  (Pedidos asignados, inventario en consulta, sin gestión de proveedores ni usuarios)
```

**Escenario 3 — Credenciales incorrectas**

```gherkin
Dado que accedo al formulario de login
Cuando ingreso un correo válido pero una contraseña incorrecta
Entonces el sistema muestra el mensaje: "Credenciales inválidas. Verifica tu correo y contraseña."
  Y no proporciona información específica sobre qué campo es incorrecto (seguridad)
  Y incrementa el contador de intentos fallidos para ese usuario en 1
```

**Escenario 4 — Bloqueo por intentos fallidos (Flujo de excepción)**

```gherkin
Dado que un usuario ha realizado 4 intentos de login fallidos consecutivos
Cuando realiza el quinto intento fallido con contraseña incorrecta
Entonces el sistema establece activo = false para esa cuenta
  Y muestra el mensaje: "Tu cuenta ha sido bloqueada por seguridad. Contacta al administrador."
  Y el usuario ya no puede iniciar sesión hasta que el ADMINISTRADOR reactive la cuenta
```

**Escenario 5 — Usuario inactivo**

```gherkin
Dado que un usuario ha sido desactivado por el ADMINISTRADOR (activo = false)
Cuando intenta iniciar sesión con credenciales correctas
Entonces el sistema retorna HTTP 401
  Y muestra el mensaje: "Tu cuenta está inactiva. Contacta al administrador del sistema."
```

**Escenario 6 — Token expirado**

```gherkin
Dado que un usuario está autenticado y su token JWT ha expirado (pasadas 8 horas)
Cuando intenta realizar cualquier acción en el sistema que requiera autenticación
Entonces el backend retorna HTTP 401 con el mensaje "Token expirado"
  Y el frontend redirige automáticamente al formulario de login
  Y la sesión del usuario es limpiada del estado de la aplicación
```

---

### HU02 — Gestionar Cuentas de Usuario

> **Como** ADMINISTRADOR,  
> **Quiero** crear, editar y desactivar cuentas de usuario del sistema,  
> **Para** controlar quién tiene acceso y con qué permisos.

**Sprint:** 1 | **MoSCoW:** Must Have | **Puntos:** 5  
**RF relacionados:** RF02 | **Responsable:** Oscar Ruiz

---

#### Criterios de Aceptación

**Escenario 1 — Crear nuevo usuario exitosamente**

```gherkin
Dado que soy un ADMINISTRADOR autenticado en la sección "Usuarios"
Cuando completo el formulario con nombre, email único, contraseña válida y rol (ADMINISTRADOR u OPERARIO)
  Y hago clic en "Crear usuario"
Entonces el sistema crea el registro con la contraseña hasheada con bcrypt (cost=12)
  Y muestra el mensaje: "Usuario creado exitosamente"
  Y el nuevo usuario aparece en el listado con estado "Activo"
  Y el usuario puede iniciar sesión con sus credenciales inmediatamente
```

**Escenario 2 — Email duplicado (Flujo de excepción)**

```gherkin
Dado que ya existe un usuario con el email "operario@casetech.com"
Cuando intento crear un nuevo usuario con ese mismo email
Entonces el sistema retorna HTTP 422
  Y muestra el mensaje: "El correo electrónico ya está registrado en el sistema."
  Y no se crea ningún registro en la base de datos
```

**Escenario 3 — Contraseña que no cumple política**

```gherkin
Dado que estoy creando un nuevo usuario
Cuando ingreso la contraseña "abc123" (sin mayúscula, menos de 8 caracteres)
Entonces el sistema muestra el error de validación antes de enviar el formulario:
  "La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número."
```

**Escenario 4 — Desactivar usuario**

```gherkin
Dado que soy ADMINISTRADOR y selecciono un usuario OPERARIO activo
Cuando hago clic en "Desactivar cuenta" y confirmo la acción en el diálogo
Entonces el sistema establece activo = false en la base de datos
  Y el usuario desactivado ya no puede iniciar sesión
  Y el historial de acciones de ese usuario permanece intacto en el sistema
```

**Escenario 5 — Impedir auto-desactivación del último ADMINISTRADOR (Flujo de excepción)**

```gherkin
Dado que soy el único ADMINISTRADOR activo en el sistema
Cuando intento desactivar mi propia cuenta
Entonces el sistema retorna HTTP 422
  Y muestra el mensaje: "No puedes desactivar tu cuenta. Debes existir al menos un ADMINISTRADOR activo."
```

---

### HU03 — Registrar Nuevo Proveedor

> **Como** ADMINISTRADOR,  
> **Quiero** registrar un nuevo proveedor con su NIT y datos de contacto,  
> **Para** mantener un directorio centralizado de los suministradores de materias primas.

**Sprint:** 1 | **MoSCoW:** Must Have | **Puntos:** 5  
**RF relacionados:** RF03 | **Responsable:** Oscar Ruiz

---

#### Criterios de Aceptación

**Escenario 1 — Registro exitoso de proveedor**

```gherkin
Dado que soy ADMINISTRADOR en la sección "Proveedores"
Cuando completo el formulario con NIT "900123456-1", nombre empresa "Maderas del Llano SAS",
  nombre contacto "Pedro Gómez", teléfono "3001234567"
  Y hago clic en "Registrar proveedor"
Entonces el sistema crea el registro con activo = true y created_at = timestamp actual
  Y muestra el mensaje: "Proveedor registrado exitosamente"
  Y el proveedor aparece en el listado de proveedores activos
```

**Escenario 2 — NIT duplicado (Flujo de excepción crítico)**

```gherkin
Dado que ya existe un proveedor con NIT "900123456-1" en el sistema
Cuando intento registrar un nuevo proveedor con ese mismo NIT
Entonces el sistema retorna HTTP 422 (Unprocessable Entity)
  Y muestra el mensaje: "Ya existe un proveedor registrado con el NIT '900123456-1'."
  Y no se crea ningún registro nuevo en la base de datos
  Y el sistema resalta el campo NIT en el formulario con color de error
```

**Escenario 3 — Datos de contacto inválidos**

```gherkin
Dado que estoy en el formulario de registro de proveedor
Cuando ingreso un teléfono con letras "abc-xyz" o con menos de 7 dígitos
Entonces el sistema muestra el error: "El teléfono debe contener entre 7 y 15 dígitos numéricos."
  Y no envía el formulario hasta que el campo sea válido
```

**Escenario 4 — Borrado lógico de proveedor**

```gherkin
Dado que soy ADMINISTRADOR y selecciono un proveedor activo
Cuando hago clic en "Desactivar proveedor" y confirmo en el diálogo de advertencia
Entonces el sistema establece activo = false en la base de datos
  Y el proveedor desaparece de los desplegables de nuevas órdenes de compra
  Y el proveedor sigue visible en el historial de compras anteriores
  Y aparece en el listado general con estado "Inactivo" y opción de reactivar
```

---

### HU04 — Buscar y Filtrar Proveedores

> **Como** ADMINISTRADOR,  
> **Quiero** buscar proveedores por nombre o NIT y filtrarlos por estado activo/inactivo,  
> **Para** localizar rápidamente el proveedor que necesito sin revisar toda la lista.

**Sprint:** 3 | **MoSCoW:** Must Have | **Puntos:** 3  
**RF relacionados:** RF04 | **Responsable:** Oscar Ruiz

---

#### Criterios de Aceptación

**Escenario 1 — Búsqueda por NIT exacto**

```gherkin
Dado que estoy en la sección "Proveedores" con más de 20 proveedores registrados
Cuando escribo "900123456" en el campo de búsqueda
Entonces la lista se filtra en tiempo real (debounce 300ms) mostrando solo
  los proveedores cuyo NIT contiene "900123456"
  Y el número de resultados se actualiza en el contador de la tabla
```

**Escenario 2 — Filtro por estado inactivo**

```gherkin
Dado que existen proveedores activos e inactivos en el sistema
Cuando selecciono el filtro "Inactivos" en el selector de estado
Entonces la lista muestra exclusivamente los proveedores con activo = false
  Y cada fila muestra claramente el estado "Inactivo" con estilo visual diferenciado
```

**Escenario 3 — Sin resultados**

```gherkin
Dado que busco por un NIT que no existe: "999999999"
Cuando no hay coincidencias en la base de datos
Entonces la tabla muestra el estado vacío: "No se encontraron proveedores con los filtros aplicados."
  Y aparece un botón "Limpiar filtros" para restablecer la búsqueda
```

---

### HU05 — Visualizar Inventario de Materiales

> **Como** ADMINISTRADOR u OPERARIO,  
> **Quiero** ver el inventario actual de todas las materias primas con sus niveles de stock,  
> **Para** conocer en tiempo real la disponibilidad de insumos para la producción.

**Sprint:** 3 | **MoSCoW:** Must Have | **Puntos:** 5  
**RF relacionados:** RF09, RF11 | **Responsable:** Javier Sepúlveda

---

#### Criterios de Aceptación

**Escenario 1 — Vista del inventario con niveles de stock**

```gherkin
Dado que soy un usuario autenticado (cualquier rol) en la sección "Inventario"
Cuando cargo la página de inventario
Entonces veo una tabla con todos los materiales activos que incluye:
  Nombre del material, unidad de medida, stock actual, stock mínimo e indicador visual de estado
  Los materiales con stock_actual <= stock_minimo están resaltados en amarillo (🟡) o rojo (🔴)
  Los materiales con stock normal aparecen con indicador verde (🟢)
```

**Escenario 2 — Material en stock crítico**

```gherkin
Dado que el material "Lona" tiene stock_actual = 5 y stock_minimo = 20
Cuando cargo el inventario
Entonces la fila de "Lona" aparece con fondo rojo y el ícono 🔴
  Y aparece en primer lugar en la tabla (ordenado por nivel de alerta descendente)
  Y en el dashboard, el widget "Materiales en alerta" muestra "Lona" como prioritario
```

**Escenario 3 — Registrar ingreso por compra**

```gherkin
Dado que soy ADMINISTRADOR y selecciono el material "Madera" con stock actual 50
Cuando hago clic en "Registrar ingreso", ingreso cantidad 200 y confirmo
Entonces el sistema actualiza stock_actual a 250
  Y registra un movimiento de tipo INGRESO_COMPRA en movimientos_inventario
  Y muestra el mensaje: "Ingreso registrado. Stock actualizado: 250 m lineales."
```

---

### HU06 — Generar Reportes Operativos

> **Como** ADMINISTRADOR,  
> **Quiero** generar reportes filtrados por fecha y tipo de operación,  
> **Para** analizar el desempeño productivo, el consumo de materiales y auditar los movimientos de inventario.

**Sprint:** 4 | **MoSCoW:** Should Have | **Puntos:** 8  
**RF relacionados:** RF12 | **Responsable:** Javier Sepúlveda

---

#### Criterios de Aceptación

**Escenario 1 — Reporte de historial de pedidos**

```gherkin
Dado que soy ADMINISTRADOR en la sección "Reportes"
Cuando selecciono "Historial de Pedidos", rango de fecha del 01/08/2026 al 31/08/2026
  Y hago clic en "Generar reporte"
Entonces el sistema muestra una tabla con todos los pedidos del período:
  ID, cliente, tipo de casetón, cantidad, estado y fechas de registro y entrega
  Y el contador de registros muestra el total de pedidos encontrados
```

**Escenario 2 — Exportar reporte a CSV**

```gherkin
Dado que estoy viendo un reporte generado con resultados
Cuando hago clic en "Exportar CSV"
Entonces el navegador descarga un archivo .csv con nombre "reporte_pedidos_2026-08.csv"
  Y el archivo contiene todas las filas del reporte con cabeceras en la primera fila
  Y los valores con comas están correctamente entrecomillados para compatibilidad con Excel
```

**Escenario 3 — Reporte sin datos en el período**

```gherkin
Dado que selecciono un rango de fechas donde no hay actividad registrada
Cuando genero el reporte
Entonces el sistema muestra el estado vacío: "No hay registros para el período seleccionado."
  Y el botón "Exportar CSV" aparece deshabilitado
```

---

### HU07 — Registrar un Pedido de Casetones

> **Como** ADMINISTRADOR,  
> **Quiero** registrar un nuevo pedido especificando cliente, tipo de casetón y cantidad,  
> **Para** iniciar el proceso productivo con la información completa del requerimiento del cliente.

**Sprint:** 2 | **MoSCoW:** Must Have | **Puntos:** 8  
**RF relacionados:** RF05 | **Responsable:** Andrés Fernández

---

#### Criterios de Aceptación

**Escenario 1 — Registro exitoso de pedido de Casetón de Lona**

```gherkin
Dado que soy ADMINISTRADOR en la sección "Pedidos" > "Nuevo Pedido"
Cuando completo el formulario con cliente "Constructora Urbes SAS",
  tipo de casetón "Casetón de Lona 60x60", cantidad 150, fecha entrega "2026-09-15"
  Y hago clic en "Registrar Pedido"
Entonces el sistema crea el pedido con estado PENDIENTE
  Y muestra el mensaje: "Pedido #42 registrado exitosamente."
  Y el inventario NO ha sido modificado en este punto
```

**Escenario 2 — Registro exitoso de pedido de Casetón de Icopor/EPS**

```gherkin
Dado que soy ADMINISTRADOR registrando un pedido
Cuando selecciono el tipo "Casetón de Icopor 60x60", cantidad 80, fecha entrega "2026-09-20"
  Y hago clic en "Registrar Pedido"
Entonces el sistema crea el pedido con estado PENDIENTE
  Y muestra el mensaje: "Pedido #43 registrado exitosamente."
  Y el inventario NO ha sido modificado en este punto
```

**Escenario 3 — Cantidad inválida**

```gherkin
Dado que estoy en el formulario de nuevo pedido
Cuando ingreso una cantidad de 0 o un valor negativo
Entonces el sistema muestra el error de validación: "La cantidad debe ser un número entero positivo mayor a cero."
  Y no envía el formulario
```

**Escenario 4 — Fecha de entrega en el pasado**

```gherkin
Dado que hoy es 23/08/2026
Cuando ingreso una fecha de entrega "20/08/2026" (pasada)
Entonces el sistema muestra el error: "La fecha de entrega debe ser posterior a la fecha actual."
```

---

### HU08 — Confirmar Inicio de Producción con Descuento Automático

> **Como** ADMINISTRADOR,  
> **Quiero** confirmar el inicio de producción de un pedido,  
> **Para** que el sistema descuente automáticamente las materias primas requeridas por la receta y el inventario quede actualizado al instante.

**Sprint:** 3 | **MoSCoW:** Must Have | **Puntos:** 13  
**RF relacionados:** RF06, RF08 | **Responsable:** Andrés Fernández

---

#### Criterios de Aceptación

**Escenario 1 — Confirmación de producción de Casetón de Lona/Guadua (stock suficiente)**

```gherkin
Dado que existe el pedido #42 en estado PENDIENTE para "Casetón de Lona"
  Y el inventario tiene suficiente stock de Madera y Lona para la receta
Cuando selecciono el pedido y hago clic en "Iniciar Producción"
  Y confirmo en el diálogo con la tabla de materiales a descontar
Entonces el backend invoca CALL sp_descontar_inventario(42, usuario_id)
  Y el SP descuenta Madera y Lona dentro de una transacción atómica
  Y registra los movimientos con tipo DESCUENTO_PRODUCCION (reversible si se cancela el pedido en producción)
  Y el pedido cambia a estado EN_PRODUCCION
  Y el inventario refleja los nuevos saldos en tiempo real
  Y se muestra el mensaje: "Producción iniciada. Inventario actualizado. Los materiales podrán revertirse si se cancela el pedido."
```

**Escenario 2 — Confirmación de producción de Casetón de Icopor/EPS (stock suficiente)**

```gherkin
Dado que existe el pedido #50 en estado PENDIENTE para "Casetón de Icopor"
  Y el inventario tiene 200 bloques EPS disponibles y la receta requiere 80 bloques
Cuando selecciono el pedido y hago clic en "Iniciar Producción"
  Y confirmo en el diálogo con la tabla de materiales a descontar
Entonces el backend invoca CALL sp_descontar_inventario(50, usuario_id)
  Y el SP descuenta 80 bloques EPS dentro de una transacción atómica
  Y registra el movimiento con tipo DESCUENTO_PRODUCCION (reversible si se cancela el pedido en producción)
  Y el pedido cambia a estado EN_PRODUCCION
  Y se muestra el mensaje: "Producción iniciada. Inventario actualizado. Los materiales podrán revertirse si se cancela el pedido."
```

**Escenario 3 — Stock insuficiente en un material (Flujo de excepción crítico)**

```gherkin
Dado que existe el pedido #43 en estado PENDIENTE para 100 unidades de "Casetón de Lona"
  Y el material "Lona" tiene stock_actual = 30 pero la receta requiere 80 m² (100 × 0.8)
Cuando selecciono el pedido y hago clic en "Iniciar Producción"
Entonces el SP detecta el déficit de "Lona" y lanza una excepción
  Y la transacción hace rollback completo — ningún material es descontado
  Y el backend retorna HTTP 422 con el mensaje:
    "Stock insuficiente para material 'Lona'. Disponible: 30 m², Requerido: 80 m²."
  Y el pedido permanece en estado PENDIENTE sin cambios
  Y el usuario ve el error con el material específico resaltado en la interfaz
```

**Escenario 4 — Acceso concurrente (prevención de condición de carrera)**

```gherkin
Dado que dos administradores intentan confirmar simultáneamente dos pedidos de Casetón de Guadua
  que comparten el material "Guadua" con stock = 100 culmos
  Y el pedido A requiere 80 culmos y el pedido B requiere 60 culmos (total: 140 > 100 disponibles)
Cuando ambos confirman producción en el mismo instante
Entonces el SP usa SELECT ... FOR UPDATE para bloquear el registro de Guadua
  Y el primer pedido que adquiere el bloqueo se procesa exitosamente
  Y el segundo pedido recibe la excepción de stock insuficiente y hace rollback
  Y en ningún caso el stock queda en valor negativo
```

---

### HU09 — Registrar Ajuste de Inventario con Justificación

> **Como** ADMINISTRADOR,  
> **Quiero** registrar ajustes manuales al inventario (mermas, devoluciones, conteos físicos) con una justificación obligatoria,  
> **Para** mantener trazabilidad completa de cualquier discrepancia entre el inventario del sistema y el físico real.

**Sprint:** 3 | **MoSCoW:** Must Have | **Puntos:** 8  
**RF relacionados:** RF10 | **Responsable:** Javier Sepúlveda

---

#### Criterios de Aceptación

**Escenario 1 — Registro de merma con justificación válida**

```gherkin
Dado que soy ADMINISTRADOR en la sección "Inventario" > "Registrar Ajuste"
Cuando selecciono material "Icopor", tipo de ajuste "MERMA", cantidad 15,
  y escribo la justificación: "Planchas de icopor dañadas por humedad en bodega sector B, confirmado en inspección 23/08/2026"
  Y hago clic en "Registrar Ajuste"
Entonces el sistema crea el ajuste con estado PENDIENTE_APROBACION
  Y registra cantidad_antes = stock actual del momento del registro (snapshot)
  Y muestra el mensaje: "Ajuste registrado. Pendiente de aprobación por el administrador."
  Y el stock actual NO se modifica hasta que el ajuste sea aprobado
```

**Escenario 2 — Justificación insuficiente (Flujo de excepción)**

```gherkin
Dado que estoy registrando un ajuste de tipo MERMA
Cuando escribo una justificación de menos de 20 caracteres: "Daño en bodega"
Entonces el sistema muestra el error: "La justificación debe tener mínimo 20 caracteres. Actual: 14 caracteres."
  Y el formulario no puede enviarse
```

**Escenario 3 — Merma sin justificación (campo vacío)**

```gherkin
Dado que estoy registrando un ajuste de tipo MERMA
Cuando dejo el campo de justificación vacío
  Y intento enviar el formulario
Entonces el sistema muestra el error: "La justificación es obligatoria para registrar un ajuste de inventario."
```

**Escenario 4 — Aprobación de ajuste por ADMINISTRADOR**

```gherkin
Dado que existe un ajuste pendiente de aprobación para "Icopor" con merma de 15 planchas
Cuando el ADMINISTRADOR accede al panel de ajustes pendientes y hace clic en "Aprobar"
Entonces el sistema actualiza stock_actual = cantidad_antes - 15
  Y registra cantidad_despues en el ajuste
  Y cambia el estado del ajuste a APROBADO
  Y registra un movimiento en movimientos_inventario con tipo AJUSTE_APROBADO
  Y muestra el mensaje: "Ajuste aprobado. Stock de Icopor actualizado de X a Y planchas."
```

**Escenario 5 — Rechazo de ajuste con comentario**

```gherkin
Dado que el ADMINISTRADOR revisa un ajuste pendiente
Cuando hace clic en "Rechazar" e ingresa el comentario: "No se encontró evidencia del daño reportado"
Entonces el ajuste cambia a estado RECHAZADO con el comentario registrado
  Y el stock NO se modifica
  Y el usuario que registró el ajuste puede ver el motivo de rechazo en el historial
```

---

### HU10 — Gestionar el Estado de un Pedido

> **Como** ADMINISTRADOR,  
> **Quiero** poder cambiar el estado de un pedido (de PENDIENTE a EN_PRODUCCION, COMPLETADO o CANCELADO),  
> **Para** reflejar el avance real del proceso productivo en el sistema.

**Sprint:** 2 | **MoSCoW:** Must Have | **Puntos:** 8  
**RF relacionados:** RF06 | **Responsable:** Andrés Fernández

---

#### Criterios de Aceptación

**Escenario 1 — Completar un pedido en producción**

```gherkin
Dado que el pedido #42 está en estado EN_PRODUCCION
Cuando selecciono "Marcar como Completado" y confirmo la acción
Entonces el pedido cambia a estado COMPLETADO
  Y se registra la fecha y hora de despacho (updated_at)
  Y el pedido aparece en los reportes como entregado
  Y los botones de acción quedan deshabilitados (estado final)
```

**Escenario 2 — Cancelar un pedido en producción (reversión automática de inventario)**

```gherkin
Dado que el pedido #44 es de "Casetón de Lona" y está en estado EN_PRODUCCION
  Y ya se le habían descontado Madera y Lona al iniciar producción
Cuando el ADMINISTRADOR selecciona "Cancelar Pedido" y confirma la acción
Entonces el sistema ejecuta automáticamente el SP de reversión (sp_revertir_receta),
  sumando los materiales de vuelta a inventario porque la producción no se completó
  Y registra movimientos de tipo DEVOLUCION_CANCELACION en movimientos_inventario
  Y el pedido cambia a CANCELADO
```

Esta misma lógica aplica sin distinción a los 3 tipos de casetón (Lona, Guadua, Icopor/EPS) — ninguno tiene un comportamiento especial de "no reversión".

**Escenario 3 — Transición inválida (Flujo de excepción)**

```gherkin
Dado que el pedido #45 está en estado COMPLETADO
Cuando intento cambiarlo de vuelta a EN_PRODUCCION desde la interfaz
Entonces la opción de cambio de estado no está disponible (botón deshabilitado o ausente)
  Y si se intenta vía API directamente, el backend retorna HTTP 422:
    "Transición de estado inválida. El pedido en estado COMPLETADO no puede cambiar de estado."
```

---

### HU11 — Ver Consumo de Materiales Requerido por Receta

> **Como** ADMINISTRADOR,  
> **Quiero** ver cuántos materiales requiere un pedido antes de confirmar la producción,  
> **Para** verificar si hay suficiente stock y tomar decisiones informadas sobre el inicio de la producción.

**Sprint:** 2 | **MoSCoW:** Must Have | **Puntos:** 5  
**RF relacionados:** RF07 | **Responsable:** Oscar Ruiz

---

#### Criterios de Aceptación

**Escenario 1 — Receta de Casetón de Lona con stock suficiente**

```gherkin
Dado que estoy registrando un pedido de 100 módulos de "Casetón de Lona 60x60"
  Y el stock de Madera y Lona es suficiente
Cuando ingreso la cantidad 100 en el formulario de pedido
Entonces el sistema muestra la tabla de requerimientos:
  | Material        | Por unidad | Total req. | Stock actual | Estado  |
  | Madera (m lin.) | 2.5        | 250 m      | 400 m        | 🟢 OK   |
  | Lona (m²)       | 0.8        | 80 m²      | 120 m²       | 🟢 OK   |
  Y el botón "Registrar Pedido" está habilitado
```

**Escenario 2 — Receta de Casetón de Guadua con stock suficiente**

```gherkin
Dado que estoy registrando un pedido de 50 módulos de "Casetón de Guadua 60x60"
Cuando ingreso la cantidad 50 en el formulario de pedido
Entonces el sistema muestra la tabla de requerimientos:
  | Material             | Por unidad | Total req. | Stock actual | Estado  |
  | Guadua (culmos m lin)| 1.2        | 60 m       | 100 m        | 🟢 OK   |
  | Madera — refuerzo    | 0.6        | 30 m       | 80 m         | 🟢 OK   |
  Y el botón "Registrar Pedido" está habilitado
```

**Escenario 3 — Receta de Casetón de Icopor/EPS con stock suficiente**

```gherkin
Dado que estoy registrando un pedido de 80 unidades de "Casetón de Icopor 60x60"
Cuando ingreso la cantidad 80 en el formulario de pedido
Entonces el sistema muestra la tabla de requerimientos:
  | Material          | Por unidad | Total req. | Stock actual | Estado  |
  | Bloques EPS (und) | 1.0        | 80         | 150          | 🟢 OK   |
  Y el botón "Registrar Pedido" está habilitado
```

**Escenario 4 — Déficit de insumos en la receta de Casetón de Lona (Flujo de excepción)**

```gherkin
Dado que el stock de "Lona" es 30 m² y se requieren 80 m² para 100 módulos de Casetón de Lona
Cuando ingreso la cantidad 100
Entonces la tabla muestra:
  | Lona (m²) | 0.8 m² | 80 m² | 30 m² | 🔴 Déficit: -50 m² |
  Y aparece la advertencia: "Materiales insuficientes para completar este pedido. Puede registrarse pero no podrá iniciar producción."
  Y el botón "Registrar Pedido" permanece habilitado (el pedido se crea en PENDIENTE)
  Y el botón "Iniciar Producción" estará deshabilitado al ver el detalle del pedido
```

**Escenario 5 — Cambio dinámico de cantidad**

```gherkin
Dado que tengo el tipo "Casetón de Lona 60x60" seleccionado y una cantidad de 50
Cuando cambio la cantidad a 200
Entonces la tabla de requerimientos se actualiza automáticamente en menos de 500ms
  Y los cálculos muestran los nuevos totales para 200 módulos
  Y los indicadores de estado se actualizan según los nuevos requerimientos vs stock
```

---

### HU12 — Consultar Historial de Movimientos de Inventario

> **Como** ADMINISTRADOR,  
> **Quiero** consultar el historial cronológico de todos los movimientos de un material específico,  
> **Para** trazar el origen de cualquier discrepancia de inventario y auditar el comportamiento del stock.

**Sprint:** 4 | **MoSCoW:** Should Have | **Puntos:** 5  
**RF relacionados:** RF13 | **Responsable:** Javier Sepúlveda

---

#### Criterios de Aceptación

**Escenario 1 — Consulta del historial de un material**

```gherkin
Dado que soy ADMINISTRADOR y selecciono el material "Madera" en la sección de Inventario
Cuando hago clic en "Ver historial de movimientos"
Entonces el sistema muestra una tabla cronológica (más reciente primero) con:
  Fecha, hora, tipo de movimiento, cantidad (con signo), saldo resultante, referencia y usuario responsable
  Y los movimientos de tipo DESCUENTO_PRODUCCION muestran el ID del pedido como referencia
  Y los movimientos de tipo AJUSTE_APROBADO muestran el ID del ajuste y la justificación
```

**Escenario 2 — Filtro por rango de fechas**

```gherkin
Dado que estoy en el historial de movimientos del material "Guadua"
Cuando selecciono el rango de fechas del 01/08/2026 al 31/08/2026
Entonces la tabla muestra solo los movimientos dentro de ese período
  Y el sistema muestra el saldo inicial al inicio del período y el saldo final al cierre
```

---

### HU13 — Recibir Alertas de Stock Mínimo

> **Como** ADMINISTRADOR,  
> **Quiero** ser alertado cuando el stock de un material cae por debajo del umbral mínimo configurado,  
> **Para** realizar compras de reposición a tiempo y evitar paros de producción.

**Sprint:** 3 | **MoSCoW:** Must Have | **Puntos:** 5  
**RF relacionados:** RF09, RF11 | **Responsable:** Javier Sepúlveda

---

#### Criterios de Aceptación

**Escenario 1 — Alerta visible en dashboard e inventario**

```gherkin
Dado que el material "Lona" tiene stock_actual = 15 y stock_minimo = 30
Cuando el ADMINISTRADOR inicia sesión o recarga el dashboard
Entonces el widget "Materiales en Alerta" del dashboard muestra "Lona" con stock 15/30
  Y en la sección de Inventario, la fila de "Lona" tiene fondo amarillo y el indicador 🟡
  Y el encabezado de la sección muestra: "2 materiales por debajo del stock mínimo"
```

**Escenario 2 — Alerta de stock crítico**

```gherkin
Dado que "Icopor" tiene stock_actual = 5 y stock_minimo = 40 (menos del 50% del mínimo)
Cuando se carga el inventario
Entonces la fila de "Icopor" tiene fondo rojo y el indicador 🔴
  Y aparece en la parte superior de la lista de materiales en alerta, antes que los en 🟡
```

**Escenario 3 — Material sin alerta (stock normal)**

```gherkin
Dado que "Madera" tiene stock_actual = 500 y stock_minimo = 100
Cuando se carga el inventario
Entonces la fila de "Madera" tiene el indicador 🟢 y no aparece en el widget de alertas del dashboard
```

---

### HU14 — Visualizar Dashboard con KPIs Operativos

> **Como** usuario autenticado (ADMINISTRADOR u OPERARIO),  
> **Quiero** ver un dashboard con los indicadores clave del estado actual de la operación al iniciar sesión,  
> **Para** tener visibilidad inmediata del estado de los pedidos y el inventario sin necesidad de navegar por cada sección.

**Sprint:** 1 | **MoSCoW:** Must Have | **Puntos:** 8  
**RF relacionados:** RF14 | **Responsable:** Andrés Fernández

---

#### Criterios de Aceptación

**Escenario 1 — Dashboard del ADMINISTRADOR**

```gherkin
Dado que soy ADMINISTRADOR y acabo de autenticarme exitosamente
Cuando soy redirigido al dashboard principal
Entonces veo los siguientes widgets con datos en tiempo real:
  - "Pedidos en Producción": número de pedidos con estado EN_PRODUCCION
  - "Pedidos Pendientes": número de pedidos con estado PENDIENTE
  - "Completados Hoy": número de pedidos completados en el día de hoy
  - "Materiales en Alerta": número de materiales con stock ≤ stock_mínimo, con lista de los 3 más críticos
  - "Ajustes Pendientes": número de ajustes de inventario en estado PENDIENTE_APROBACION
  Y todos los valores se cargan en menos de 3 segundos desde el inicio de la petición
```

**Escenario 2 — Dashboard del OPERARIO**

```gherkin
Dado que soy OPERARIO y me autentico exitosamente
Cuando soy redirigido al dashboard principal
Entonces veo los widgets:
  - "Pedidos en Producción": número de pedidos con estado EN_PRODUCCION
  - "Pedidos Pendientes": número de pedidos con estado PENDIENTE
  Y NO veo los widgets de "Materiales en Alerta" ni "Ajustes Pendientes" (información restringida por rol)
```

**Escenario 3 — Dashboard sin datos iniciales**

```gherkin
Dado que es el primer día de uso del sistema y no hay pedidos ni ajustes registrados
Cuando cualquier usuario accede al dashboard
Entonces los widgets muestran el valor "0" con un mensaje: "Aún no hay registros de este tipo."
  Y no se muestran errores ni widgets vacíos sin contenido explicativo
```

---

### HU15 — Consultar Log de Auditoría de Acciones

> **Como** ADMINISTRADOR,  
> **Quiero** consultar el registro de auditoría de las acciones realizadas por todos los usuarios del sistema,  
> **Para** garantizar la trazabilidad, detectar usos indebidos y cumplir con requisitos de control interno.

**Sprint:** 4 | **MoSCoW:** Should Have | **Puntos:** 5  
**RF relacionados:** RF15 | **Responsable:** Oscar Ruiz

---

#### Criterios de Aceptación

**Escenario 1 — Consulta del log de auditoría**

```gherkin
Dado que soy ADMINISTRADOR en la sección "Auditoría"
Cuando cargo el log de auditoría sin filtros
Entonces veo una tabla cronológica (más reciente primero) con:
  Fecha/hora, usuario, acción realizada, entidad afectada, ID de entidad y dirección IP
  La tabla está paginada con 50 registros por página
  Y puedo exportar el log completo a CSV
```

**Escenario 2 — Filtro por usuario y rango de fechas**

```gherkin
Dado que soy ADMINISTRADOR y quiero auditar las acciones del usuario "Oscar Ruiz" en agosto 2026
Cuando selecciono "Oscar Ruiz" en el filtro de usuario y el rango 01/08/2026 - 31/08/2026
Entonces el log muestra exclusivamente las acciones de Oscar Ruiz en ese período
  Y las acciones de tipo "CAMBIO_ESTADO_PEDIDO" muestran el estado anterior y el nuevo
```

**Escenario 3 — Acceso denegado a OPERARIO**

```gherkin
Dado que soy OPERARIO autenticado
Cuando intento acceder a la URL "/auditoria" directamente en el navegador
Entonces el sistema retorna HTTP 403 Forbidden
  Y el frontend redirige al dashboard con el mensaje: "No tienes permisos para acceder a esta sección."
```

---

### HU16 — Registrar Compra a Proveedor e Ingresar Stock

> **Como** usuario del sistema (ADMINISTRADOR u OPERARIO),  
> **Quiero** registrar una orden de compra a un proveedor con las materias primas recibidas y sus precios,  
> **Para** que el inventario se actualice al instante y quede constancia del gasto de abastecimiento.

**Sprint:** 5 | **MoSCoW:** Must Have | **Puntos:** 8 (estimación inicial)  
**RF relacionados:** RF16 | **Responsable (autor principal del backend):** Javier Sepúlveda

---

#### Criterios de Aceptación

**Escenario 1 — Registro exitoso de una compra con varios materiales**

```gherkin
Dado que existe el proveedor activo "Guaduas del Valle S.A.S."
  Y existen las materias primas activas "Guadua - Culmos" y "Alambre de Amarre"
Cuando registro una compra con fecha de hoy y dos ítems:
  | Material          | Cantidad | Precio unitario |
  | Guadua - Culmos   | 100      | 12000           |
  | Alambre de Amarre | 100      | 3500            |
Entonces el sistema crea la compra con un código consecutivo "CMP-AAAA-XXXXX"
  Y calcula el subtotal de cada línea y el total de la compra (1.550.000)
  Y suma 100 al stock de cada material en la misma transacción
  Y registra un movimiento INGRESO_COMPRA en el Kardex por cada línea, con el stock antes y después
  Y responde HTTP 201 con la compra y sus detalles
```

**Escenario 2 — Proveedor inactivo**

```gherkin
Dado que el proveedor "Maderas del Sur" está desactivado
Cuando intento registrar una compra a ese proveedor
Entonces el sistema responde HTTP 422 con el mensaje:
  "El proveedor 'Maderas del Sur' está inactivo. No se pueden registrar compras."
  Y el stock no cambia
```

**Escenario 3 — Materia prima inactiva o inexistente (la compra completa se cancela)**

```gherkin
Dado que una compra incluye dos ítems y el segundo material está inactivo
Cuando envío la compra
Entonces el sistema responde HTTP 422 con el mensaje:
  "La materia prima '<nombre>' está inactiva. No se puede abastecer."
  Y ninguno de los dos materiales suma stock (la transacción se revierte completa)
```

**Escenario 4 — Validación de datos de entrada**

```gherkin
Dado que estoy en el formulario "Registrar Orden de Compra"
Cuando dejo sin proveedor, o con una cantidad menor o igual a 0, o con un precio negativo
Entonces el botón "Confirmar Compra" permanece deshabilitado
  Y si se envía por la API, responde HTTP 422 (cantidad > 0, precio >= 0, al menos 1 ítem)
```

---

### HU17 — Consultar Compras y su Detalle

> **Como** usuario del sistema,  
> **Quiero** ver el historial de compras y filtrarlo por código, proveedor o rango de fechas,  
> **Para** revisar cuánto se compró, a quién y cuándo, y verificar el detalle de cada orden.

**Sprint:** 5 | **MoSCoW:** Should Have | **Puntos:** 3 (estimación inicial)  
**RF relacionados:** RF16 | **Responsable (autor principal del backend):** Javier Sepúlveda

---

#### Criterios de Aceptación

**Escenario 1 — Listado paginado con filtros**

```gherkin
Dado que existen varias compras registradas
Cuando abro la sección "Abastecimiento"
Entonces veo las compras ordenadas de la más reciente a la más antigua, con código, proveedor, fecha y total en COP
  Y puedo filtrar por código (ej. "CMP-2026"), por proveedor y por rango de fechas desde/hasta
  Y la lista se pagina (20 por página por defecto, máximo 100)
```

**Escenario 2 — Detalle de una compra**

```gherkin
Dado que selecciono la compra "CMP-2026-00001"
Cuando abro su detalle
Entonces veo cada material comprado con su cantidad, precio unitario y subtotal
  Y las observaciones registradas (por ejemplo, el número de factura)
```

**Escenario 3 — Compra inexistente**

```gherkin
Dado que consulto una compra con un ID que no existe
Cuando el sistema la busca
Entonces responde HTTP 404
```

---

### HU18 — Gestionar Materias Primas (Crear, Editar, Desactivar)

> **Como** ADMINISTRADOR,  
> **Quiero** crear, editar y desactivar las materias primas del inventario,  
> **Para** mantener actualizado el catálogo de insumos que usan las recetas y las compras.

**Sprint:** 5 | **MoSCoW:** Must Have | **Puntos:** 5 (estimación inicial)  
**RF relacionados:** RF09, RF17 | **Responsable (autor principal del backend):** Javier Sepúlveda

---

#### Criterios de Aceptación

**Escenario 1 — Crear una materia prima**

```gherkin
Dado que soy ADMINISTRADOR en "Control de Inventario" > "Nuevo Material"
Cuando completo nombre "Clavo de Acero 3 pulgadas", unidad de medida, stock inicial y stock mínimo
  Y confirmo
Entonces el sistema crea el material activo con ese stock inicial
  Y el botón "Registrar Insumo" estuvo deshabilitado hasta que el formulario fue válido
```

**Escenario 2 — Nombre duplicado**

```gherkin
Dado que ya existe el material "Grapas"
Cuando intento crear o renombrar otro material con el nombre "Grapas"
Entonces el sistema responde HTTP 409 con el mensaje:
  "Ya existe un material con el nombre 'Grapas'."
```

**Escenario 3 — Validaciones de campos**

```gherkin
Dado que estoy creando un material
Cuando el nombre tiene menos de 3 caracteres, o el stock mínimo o el stock inicial son negativos
Entonces el sistema rechaza los datos (HTTP 422) y el formulario no permite enviarlos
```

**Escenario 4 — Desactivar un material (borrado lógico)**

```gherkin
Dado que el material "Puntillas" está activo
Cuando el ADMINISTRADOR lo desactiva
Entonces el material deja de aparecer para nuevas compras y recetas
  Y su historial (Kardex, compras anteriores) se conserva intacto
```

**Escenario 5 — Control de acceso**

```gherkin
Dado que soy OPERARIO
Cuando intento crear, editar o desactivar un material
Entonces el sistema responde HTTP 403 Forbidden
  Y puedo seguir consultando el inventario
```

---

### HU19 — Administrar Recetas BOM de cada Tipo de Casetón

> **Como** ADMINISTRADOR,  
> **Quiero** definir qué materiales y en qué cantidad lleva cada tipo de casetón,  
> **Para** que el motor de producción descuente del inventario las cantidades correctas sin tocar la base de datos a mano.

**Sprint:** 5 | **MoSCoW:** Must Have | **Puntos:** 5 (estimación inicial)  
**RF relacionados:** RF07, RF18 | **Responsable (autor principal):** Andrés Fernández

---

#### Criterios de Aceptación

**Escenario 1 — Ver la receta de un tipo de casetón**

```gherkin
Dado que soy ADMINISTRADOR en "Recetas BOM"
Cuando selecciono la pestaña "Casetón de Guadua 60x60"
Entonces veo cada material con su cantidad por unidad y su unidad de medida
```

**Escenario 2 — Agregar un material a la receta**

```gherkin
Dado que el material "Clavo de Acero" no está en la receta del casetón de Guadua
Cuando elijo el material, escribo la cantidad por unidad (mayor que 0) y confirmo
Entonces el material queda en la receta
  Y el selector solo ofrece materiales que todavía no están en esa receta
  Y el botón "Agregar a Receta" estuvo deshabilitado hasta tener material y cantidad válidos
```

**Escenario 3 — Material duplicado en la misma receta**

```gherkin
Dado que "Madera - Listones" ya está en la receta del casetón de Lona
Cuando intento agregarlo otra vez por la API
Entonces el sistema responde HTTP 409 con el mensaje:
  "Ya existe una receta para 'Madera - Listones' en 'Casetón de Lona 60x60'. Edita la cantidad existente en vez de duplicarla."
```

**Escenario 4 — Editar la cantidad o quitar un material**

```gherkin
Dado que la receta incluye "Puntillas" con cantidad 10
Cuando edito la cantidad a 12, o quito el material de la receta
Entonces el cambio se aplica
  Y los pedidos nuevos usan la receta actualizada en su previsualización BOM y en el descuento de inventario
```

**Escenario 5 — Control de acceso**

```gherkin
Dado que soy OPERARIO
Cuando intento crear, editar o eliminar una receta
Entonces el sistema responde HTTP 403 Forbidden
  Y la opción "Recetas BOM" no aparece en mi menú
```

---

### HU20 — Mantener y Cerrar la Sesión de Forma Segura

> **Como** usuario del sistema,  
> **Quiero** que mi sesión se renueve automáticamente mientras trabajo y que se cierre de verdad al salir,  
> **Para** no tener que iniciar sesión cada pocos minutos y que nadie pueda reutilizar mi sesión después de salir.

**Sprint:** 5 | **MoSCoW:** Should Have | **Puntos:** 5 (estimación inicial)  
**RF relacionados:** RF01, RF19 | **Responsable (autor principal):** Andrés Fernández

---

#### Criterios de Aceptación

**Escenario 1 — Renovación silenciosa de la sesión**

```gherkin
Dado que inicié sesión y mi token de acceso (30 minutos) venció
Cuando hago una acción en el sistema
Entonces el frontend renueva la sesión sin pedirme credenciales, usando la cookie de renovación (válida 7 días)
  Y la acción se completa con normalidad
```

**Escenario 2 — Recargar la página no cierra la sesión**

```gherkin
Dado que estoy dentro del sistema
Cuando recargo la página (F5)
Entonces sigo con la sesión iniciada
  Y el token de acceso nunca se guardó en localStorage (vive solo en memoria)
```

**Escenario 3 — Rotación del token de renovación**

```gherkin
Dado que renové mi sesión y el sistema me entregó un token de renovación nuevo
Cuando alguien intenta reutilizar el token de renovación anterior
Entonces el sistema responde HTTP 401: "La sesión expiró o ya no es válida. Inicie sesión de nuevo."
  Y borra la cookie
```

**Escenario 4 — Cerrar sesión**

```gherkin
Dado que estoy dentro del sistema
Cuando pulso "Salir"
Entonces el sistema revoca mi token de renovación y borra la cookie
  Y responde: "Sesión cerrada correctamente."
  Y no puedo renovar la sesión sin volver a iniciar sesión
```

**Escenario 5 — Sin sesión activa**

```gherkin
Dado que no tengo cookie de renovación
Cuando el frontend intenta renovar la sesión
Entonces el sistema responde HTTP 401: "No hay una sesión activa para renovar. Inicie sesión de nuevo."
  Y el frontend me lleva a la pantalla de inicio de sesión
```

---

### HU21 — Bloquear la Cuenta tras Intentos Fallidos de Acceso

> **Como** ADMINISTRADOR del sistema,  
> **Quiero** que una cuenta se bloquee tras 5 contraseñas incorrectas seguidas,  
> **Para** frenar los ataques de fuerza bruta contra las cuentas de la fábrica.

**Sprint:** 5 | **MoSCoW:** Should Have | **Puntos:** 3 (estimación inicial)  
**RF relacionados:** RF01, RF19 | **Responsable (autor principal):** Andrés Fernández

---

#### Criterios de Aceptación

**Escenario 1 — Contraseña incorrecta (menos de 5 intentos)**

```gherkin
Dado que mi cuenta está activa
Cuando escribo una contraseña incorrecta
Entonces el sistema responde HTTP 401: "Email o contraseña incorrectos."
  Y suma 1 a mi contador de intentos fallidos
```

**Escenario 2 — Bloqueo al quinto intento**

```gherkin
Dado que llevo 4 intentos fallidos seguidos
Cuando fallo por quinta vez
Entonces el sistema desactiva mi cuenta (activo = falso)
  Y responde HTTP 401: "Cuenta bloqueada tras 5 intentos fallidos. Contacte a un administrador para reactivarla."
```

**Escenario 3 — Login exitoso reinicia el contador**

```gherkin
Dado que llevo 3 intentos fallidos
Cuando inicio sesión con la contraseña correcta
Entonces entro al sistema y mi contador de intentos fallidos vuelve a 0
```

**Escenario 4 — Cuenta bloqueada no entra aunque use la contraseña correcta**

```gherkin
Dado que mi cuenta fue bloqueada
Cuando inicio sesión con la contraseña correcta
Entonces el sistema responde HTTP 401: "La cuenta de usuario está desactivada. Contacte a un administrador."
```

**Escenario 5 — Reactivación por un ADMINISTRADOR**

```gherkin
Dado que una cuenta está bloqueada
Cuando un ADMINISTRADOR la reactiva desde "Usuarios"
Entonces la persona puede iniciar sesión de nuevo
```

**Escenario 6 — Límite por dirección IP**

```gherkin
Dado que una misma IP intenta iniciar sesión más de 10 veces por minuto
Cuando envía el intento número 11
Entonces el sistema responde HTTP 429 (demasiadas peticiones)
```

---

## 4. Glosario de Roles

| Rol | Descripción | Capacidades en el sistema |
|-----|-------------|--------------------------|
| **ADMINISTRADOR** | Usuario con acceso completo al sistema. Generalmente el jefe de producción o responsable de compras. | CRUD completo de usuarios, proveedores, pedidos, materiales y ajustes. Aprobación de ajustes de inventario. Acceso a reportes y auditoría. |
| **OPERARIO** | Usuario con acceso restringido a las funciones operativas del día a día. | Consulta de pedidos, visualización de inventario, registro de avance de producción. Sin acceso a gestión de usuarios, proveedores ni aprobación de ajustes. |

---

> **Documento revisado y aprobado por:** Andrés Fernández (Tech Lead)  
> **Próxima revisión:** Inicio del Sprint 2 (refinamiento del backlog)  
> **Documentos relacionados:** [`01-analisis-y-alcance.md`](./01-analisis-y-alcance.md) · [`02-requisitos-sistema.md`](./02-requisitos-sistema.md)
