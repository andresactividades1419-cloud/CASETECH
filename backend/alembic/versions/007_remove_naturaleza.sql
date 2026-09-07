-- =============================================================================
-- CASETECH ERP — Issue #78: eliminar la distinción RECUPERABLE/PERDIDO
-- Los casetones se venden, no se alquilan, así que ninguno vuelve a la
-- fábrica — la distinción no tenía sustento real en el negocio.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_descontar_receta — versión sin ramificación por naturaleza.
-- Siempre registra 'DESCUENTO_PRODUCCION'. Los movimientos históricos ya
-- guardados como 'DESCUENTO_PRODUCCION_DEFINITIVO' no se tocan ni se
-- migran — siguen siendo válidos según el CHECK constraint existente, solo
-- deja de generarse hacia adelante.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_descontar_receta(
    p_pedido_id  BIGINT,
    p_usuario_id BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_tipo_caseton_id BIGINT;
    v_cantidad_pedido INTEGER;
    v_estado_actual   VARCHAR(20);
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
    -- 2. Iterar sobre la receta BOM con bloqueo por material
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
            material_id,        tipo_movimiento,       cantidad,
            stock_antes,        stock_despues,
            referencia_id,      referencia_tipo,       ejecutado_por
        )
        VALUES (
            v_rec.material_id,  'DESCUENTO_PRODUCCION', v_consumo_total,
            v_stock_actual,     v_stock_actual - v_consumo_total,
            p_pedido_id,        'PEDIDO',               p_usuario_id
        );
    END LOOP;

    -- ─────────────────────────────────────────────────
    -- 3. Cambiar estado del pedido a EN_PRODUCCION
    -- ─────────────────────────────────────────────────
    UPDATE pedidos
    SET    estado     = 'EN_PRODUCCION',
           updated_at = NOW()
    WHERE  id = p_pedido_id;

    -- 4. Registrar en auditoría
    INSERT INTO auditoria_acciones (
        usuario_id, accion, entidad, entidad_id, payload_despues
    )
    VALUES (
        p_usuario_id,
        'CAMBIO_ESTADO_PEDIDO',
        'pedidos',
        p_pedido_id,
        jsonb_build_object(
            'estado_anterior', 'PENDIENTE',
            'estado_nuevo',    'EN_PRODUCCION',
            'tipo_movimiento', 'DESCUENTO_PRODUCCION'
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;
