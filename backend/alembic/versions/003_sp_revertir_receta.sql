-- =============================================================================
-- CASETECH ERP — sp_revertir_receta
-- Reversión atómica del descuento de materiales al cancelar un pedido que
-- ya estaba EN_PRODUCCION. La producción no se completó, así que los
-- materiales ya descontados por sp_descontar_receta no se perdieron y
-- deben volver al inventario.
-- =============================================================================

CREATE OR REPLACE PROCEDURE sp_revertir_receta(
    p_pedido_id  BIGINT,
    p_usuario_id BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_estado_actual VARCHAR(20);
    v_rec           RECORD;
    v_stock_actual  DECIMAL(12,3);
    v_cantidad      DECIMAL(12,3);
BEGIN
    -- ─────────────────────────────────────────────────
    -- 1. Obtener y bloquear el pedido (evita doble cancelación)
    -- ─────────────────────────────────────────────────
    SELECT estado INTO v_estado_actual
    FROM   pedidos
    WHERE  id = p_pedido_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido con ID % no encontrado.', p_pedido_id
        USING ERRCODE = 'P0002';
    END IF;

    IF v_estado_actual <> 'EN_PRODUCCION' THEN
        RAISE EXCEPTION
            'El pedido % no puede revertirse desde el estado "%". Solo pedidos EN_PRODUCCION pueden cancelarse con reversión de inventario.',
            p_pedido_id, v_estado_actual
        USING ERRCODE = 'P0001';
    END IF;

    -- ─────────────────────────────────────────────────
    -- 2. Recorrer los movimientos de descuento originales de este
    --    pedido y devolver exactamente esa cantidad, material a
    --    material en orden fijo (evita interbloqueos, igual que
    --    sp_descontar_receta)
    -- ─────────────────────────────────────────────────
    FOR v_rec IN
        SELECT
            material_id,
            SUM(cantidad) AS total_a_devolver
        FROM   movimientos_inventario
        WHERE  referencia_id = p_pedido_id
        AND    referencia_tipo = 'PEDIDO'
        AND    tipo_movimiento IN ('DESCUENTO_PRODUCCION', 'DESCUENTO_PRODUCCION_DEFINITIVO')
        GROUP BY material_id
        ORDER BY material_id
    LOOP
        v_cantidad := v_rec.total_a_devolver;

        -- Bloqueo pesimista del registro de inventario
        SELECT stock_actual INTO v_stock_actual
        FROM   materiales
        WHERE  id = v_rec.material_id
        FOR UPDATE;

        -- Aplicar la devolución
        UPDATE materiales
        SET    stock_actual = stock_actual + v_cantidad,
               updated_at   = NOW()
        WHERE  id = v_rec.material_id;

        -- Registrar movimiento con snapshot de stock
        INSERT INTO movimientos_inventario (
            material_id,        tipo_movimiento,          cantidad,
            stock_antes,        stock_despues,
            referencia_id,      referencia_tipo,          ejecutado_por
        )
        VALUES (
            v_rec.material_id,  'DEVOLUCION_CANCELACION', v_cantidad,
            v_stock_actual,     v_stock_actual + v_cantidad,
            p_pedido_id,        'PEDIDO',                 p_usuario_id
        );
    END LOOP;

    -- ─────────────────────────────────────────────────
    -- 3. Cambiar estado del pedido a CANCELADO
    -- ─────────────────────────────────────────────────
    UPDATE pedidos
    SET    estado     = 'CANCELADO',
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
            'estado_anterior', 'EN_PRODUCCION',
            'estado_nuevo',    'CANCELADO',
            'tipo_movimiento', 'DEVOLUCION_CANCELACION'
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;
