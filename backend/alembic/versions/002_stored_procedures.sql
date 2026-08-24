-- =============================================================================
-- CASETECH ERP — Stored Procedures Transaccionales en PostgreSQL 16
-- Definición completa de lógica de negocio en BD según docs/04-modelo-datos.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. sp_crear_proveedor
-- Inserción segura con validación de unicidad de NIT y auditoría
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_crear_proveedor(
    p_nit               VARCHAR(20),
    p_nombre_empresa    VARCHAR(255),
    p_contacto_nombre   VARCHAR(255),
    p_contacto_telefono VARCHAR(20),
    p_contacto_email    VARCHAR(255),
    p_direccion         TEXT,
    p_usuario_id        BIGINT,
    OUT p_proveedor_id  BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_existe BOOLEAN;
BEGIN
    -- 1. Validar unicidad del NIT (case-insensitive)
    SELECT EXISTS (
        SELECT 1 FROM proveedores WHERE UPPER(nit) = UPPER(TRIM(p_nit))
    ) INTO v_existe;

    IF v_existe THEN
        RAISE EXCEPTION
            'Ya existe un proveedor registrado con el NIT "%". El NIT es un identificador único e inmutable.',
            UPPER(TRIM(p_nit))
        USING ERRCODE = '23505';  -- unique_violation
    END IF;

    -- 2. Insertar normalizando datos
    INSERT INTO proveedores (
        nit,
        nombre_empresa,
        contacto_nombre,
        contacto_telefono,
        contacto_email,
        direccion
    )
    VALUES (
        UPPER(TRIM(p_nit)),
        TRIM(p_nombre_empresa),
        TRIM(p_contacto_nombre),
        TRIM(p_contacto_telefono),
        LOWER(TRIM(p_contacto_email)),
        p_direccion
    )
    RETURNING id INTO p_proveedor_id;

    -- 3. Registrar en auditoría
    INSERT INTO auditoria_acciones (
        usuario_id,
        accion,
        entidad,
        entidad_id,
        payload_despues
    )
    VALUES (
        p_usuario_id,
        'CREAR_PROVEEDOR',
        'proveedores',
        p_proveedor_id,
        jsonb_build_object(
            'nit',            UPPER(TRIM(p_nit)),
            'nombre_empresa', TRIM(p_nombre_empresa)
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE;  -- Re-lanzar excepción para rollback automático
END;
$$;


-- -----------------------------------------------------------------------------
-- 2. sp_descontar_receta
-- Descuento atómico de materias primas por receta BOM con bloqueo pesimista
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_descontar_receta(
    p_pedido_id  BIGINT,
    p_usuario_id BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_tipo_caseton_id BIGINT;
    v_naturaleza      VARCHAR(20);
    v_cantidad_pedido INTEGER;
    v_estado_actual   VARCHAR(20);
    v_tipo_mov        VARCHAR(40);
    v_rec             RECORD;
    v_stock_actual    DECIMAL(12,3);
    v_consumo_total   DECIMAL(12,3);
BEGIN
    -- ─────────────────────────────────────────────────
    -- 1. Obtener y bloquear el pedido (evita doble confirmación)
    -- ─────────────────────────────────────────────────
    SELECT estado, tipo_caseton_id, cantidad
    INTO   v_estado_actual, v_tipo_caseton_id, v_cantidad_pedido
    FROM   pedidos
    WHERE  id = p_pedido_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido con ID % no encontrado.', p_pedido_id
        USING ERRCODE = 'P0002';
    END IF;

    IF v_estado_actual <> 'PENDIENTE' THEN
        RAISE EXCEPTION
            'El pedido % no puede iniciar producción desde el estado "%". Solo pedidos en estado PENDIENTE pueden iniciarse.',
            p_pedido_id, v_estado_actual
        USING ERRCODE = 'P0001';
    END IF;

    -- ─────────────────────────────────────────────────
    -- 2. Determinar naturaleza y tipo de movimiento
    -- ─────────────────────────────────────────────────
    SELECT naturaleza INTO v_naturaleza
    FROM   tipos_caseton
    WHERE  id = v_tipo_caseton_id;

    IF v_naturaleza = 'PERDIDO' THEN
        v_tipo_mov := 'DESCUENTO_PRODUCCION_DEFINITIVO';
    ELSE
        v_tipo_mov := 'DESCUENTO_PRODUCCION';
    END IF;

    -- ─────────────────────────────────────────────────
    -- 3. Iterar sobre la receta BOM con bloqueo por material
    --    ORDER BY material_id garantiza orden consistente
    --    entre sesiones concurrentes (previene deadlocks)
    -- ─────────────────────────────────────────────────
    FOR v_rec IN
        SELECT
            r.material_id,
            m.nombre                                  AS nombre_material,
            m.unidad_medida,
            r.cantidad_por_unidad * v_cantidad_pedido AS consumo_total
        FROM  recetas r
        JOIN  materiales m ON m.id = r.material_id
        WHERE r.tipo_caseton_id = v_tipo_caseton_id
        ORDER BY r.material_id
    LOOP
        v_consumo_total := v_rec.consumo_total;

        -- Bloqueo pesimista del registro de inventario
        SELECT stock_actual INTO v_stock_actual
        FROM   materiales
        WHERE  id = v_rec.material_id
        FOR UPDATE;

        -- Validar suficiencia antes de descontar
        IF v_stock_actual < v_consumo_total THEN
            RAISE EXCEPTION
                'Stock insuficiente para "%". Disponible: % %s — Requerido: % %s — Déficit: % %s.',
                v_rec.nombre_material,
                v_stock_actual,  v_rec.unidad_medida,
                v_consumo_total, v_rec.unidad_medida,
                (v_consumo_total - v_stock_actual), v_rec.unidad_medida
            USING ERRCODE = 'P0001';
        END IF;

        -- Aplicar el descuento
        UPDATE materiales
        SET    stock_actual = stock_actual - v_consumo_total,
               updated_at   = NOW()
        WHERE  id = v_rec.material_id;

        -- Registrar movimiento con snapshot de stock
        INSERT INTO movimientos_inventario (
            material_id,        tipo_movimiento,  cantidad,
            stock_antes,        stock_despues,
            referencia_id,      referencia_tipo,  ejecutado_por
        )
        VALUES (
            v_rec.material_id,  v_tipo_mov,       v_consumo_total,
            v_stock_actual,     v_stock_actual - v_consumo_total,
            p_pedido_id,        'PEDIDO',          p_usuario_id
        );
    END LOOP;

    -- ─────────────────────────────────────────────────
    -- 4. Cambiar estado del pedido a EN_PRODUCCION
    -- ─────────────────────────────────────────────────
    UPDATE pedidos
    SET    estado     = 'EN_PRODUCCION',
           updated_at = NOW()
    WHERE  id = p_pedido_id;

    -- 5. Registrar en auditoría
    INSERT INTO auditoria_acciones (
        usuario_id, accion, entidad, entidad_id, payload_despues
    )
    VALUES (
        p_usuario_id,
        'CAMBIO_ESTADO_PEDIDO',
        'pedidos',
        p_pedido_id,
        jsonb_build_object(
            'estado_anterior',    'PENDIENTE',
            'estado_nuevo',       'EN_PRODUCCION',
            'naturaleza_caseton', v_naturaleza,
            'tipo_movimiento',    v_tipo_mov
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;


-- -----------------------------------------------------------------------------
-- 3. sp_ajuste_inventario
-- Aprobación / Rechazo de ajuste manual de inventario con doble firma
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_ajuste_inventario(
    p_ajuste_id BIGINT,
    p_aprobador BIGINT,
    p_aprobar   BOOLEAN   -- TRUE: aprobar y aplicar | FALSE: rechazar sin modificar stock
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_ajuste       RECORD;
    v_stock_actual DECIMAL(12,3);
    v_stock_nuevo  DECIMAL(12,3);
BEGIN
    -- ─────────────────────────────────────────────────
    -- 1. Obtener y bloquear el ajuste
    -- ─────────────────────────────────────────────────
    SELECT * INTO v_ajuste
    FROM   ajustes_inventario
    WHERE  id = p_ajuste_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ajuste con ID % no encontrado.', p_ajuste_id
        USING ERRCODE = 'P0002';
    END IF;

    IF v_ajuste.estado <> 'PENDIENTE_APROBACION' THEN
        RAISE EXCEPTION
            'El ajuste % ya fue procesado (estado: %). No puede modificarse.',
            p_ajuste_id, v_ajuste.estado
        USING ERRCODE = 'P0001';
    END IF;

    -- Doble firma: el aprobador no puede ser el solicitante
    IF v_ajuste.solicitado_por = p_aprobador THEN
        RAISE EXCEPTION
            'El usuario (ID: %) no puede aprobar un ajuste que él mismo solicitó.',
            p_aprobador
        USING ERRCODE = 'P0001';
    END IF;

    -- ─────────────────────────────────────────────────
    -- 2. RECHAZO: solo actualizar estado, sin tocar stock
    -- ─────────────────────────────────────────────────
    IF NOT p_aprobar THEN
        UPDATE ajustes_inventario
        SET    estado           = 'RECHAZADO',
               aprobado_por     = p_aprobador,
               fecha_aprobacion = NOW()
        WHERE  id = p_ajuste_id;

        INSERT INTO auditoria_acciones (usuario_id, accion, entidad, entidad_id)
        VALUES (p_aprobador, 'RECHAZAR_AJUSTE', 'ajustes_inventario', p_ajuste_id);

        RETURN;  -- Salir sin modificar inventario
    END IF;

    -- ─────────────────────────────────────────────────
    -- 3. APROBACIÓN: bloquear material y aplicar cambio
    -- ─────────────────────────────────────────────────
    SELECT stock_actual INTO v_stock_actual
    FROM   materiales
    WHERE  id = v_ajuste.material_id
    FOR UPDATE;

    -- cantidad es negativa para MERMA/DEVOLUCION, positiva para SOBRANTE
    v_stock_nuevo := v_stock_actual + v_ajuste.cantidad;

    IF v_stock_nuevo < 0 THEN
        RAISE EXCEPTION
            'El ajuste de % unidades dejaría el stock del material ID % en % (negativo). Operación rechazada.',
            v_ajuste.cantidad, v_ajuste.material_id, v_stock_nuevo
        USING ERRCODE = 'P0001';
    END IF;

    -- Aplicar el cambio de stock
    UPDATE materiales
    SET    stock_actual = v_stock_nuevo,
               updated_at   = NOW()
        WHERE  id = v_ajuste.material_id;

    -- Actualizar el ajuste con resultado
    UPDATE ajustes_inventario
    SET    estado           = 'APROBADO',
           aprobado_por     = p_aprobador,
           stock_despues    = v_stock_nuevo,
           fecha_aprobacion = NOW()
    WHERE  id = p_ajuste_id;

    -- Registrar el movimiento de inventario
    INSERT INTO movimientos_inventario (
        material_id,           tipo_movimiento,  cantidad,
        stock_antes,           stock_despues,
        referencia_id,         referencia_tipo,  ejecutado_por
    )
    VALUES (
        v_ajuste.material_id,  'AJUSTE_APROBADO', v_ajuste.cantidad,
        v_stock_actual,        v_stock_nuevo,
        p_ajuste_id,           'AJUSTE',          p_aprobador
    );

    -- Registrar en auditoría con snapshots antes/después
    INSERT INTO auditoria_acciones (
        usuario_id,  accion,          entidad,
        entidad_id,  payload_antes,   payload_despues
    )
    VALUES (
        p_aprobador,
        'APROBAR_AJUSTE',
        'ajustes_inventario',
        p_ajuste_id,
        jsonb_build_object(
            'stock_antes',  v_stock_actual,
            'tipo_ajuste',  v_ajuste.tipo_ajuste
        ),
        jsonb_build_object(
            'stock_despues',      v_stock_nuevo,
            'cantidad_ajustada',  v_ajuste.cantidad
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;
