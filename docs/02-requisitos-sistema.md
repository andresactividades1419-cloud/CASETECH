# Requisitos del Sistema — CASETECH ERP

> **Versión:** 1.0.0  
> **Fecha:** Agosto 2026  
> **Equipo:** Andrés Fernández · Oscar Ruiz · Javier Sepúlveda · Angélica Arregoces  
> **Clasificación:** Documento Interno — Especificación de Requisitos de Software (SRS)  
> **Patrón arquitectónico:** ERP Web Modular de Producción por Recetas (BOM — Bill of Materials) · Caso de uso inicial: fábrica de casetones

> [!NOTE]
> La estructura de base de datos y el backend son **genéricos y parametrizables**. Las tablas `tipos_caseton` / `recetas` / `materiales` implementan el patrón BOM estándar y pueden adaptarse a cualquier proceso de ensamble sin modificar los Stored Procedures ni los endpoints de producción.

---

## Tabla de Contenidos

1. [Requisitos Funcionales](#1-requisitos-funcionales)
2. [Requisitos No Funcionales](#2-requisitos-no-funcionales)
3. [Reglas de Negocio](#3-reglas-de-negocio)
4. [Matriz de Trazabilidad](#4-matriz-de-trazabilidad)

---

## 1. Requisitos Funcionales
---

### RF01 — Autenticación Segura con JWT

**Módulo:** 0 — Seguridad  
**Prioridad:** Must Have  
**Actor principal:** Todos los usuarios

**Descripción:**  
El sistema debe proporcionar un mecanismo de autenticación basado en credenciales (email + contraseña) que emita un token JWT firmado con el algoritmo HS256. Este token debe incluirse en cada petición subsiguiente a la API en el encabezado `Authorization: Bearer <token>`.

**Flujo principal:**
1. El usuario ingresa su email y contraseña en el formulario de login del frontend React.
2. El frontend envía una petición `POST /api/v1/auth/login` con el cuerpo `{ "email": "...", "password": "..." }`.
3. El backend recupera el registro del usuario por email en la tabla `usuarios`.
4. Si el usuario no existe o está inactivo (`activo = false`), responde con `HTTP 401 Unauthorized`.
5. El backend verifica la contraseña usando `passlib[bcrypt]` comparando con `password_hash`.
6. Si la verificación falla, incrementa el contador de intentos fallidos. Al llegar a 5, bloquea la cuenta (`activo = false`).
7. Si la verificación es exitosa, emite un JWT con los claims: `sub` (user_id), `rol`, `exp` (8 horas desde emisión).
8. El frontend almacena el token en memoria (no en `localStorage`) y lo adjunta en todas las peticiones.

**Criterio de verificación:**  
- Token JWT válido retornado con `HTTP 200` ante credenciales correctas.
- `HTTP 401` ante credenciales incorrectas, usuario inexistente o inactivo.
- El token expira correctamente pasadas 8 horas.

---

### RF02 — Gestión de Usuarios (CRUD)

**Módulo:** 0 — Seguridad  
**Prioridad:** Must Have  
**Actor principal:** ADMINISTRADOR

**Descripción:**  
El ADMINISTRADOR debe poder crear, visualizar, editar y desactivar cuentas de usuario del sistema. No existe eliminación física de usuarios; el borrado es lógico mediante el campo `activo`.

**Operaciones requeridas:**

| Operación | Endpoint | Restricción |
|-----------|----------|-------------|
| Crear usuario | `POST /api/v1/usuarios` | Solo ADMINISTRADOR. Email único. Contraseña hasheada con bcrypt cost=12. |
| Listar usuarios | `GET /api/v1/usuarios` | Solo ADMINISTRADOR. Soporta filtro por rol y estado activo. |
| Ver detalle | `GET /api/v1/usuarios/{id}` | Solo ADMINISTRADOR. |
| Editar usuario | `PUT /api/v1/usuarios/{id}` | Solo ADMINISTRADOR. No permite cambiar email ni password desde este endpoint. |
| Cambiar contraseña | `PATCH /api/v1/usuarios/{id}/password` | ADMINISTRADOR o el propio usuario. |
| Desactivar usuario | `PATCH /api/v1/usuarios/{id}/desactivar` | Solo ADMINISTRADOR. El usuario desactivado no puede iniciar sesión. |

**Validaciones:**
- El email debe ser único en la tabla `usuarios`.
- La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número.
- Un ADMINISTRADOR no puede desactivarse a sí mismo si es el único ADMINISTRADOR activo.

---

### RF03 — Registro de Proveedores con NIT Único

**Módulo:** 1 — Proveedores  
**Prioridad:** Must Have  
**Actor principal:** ADMINISTRADOR

**Descripción:**  
El sistema debe permitir registrar proveedores con todos sus datos identificativos. El NIT (Número de Identificación Tributaria) actúa como identificador único de negocio y no puede duplicarse en el sistema.

**Campos requeridos para el registro:**

| Campo | Tipo | Obligatorio | Validación |
|-------|------|-------------|------------|
| `nit` | `VARCHAR(20)` | Sí | Único, formato alfanumérico, no modificable tras creación |
| `nombre_empresa` | `VARCHAR(255)` | Sí | Mínimo 3 caracteres |
| `nombre_contacto` | `VARCHAR(255)` | Sí | Nombre del representante o contacto principal |
| `telefono` | `VARCHAR(20)` | Sí | Solo dígitos, 7-15 caracteres |
| `email` | `VARCHAR(255)` | No | Formato email válido si se provee |
| `direccion` | `TEXT` | No | Dirección física del proveedor |
| `activo` | `BOOLEAN` | Auto | `true` al crear; `false` al borrar lógicamente |

**Flujo de borrado lógico:**
1. El ADMINISTRADOR selecciona "Desactivar proveedor" en la interfaz.
2. El sistema verifica si el proveedor tiene compras asociadas.
3. Si tiene compras: actualiza `activo = false` y muestra mensaje de confirmación.
4. El proveedor desactivado no aparece en desplegables de nuevas operaciones pero permanece visible en el historial.

---

### RF04 — Consulta y Filtrado de Proveedores

**Módulo:** 1 — Proveedores  
**Prioridad:** Must Have  
**Actor principal:** ADMINISTRADOR

**Descripción:**  
La lista de proveedores debe soportar búsqueda y filtrado para facilitar la localización rápida de registros.

**Filtros disponibles:**
- Búsqueda por NIT (coincidencia exacta o parcial).
- Búsqueda por nombre de empresa (búsqueda insensible a mayúsculas).
- Filtro por estado: todos / activos / inactivos.
- Ordenamiento por nombre de empresa, NIT o fecha de creación.
- Paginación: 20 registros por página (configurable).

**Endpoint:** `GET /api/v1/proveedores?nit=&nombre=&activo=&page=&limit=`

---

### RF05 — Registro de Pedidos de Casetones

**Módulo:** 2 — Pedidos y Producción  
**Prioridad:** Must Have  
**Actor principal:** ADMINISTRADOR

**Descripción:**  
El sistema debe permitir registrar nuevos pedidos especificando el cliente, el tipo de casetón requerido y la cantidad. La fábrica produce tres tipos de casetón con naturalezas distintas que impactan directamente la lógica de inventario:

| Tipo de Casetón | Naturaleza | Materias primas principales | Reversión al cancelar |
|-----------------|------------|-----------------------------|-----------------------|
| **Casetón de Lona** | ♻️ Recuperable | Madera (listones) + Lona (m²) | ✅ Posible (materiales reincorporables) |
| **Casetón de Guadua** | ♻️ Recuperable | Guadua (culmos) + Madera + Amarres | ✅ Posible (materiales reincorporables) |
| **Casetón de Icopor/EPS** | 🚫 Perdido | Bloques EPS (unidades/m³) | ❌ No aplica (material fundido en obra) |

Al registrar el pedido, el sistema calcula automáticamente el total de materias primas necesarias según la receta del tipo de casetón seleccionado y muestra la disponibilidad de inventario.

**Campos del pedido:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `cliente` | `VARCHAR(255)` | Nombre del cliente o empresa solicitante |
| `tipo_caseton_id` | `INTEGER` | FK a la tabla `tipos_caseton` |
| `cantidad` | `INTEGER` | Número de unidades solicitadas (> 0) |
| `fecha_entrega_estimada` | `DATE` | Fecha compromiso de entrega |
| `observaciones` | `TEXT` | Notas adicionales sobre el pedido |

**Cálculo automático de receta:**  
Al seleccionar tipo de casetón y cantidad, el frontend consulta `GET /api/v1/recetas/{tipo_caseton_id}?cantidad={n}` y muestra una tabla de requerimientos vs. stock disponible con indicación visual de déficit (🔴) o suficiencia (🟢). Para el Casetón de Icopor/EPS, la interfaz debe mostrar el aviso: ⚠️ *"Los bloques EPS descontados no podrán recuperarse al inventario."*

---

### RF06 — Control de Estados de Pedido

**Módulo:** 2 — Pedidos y Producción  
**Prioridad:** Must Have  
**Actor principal:** ADMINISTRADOR

**Descripción:**  
El sistema debe implementar una máquina de estados para los pedidos que garantice transiciones válidas y ejecute las acciones correspondientes en cada transición.

**Transiciones válidas:**

```
PENDIENTE ──► EN_PRODUCCION  (Acción: ejecutar SP de descuento de inventario)
EN_PRODUCCION ──► COMPLETADO  (Acción: registrar fecha de despacho)
EN_PRODUCCION ──► CANCELADO   (Acción: revertir inventario si se descontó)
PENDIENTE ──► CANCELADO       (Acción: ninguna sobre inventario)
```

**Transiciones inválidas (deben retornar `HTTP 422`):**
- `COMPLETADO → cualquier estado`
- `CANCELADO → cualquier estado`
- `PENDIENTE → COMPLETADO` (debe pasar por EN_PRODUCCION)

**Endpoint de transición:** `PATCH /api/v1/pedidos/{id}/estado`  
**Body:** `{ "nuevo_estado": "EN_PRODUCCION" }`

---

### RF07 — Cálculo Automático de Consumo por Receta

**Módulo:** 2 — Pedidos y Producción  
**Prioridad:** Must Have  
**Actor principal:** Sistema (automático)

**Descripción:**  
El sistema debe calcular en tiempo real el consumo total de materias primas para un pedido dado, multiplicando la receta del casetón por la cantidad solicitada. Este cálculo se realiza tanto en el frontend (para visualización previa) como en el backend (para validación antes del descuento). La respuesta debe incluir la naturaleza del tipo de casetón para que la UI pueda mostrar advertencias diferenciadas.

**Recetas ilustrativas por tipo de casetón:**

**🧵 Casetón de Lona — Recuperable** (ejemplo: módulo 60×60 cm)

| Material | Receta por unidad | Pedido: 100 módulos | Reversible |
|----------|-------------------|---------------------|------------|
| Madera — listones (m lin.) | 2.5 | 250 m | ✅ Sí |
| Lona (m²) | 0.8 | 80 m² | ✅ Sí |

**🪵 Casetón de Guadua — Recuperable** (ejemplo: cercha 60×60 cm)

| Material | Receta por unidad | Pedido: 100 módulos | Reversible |
|----------|-------------------|---------------------|------------|
| Guadua — culmos (m lin.) | 1.2 | 120 m | ✅ Sí |
| Madera — refuerzo (m lin.) | 0.6 | 60 m | ✅ Sí |

**🟡 Casetón de Icopor/EPS — Perdido** (ejemplo: bloque 60×60×25 cm)

| Material | Receta por unidad | Pedido: 100 unidades | Reversible |
|----------|-------------------|----------------------|------------|
| Bloques EPS (unidades) | 1.0 | 100 bloques | 🚫 **No** |

> [!NOTE]
> **Arquitectura BOM genérica:** El endpoint y el modelo de datos son independientes del tipo de producto. `tipo_caseton_id` es en realidad un `tipo_producto_id` genérico; las tablas `recetas` y `materiales` implementan el patrón BOM estándar. Agregar un nuevo tipo de producto solo requiere insertar filas en `tipos_caseton` y `recetas`, sin cambios en el código.

**Endpoint:** `GET /api/v1/recetas/{tipo_caseton_id}/consumo?cantidad={n}`

**Respuesta:**
```json
{
  "tipo_caseton": "Casetón de Icopor 60x60",
  "naturaleza": "PERDIDO",
  "cantidad_pedida": 100,
  "advertencia": "Los materiales de este tipo de casetón no son recuperables al inventario una vez iniciada la producción.",
  "materiales": [
    {
      "material_id": 3,
      "nombre": "Bloques EPS",
      "requerido": 100.0,
      "disponible": 150.0,
      "deficit": 0.0,
      "suficiente": true,
      "reversible": false
    }
  ]
}
```

---

### RF08 — Descuento Atómico de Inventario mediante Stored Procedure

**Módulo:** 2 — Pedidos y Producción  
**Prioridad:** Must Have  
**Actor principal:** Sistema (automático al confirmar producción)

**Descripción:**  
Al transicionar un pedido a estado `EN_PRODUCCION`, el backend debe invocar el Stored Procedure `sp_descontar_inventario` en PostgreSQL 16. Este SP opera dentro de una transacción atómica y tiene en cuenta la **naturaleza del tipo de casetón** para etiquetar correctamente el tipo de movimiento de inventario.

**Regla crítica por naturaleza de casetón:**

| Naturaleza | Tipo de movimiento registrado | ¿Permite reversión? |
|------------|-------------------------------|---------------------|
| Recuperable (Lona, Guadua) | `DESCUENTO_PRODUCCION` | ✅ Sí — al cancelar en producción |
| Perdido (Icopor/EPS) | `DESCUENTO_PRODUCCION_DEFINITIVO` | 🚫 **No** — el EPS queda fundido en la losa |

**Especificación del Stored Procedure:**

```sql
CREATE OR REPLACE PROCEDURE sp_descontar_inventario(
    p_pedido_id INTEGER,
    p_usuario_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_rec RECORD;
    v_stock_actual NUMERIC;
    v_consumo NUMERIC;
    v_naturaleza VARCHAR(20);
    v_tipo_mov VARCHAR(40);
BEGIN
    -- Obtener la naturaleza del tipo de casetón del pedido
    SELECT tc.naturaleza INTO v_naturaleza
    FROM pedidos p
    JOIN tipos_caseton tc ON tc.id = p.tipo_caseton_id
    WHERE p.id = p_pedido_id;

    -- Determinar el tipo de movimiento según la naturaleza
    IF v_naturaleza = 'PERDIDO' THEN
        v_tipo_mov := 'DESCUENTO_PRODUCCION_DEFINITIVO';
    ELSE
        v_tipo_mov := 'DESCUENTO_PRODUCCION';
    END IF;

    -- Iterar sobre cada material de la receta del pedido
    FOR v_rec IN
        SELECT
            r.material_id,
            r.cantidad_por_unidad * p.cantidad AS consumo_total,
            m.nombre AS nombre_material
        FROM pedidos p
        JOIN recetas r ON r.tipo_caseton_id = p.tipo_caseton_id
        JOIN materiales m ON m.id = r.material_id
        WHERE p.id = p_pedido_id
    LOOP
        -- Bloqueo pesimista para evitar condición de carrera
        SELECT stock_actual INTO v_stock_actual
        FROM materiales
        WHERE id = v_rec.material_id
        FOR UPDATE;

        v_consumo := v_rec.consumo_total;

        -- Validar suficiencia de stock
        IF v_stock_actual < v_consumo THEN
            RAISE EXCEPTION 'Stock insuficiente para material "%". Disponible: %, Requerido: %',
                v_rec.nombre_material, v_stock_actual, v_consumo;
        END IF;

        -- Descontar inventario
        UPDATE materiales
        SET stock_actual = stock_actual - v_consumo
        WHERE id = v_rec.material_id;

        -- Registrar movimiento con tipo diferenciado según naturaleza
        INSERT INTO movimientos_inventario
            (material_id, tipo_movimiento, cantidad, referencia_id, referencia_tipo, created_at)
        VALUES
            (v_rec.material_id, v_tipo_mov, v_consumo, p_pedido_id, 'PEDIDO', NOW());
    END LOOP;
END;
$$;
```

**Invocación desde FastAPI:**
```python
# En el servicio de pedidos
db.execute(text("CALL sp_descontar_inventario(:pedido_id, :usuario_id)"),
           {"pedido_id": pedido_id, "usuario_id": current_user.id})
db.commit()
```

**Comportamiento ante error:**  
Si el SP lanza una excepción (stock insuficiente), SQLAlchemy realiza automáticamente el rollback y el backend retorna `HTTP 422 Unprocessable Entity` con el mensaje descriptivo del material faltante.

**Nota sobre la tabla `tipos_caseton`:**  
Debe incluir el campo `naturaleza VARCHAR(20) NOT NULL CHECK (naturaleza IN ('RECUPERABLE', 'PERDIDO'))` para que el SP pueda determinar el comportamiento correcto.

---

### RF09 — Gestión de Inventario de Materias Primas

**Módulo:** 3 — Inventario  
**Prioridad:** Must Have  
**Actor principal:** ADMINISTRADOR

**Descripción:**  
El sistema debe proporcionar una vista centralizada del inventario actual con capacidad de visualizar el estado de cada material, registrar ingresos por compra y monitorear alertas de stock mínimo.

**Operaciones requeridas:**

| Operación | Endpoint | Actor |
|-----------|----------|-------|
| Listar materiales con stock | `GET /api/v1/materiales` | ADMINISTRADOR, OPERARIO |
| Ver detalle de material | `GET /api/v1/materiales/{id}` | ADMINISTRADOR, OPERARIO |
| Crear material | `POST /api/v1/materiales` | Solo ADMINISTRADOR |
| Editar material (nombre, unidad, stock_mínimo) | `PUT /api/v1/materiales/{id}` | Solo ADMINISTRADOR |
| Registrar ingreso por compra | `POST /api/v1/materiales/{id}/ingreso` | Solo ADMINISTRADOR |

**Indicadores visuales en el frontend:**
- 🔴 **Stock crítico:** `stock_actual < stock_minimo * 0.5`
- 🟡 **Stock bajo:** `stock_actual >= stock_minimo * 0.5` y `stock_actual <= stock_minimo`
- 🟢 **Stock normal:** `stock_actual > stock_minimo`

---

### RF10 — Registro de Ajustes de Inventario con Justificación

**Módulo:** 3 — Inventario  
**Prioridad:** Must Have  
**Actor principal:** ADMINISTRADOR

**Descripción:**  
El sistema debe permitir registrar ajustes manuales de inventario con campo de justificación obligatorio. Los ajustes que representan salidas (merma, devolución) quedan pendientes de aprobación por el ADMINISTRADOR antes de afectar el stock.

**Campos del ajuste:**

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `material_id` | `INTEGER` | Sí | FK al material afectado |
| `tipo_ajuste` | `ENUM` | Sí | MERMA / DEVOLUCION / CONTEO_FISICO / INGRESO_COMPRA |
| `cantidad_ajuste` | `NUMERIC` | Sí | Cantidad a ajustar (positiva para entradas, negativa para salidas) |
| `justificacion` | `TEXT` | Sí | Descripción obligatoria del motivo del ajuste (mín. 20 caracteres) |

**Flujo de aprobación:**
1. El usuario registra el ajuste → estado: `PENDIENTE_APROBACION`.
2. El sistema registra `cantidad_antes` (snapshot del stock al momento del registro).
3. El ADMINISTRADOR revisa los ajustes pendientes en el panel de auditoría.
4. Al aprobar: el sistema actualiza `stock_actual` y registra `cantidad_despues`.
5. Al rechazar: el ajuste queda en estado `RECHAZADO` con comentario del revisor.

---

### RF11 — Alertas de Stock Mínimo

**Módulo:** 3 — Inventario  
**Prioridad:** Must Have  
**Actor principal:** Sistema (automático) + ADMINISTRADOR (visualización)

**Descripción:**  
El sistema debe detectar y notificar cuando el stock de un material cae por debajo del umbral mínimo configurado, tanto en el dashboard principal como en la sección de inventario.

**Mecanismo:**
- **Dashboard:** Widget con contador de materiales en alerta y lista de los 5 más críticos.
- **Listado de materiales:** Fila destacada con color y ícono según nivel de stock.
- **Endpoint de alertas:** `GET /api/v1/inventario/alertas` retorna los materiales con `stock_actual <= stock_minimo`.

**No se requiere** notificación por email o push en la v1.0 (fuera del alcance).

---

### RF12 — Reportes Operativos

**Módulo:** Transversal  
**Prioridad:** Should Have  
**Actor principal:** ADMINISTRADOR

**Descripción:**  
El sistema debe generar reportes descargables o visualizables en pantalla con información agregada del ciclo productivo.

**Reportes requeridos en v1.0:**

| Reporte | Descripción | Filtros |
|---------|-------------|---------|
| **R01 — Historial de Pedidos** | Lista de todos los pedidos con estado, cliente y fechas | Rango de fechas, estado, cliente |
| **R02 — Consumo de Materiales** | Resumen del total de cada material consumido en producción | Rango de fechas, material |
| **R03 — Auditoría de Ajustes** | Todos los ajustes de inventario con usuario y justificación | Rango de fechas, tipo ajuste, usuario, material |
| **R04 — Stock Actual** | Snapshot del inventario actual con indicadores de alerta | Estado de stock (crítico/bajo/normal) |
| **R05 — Proveedores Activos** | Directorio de proveedores con datos de contacto | Estado activo/inactivo |

**Formato de exportación:** Los reportes deben poder descargarse en formato CSV para facilitar su uso en herramientas externas.

---

### RF13 — Historial de Movimientos de Inventario

**Módulo:** 3 — Inventario  
**Prioridad:** Should Have  
**Actor principal:** ADMINISTRADOR

**Descripción:**  
El sistema debe mantener un registro cronológico inmutable de todos los movimientos que afectan el inventario de cada material, incluyendo tanto los automáticos (producción, compras) como los manuales (ajustes aprobados).

**Endpoint:** `GET /api/v1/materiales/{id}/movimientos?desde=&hasta=&tipo=`

**Datos del movimiento:**
- Fecha y hora (timestamp con zona horaria).
- Tipo de movimiento (INGRESO_COMPRA, DESCUENTO_PRODUCCION, AJUSTE_APROBADO).
- Cantidad (con signo: positivo para entradas, negativo para salidas).
- Referencia (ID del pedido u orden de compra que originó el movimiento).
- Usuario responsable.

---

### RF14 — Dashboard Principal con KPIs

**Módulo:** Transversal  
**Prioridad:** Must Have  
**Actor principal:** ADMINISTRADOR, OPERARIO

**Descripción:**  
El sistema debe presentar un dashboard de inicio con los indicadores clave de operación al momento de iniciar sesión.

**KPIs del dashboard:**

| Indicador | Descripción | Rol |
|-----------|-------------|-----|
| Pedidos en producción | Conteo de pedidos con estado `EN_PRODUCCION` | Admin + Operario |
| Pedidos pendientes | Conteo de pedidos con estado `PENDIENTE` | Admin + Operario |
| Materiales en alerta | Conteo de materiales bajo stock mínimo | Solo Admin |
| Pedidos completados hoy | Conteo de pedidos completados en el día | Solo Admin |
| Últimos ajustes pendientes | Lista de ajustes de inventario sin aprobar | Solo Admin |

---

### RF15 — Auditoría de Acciones del Sistema

**Módulo:** 0 — Seguridad  
**Prioridad:** Should Have  
**Actor principal:** Sistema (automático)

**Descripción:**  
El sistema debe registrar automáticamente un log de auditoría de las acciones sensibles realizadas por cada usuario, incluyendo login, creación/edición de proveedores, cambios de estado de pedidos y aprobación de ajustes.

**Tabla de auditoría:** `audit_log` (id, usuario_id, accion, entidad, entidad_id, datos_anteriores JSONB, datos_nuevos JSONB, ip_address, created_at)

**Acciones auditadas:**
- Inicio y cierre de sesión.
- Creación, edición y desactivación de usuarios y proveedores.
- Cambios de estado de pedidos.
- Aprobación o rechazo de ajustes de inventario.

---

## 2. Requisitos No Funcionales

### RNF-SEG — Seguridad

#### RNF-SEG-01: Hashing de Contraseñas con bcrypt

**Descripción:** Todas las contraseñas de usuarios deben almacenarse exclusivamente como hash bcrypt con factor de costo mínimo de **12**. Está **prohibido** almacenar contraseñas en texto plano o con algoritmos reversibles (MD5, SHA1 sin salt).

**Implementación:**
```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

**Verificación:** Inspección del hash almacenado en BD; debe comenzar con `$2b$12$`.

---

#### RNF-SEG-02: Tokens JWT con Expiración y Firma HS256

**Descripción:** Los tokens de autenticación deben ser JWT firmados con HS256 usando una clave secreta de mínimo 256 bits. Los tokens expiran en 8 horas y no son renovables automáticamente (el usuario debe re-autenticarse).

**Claims del JWT:**
```json
{
  "sub": "42",
  "rol": "ADMINISTRADOR",
  "iat": 1724000000,
  "exp": 1724028800
}
```

**La clave secreta** debe configurarse como variable de entorno `JWT_SECRET` y nunca versionarse en el repositorio.

---

#### RNF-SEG-03: Control de Acceso Basado en Roles (RBAC)

**Descripción:** La API debe implementar RBAC con dos roles: `ADMINISTRADOR` y `OPERARIO`. Cada endpoint debe declarar explícitamente qué rol tiene acceso.

**Implementación vía dependencias FastAPI:**
```python
from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user

def require_admin(current_user = Depends(get_current_user)):
    if current_user.rol != "ADMINISTRADOR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol ADMINISTRADOR"
        )
    return current_user
```

**Tabla de acceso por módulo:**

| Endpoint | ADMINISTRADOR | OPERARIO |
|----------|:-------------:|:--------:|
| `POST /auth/login` | ✅ | ✅ |
| `GET /usuarios` | ✅ | ❌ |
| `POST /usuarios` | ✅ | ❌ |
| `GET /proveedores` | ✅ | ❌ |
| `POST /proveedores` | ✅ | ❌ |
| `GET /pedidos` | ✅ | ✅ |
| `POST /pedidos` | ✅ | ❌ |
| `PATCH /pedidos/{id}/estado` | ✅ | ❌ |
| `GET /materiales` | ✅ | ✅ |
| `POST /materiales/{id}/ingreso` | ✅ | ❌ |
| `POST /ajustes-inventario` | ✅ | ❌ |
| `GET /dashboard` | ✅ | ✅ |

---

### RNF-BD — Base de Datos y Transacciones

#### RNF-BD-01: PostgreSQL 16 como Motor Único

**Descripción:** El único motor de base de datos permitido es PostgreSQL 16 (`postgres:16-alpine`). No se permite SQLite, MySQL u otro motor en ningún entorno.

**Justificación:** Se requieren características exclusivas de PostgreSQL para la implementación:
- Stored Procedures con `LANGUAGE plpgsql` y `FOR UPDATE` (bloqueo pesimista).
- Tipo `JSONB` para campos de auditoría y configuración.
- Soporte a `UUID` como tipo de clave primaria alternativo.
- `pg_isready` para healthchecks de Docker.

---

#### RNF-BD-02: Stored Procedures para Operaciones Críticas de Inventario

**Descripción:** El descuento de inventario al confirmar producción **debe** implementarse como un Stored Procedure en PostgreSQL, ejecutado desde FastAPI mediante `CALL sp_nombre(params)` dentro de una sesión de SQLAlchemy.

**Motivación:** Prevenir condiciones de carrera cuando dos administradores confirman simultáneamente pedidos que comparten materiales de inventario. El bloqueo pesimista (`SELECT ... FOR UPDATE`) dentro del SP garantiza serialización de la operación.

**Prohibición:** Está prohibido implementar el descuento de inventario como una secuencia de `UPDATE` independientes desde Python sin transacción y bloqueo explícito.

---

#### RNF-BD-03: Migraciones con Alembic bajo Control de Versiones

**Descripción:** Cualquier cambio al esquema de la base de datos debe realizarse exclusivamente a través de una migración Alembic versionada y commiteada en el repositorio.

**Reglas:**
1. Ningún desarrollador puede ejecutar DDL (`CREATE TABLE`, `ALTER TABLE`, `DROP`) directamente en la base de datos sin la correspondiente migración.
2. Cada migración debe tener un nombre descriptivo: `alembic revision --autogenerate -m "agregar_tabla_ajustes_inventario"`.
3. Las migraciones deben ser reversibles (implementar la función `downgrade`).
4. El script de inicio del contenedor backend ejecuta `alembic upgrade head` antes de arrancar Uvicorn.

---

#### RNF-BD-04: Integridad Referencial y Borrado Lógico

**Descripción:** El esquema de base de datos debe definir:
- Llaves foráneas (`FOREIGN KEY`) con `ON DELETE RESTRICT` para prevenir huérfanos.
- Restricciones `CHECK` para valores enumerados (estados de pedido, roles, tipos de ajuste).
- Borrado lógico mediante campo `activo BOOLEAN NOT NULL DEFAULT TRUE` en entidades de negocio (usuarios, proveedores, materiales).
- Timestamps de auditoría: `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` y `updated_at TIMESTAMPTZ` en todas las tablas.

---

### RNF-PERF — Rendimiento

#### RNF-PERF-01: Tiempo de Respuesta en Consultas de Listados

**Descripción:** Las consultas de listado con paginación y filtros básicos (proveedores, pedidos, materiales) deben responder en menos de **3 segundos** bajo condiciones normales de operación (≤ 8 usuarios concurrentes, volumen ≤ 50,000 registros por tabla).

**Estrategias de cumplimiento:**
- Índices en columnas frecuentemente filtradas: `usuarios.email`, `proveedores.nit`, `pedidos.estado`, `materiales.activo`.
- Paginación obligatoria en todos los endpoints de listado (máximo 100 registros por página).
- Lazy loading de relaciones en SQLAlchemy (no `selectinload` indiscriminado).

---

#### RNF-PERF-02: Tiempo de Respuesta del Stored Procedure

**Descripción:** La ejecución del SP `sp_descontar_inventario` para un pedido con hasta 10 materiales en la receta debe completarse en menos de **2 segundos**.

---

### RNF-ARQ — Arquitectura

#### RNF-ARQ-01: Monolito en 3 Capas

**Descripción:** El sistema debe implementarse como un monolito en tres capas claramente separadas:

```
┌─────────────────────────────────────────────────────────┐
│                    CAPA 1: FRONTEND                      │
│         React 18 + React Router DOM + Axios              │
│         Componentes, Páginas, Hooks, Context             │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP/JSON (REST API)
┌─────────────────────────▼───────────────────────────────┐
│                    CAPA 2: BACKEND                       │
│              FastAPI + SQLAlchemy + Pydantic             │
│  ┌──────────┬──────────┬──────────┬──────────────────┐  │
│  │ Endpoints│ Schemas  │ Services │ Models (ORM)     │  │
│  │ (Router) │(Pydantic)│(Lógica)  │(SQLAlchemy)      │  │
│  └──────────┴──────────┴──────────┴──────────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │ SQL + CALL SP
┌─────────────────────────▼───────────────────────────────┐
│                    CAPA 3: BASE DE DATOS                 │
│               PostgreSQL 16 + Stored Procedures          │
│         Tablas, Índices, Constraints, Triggers           │
└─────────────────────────────────────────────────────────┘
```

**Estructura de directorios del backend:**
```
backend/app/
├── api/
│   └── v1/
│       ├── endpoints/
│       │   ├── auth.py
│       │   ├── usuarios.py
│       │   ├── proveedores.py
│       │   ├── pedidos.py
│       │   ├── materiales.py
│       │   └── ajustes.py
│       └── router.py
├── core/
│   ├── config.py        # Pydantic Settings
│   └── security.py      # JWT + bcrypt
├── db/
│   ├── base.py          # Base declarativa SQLAlchemy
│   └── session.py       # SessionLocal + engine
├── models/              # SQLAlchemy ORM models
├── schemas/             # Pydantic request/response schemas
├── services/            # Lógica de negocio desacoplada
└── main.py              # Instancia FastAPI + middleware + routers
```

---

#### RNF-ARQ-02: Validación de Datos con Pydantic v2

**Descripción:** Todos los datos de entrada a la API y de salida de la API deben ser validados por schemas Pydantic v2. Ningún endpoint puede retornar modelos SQLAlchemy directamente (evitar exposición de datos internos y campos sensibles como `password_hash`).

**Patrón obligatorio:**
```python
# Schema de entrada (request body)
class ProveedorCreate(BaseModel):
    nit: str = Field(..., min_length=1, max_length=20)
    nombre_empresa: str = Field(..., min_length=3, max_length=255)
    telefono: str = Field(..., pattern=r'^\d{7,15}$')

# Schema de salida (response)
class ProveedorResponse(BaseModel):
    id: int
    nit: str
    nombre_empresa: str
    activo: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

---

#### RNF-ARQ-03: Arquitectura BOM Genérica y Parametrizable

**Descripción:** El núcleo de producción del sistema debe implementarse como un **motor BOM (Bill of Materials) genérico**, donde los tipos de producto y sus recetas son datos configurables, no lógica hardcodeada.

**Tablas BOM del modelo de datos:**

| Tabla | Rol en el BOM | Parametrizable |
|-------|---------------|----------------|
| `tipos_caseton` | Catálogo de productos terminados | ✅ Agregar nuevos tipos sin cambios de código |
| `recetas` | Lista de materiales (BOM) por tipo de producto | ✅ N materiales por producto, cantidad configurable |
| `materiales` | Insumos o componentes del inventario | ✅ Cualquier material con unidad de medida arbitraria |
| `tipos_caseton.naturaleza` | Clasifica el comportamiento de inventario (`RECUPERABLE` / `PERDIDO`) | ✅ Extensible a otras naturalezas en v2.0 |

**Principio de extensión:** Para incorporar una nueva línea de producción (ej. fabricación de formaletas metálicas), solo se requiere:
1. Insertar el nuevo tipo en `tipos_caseton` con su `naturaleza`.
2. Insertar las filas correspondientes en `recetas` con las cantidades por unidad.
3. Verificar que los materiales requeridos existen en `materiales` (o crearlos).

**No se requiere** ningún cambio en los Stored Procedures, endpoints FastAPI, ni en el frontend para incorporar nuevos tipos de producto.

---

### RNF-CONT — Contenedorización

#### RNF-CONT-01: Docker Compose con Red Virtual Unificada

**Descripción:** Todos los servicios de la aplicación deben ejecutarse en contenedores Docker definidos en `docker-compose.yml` y comunicarse exclusivamente a través de la red virtual `casetech-network`. No se permite comunicación por IP expuesta del host entre servicios.

**Verificación:** El backend debe conectarse a PostgreSQL usando el nombre del servicio Docker (`db`) como hostname, no `localhost` ni IP fija.

---

#### RNF-CONT-02: Variables de Entorno para Configuración Sensible

**Descripción:** Ninguna credencial, clave secreta o URL de conexión puede estar hardcodeada en el código fuente. Todo dato de configuración sensible se lee desde variables de entorno usando `pydantic-settings`.

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    environment: str = "development"

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

---

## 3. Reglas de Negocio

| ID | Regla | Módulo |
|----|-------|--------|
| RN-01 | El NIT de un proveedor es inmutable una vez creado. | M1 |
| RN-02 | No se puede eliminar físicamente un proveedor con compras asociadas. | M1 |
| RN-03 | Un pedido en estado `COMPLETADO` o `CANCELADO` no puede cambiar de estado. | M2 |
| RN-04 | El descuento de inventario solo ocurre al pasar un pedido a `EN_PRODUCCION`, ejecutando el SP `sp_descontar_inventario`. | M2 |
| RN-05 | Si el stock de cualquier material de la receta es insuficiente, el pedido no puede iniciar producción y se muestra el material específico con déficit. | M2 |
| RN-06 | Todo ajuste de inventario de tipo MERMA, DEVOLUCION o CONTEO_FISICO requiere una justificación de mínimo 20 caracteres. | M3 |
| RN-07 | Solo el ADMINISTRADOR puede aprobar o rechazar ajustes de inventario. | M3 |
| RN-08 | El campo `stock_actual` de un material no puede ser negativo. El SP debe rechazar el descuento si resulta en saldo negativo. | M3 |
| RN-09 | Un ADMINISTRADOR no puede desactivarse a sí mismo si es el único ADMINISTRADOR activo en el sistema. | M0 |
| RN-10 | El stock mínimo de un material debe ser mayor que cero para activar alertas. | M3 |
| RN-11 | Los movimientos de inventario generados por pedidos de **Casetón de Icopor/EPS** (naturaleza `PERDIDO`) se registran como `DESCUENTO_PRODUCCION_DEFINITIVO` y **no pueden revertirse** bajo ningún escenario, incluyendo cancelación del pedido. | M2/M3 |
| RN-12 | Los movimientos de inventario generados por pedidos de **Casetón de Lona** o **Casetón de Guadua** (naturaleza `RECUPERABLE`) se registran como `DESCUENTO_PRODUCCION` y **pueden revertirse** si el ADMINISTRADOR cancela el pedido en producción y confirma la reversión. | M2/M3 |
| RN-13 | La tabla `tipos_caseton` debe contener el campo `naturaleza` con valor `RECUPERABLE` o `PERDIDO`. Este valor es inmutable una vez que el tipo de casetón tiene pedidos asociados. | M2 |

---

## 4. Matriz de Trazabilidad

| Requisito Funcional | Historia de Usuario | Módulo | Sprint |
|---------------------|---------------------|--------|--------|
| RF01 | HU01 — Login seguro | M0 | Sprint 1 |
| RF02 | HU02 — Gestión de usuarios | M0 | Sprint 1 |
| RF03 | HU03 — Registro de proveedor | M1 | Sprint 1 |
| RF04 | HU04 — Búsqueda de proveedores | M1 | Sprint 3 |
| RF05 | HU07 — Registro de pedido | M2 | Sprint 2 |
| RF06 | HU10 — Control de estados | M2 | Sprint 2 |
| RF07 | HU11 — Cálculo de receta | M2 | Sprint 2 |
| RF08 | HU08 — Descuento automático SP | M2 | Sprint 3 |
| RF09 | HU05 — Ver inventario | M3 | Sprint 3 |
| RF10 | HU09 — Ajustes de inventario | M3 | Sprint 3 |
| RF11 | HU13 — Alertas de stock | M3 | Sprint 3 |
| RF12 | HU06 — Reportes operativos | Transversal | Sprint 4 |
| RF13 | HU12 — Historial de movimientos | M3 | Sprint 4 |
| RF14 | HU14 — Dashboard KPIs | Transversal | Sprint 1 |
| RF15 | HU15 — Auditoría de acciones | M0 | Sprint 4 |

---

> **Documento revisado y aprobado por:** Andrés Fernández (Tech Lead)  
> **Próxima revisión:** Inicio del Sprint 2  
> **Documentos relacionados:** [`01-analisis-y-alcance.md`](./01-analisis-y-alcance.md) · [`03-historias-de-usuario.md`](./03-historias-de-usuario.md)
