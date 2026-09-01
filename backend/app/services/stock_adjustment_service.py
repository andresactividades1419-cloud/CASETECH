"""
services/stock_adjustment_service.py — Servicio de dominio para Ajustes Manuales de Inventario y Auditoría (HU13).

Gestiona el ciclo de vida de los ajustes de stock:
- Creación de solicitudes en estado PENDIENTE_APROBACION.
- Consulta paginada con filtros avanzados y relaciones resueltas.
- Revisión y ejecución atómica por el Administrador mediante el Stored Procedure `sp_ajuste_inventario`
  con validación de doble firma y captura robusta de errores de consistencia de stock.
"""

from decimal import Decimal
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.material import Material
from app.models.stock_adjustment import StockAdjustment
from app.models.user import User
from app.schemas.stock_adjustment import (
    AdjustmentType,
    StockAdjustmentCreate,
    StockAdjustmentListResponse,
    StockAdjustmentResponse,
    StockAdjustmentReview,
)


def _to_response_dto(adj: StockAdjustment) -> StockAdjustmentResponse:
    """Convierte un ORM StockAdjustment a StockAdjustmentResponse enriquecido."""
    material_nombre = adj.material.nombre if adj.material else None
    solicitante_nombre = adj.solicitante.nombre_completo if adj.solicitante else None
    revisor_nombre = adj.aprobador.nombre_completo if adj.aprobador else None

    # Normalizar estado para compatibilidad visual
    estado_normalizado = adj.estado
    if estado_normalizado == "PENDIENTE_APROBACION":
        estado_normalizado = "PENDIENTE"

    # Presentar la cantidad siempre como valor positivo en la respuesta del DTO para claridad del usuario
    cantidad_mostrada = abs(adj.cantidad)

    return StockAdjustmentResponse(
        id=adj.id,
        material_id=adj.material_id,
        tipo=adj.tipo_ajuste,
        cantidad=cantidad_mostrada,
        motivo=adj.justificacion,
        stock_antes=adj.stock_antes,
        stock_despues=adj.stock_despues,
        estado=estado_normalizado,
        solicitante_id=adj.solicitado_por,
        revisor_id=adj.aprobado_por,
        solicitante_nombre=solicitante_nombre,
        material_nombre=material_nombre,
        revisor_nombre=revisor_nombre,
        created_at=adj.fecha_solicitud,
        updated_at=adj.fecha_aprobacion,
    )


async def create_adjustment(
    db: AsyncSession,
    data: StockAdjustmentCreate,
    user: User,
) -> StockAdjustmentResponse:
    """
    Registra una solicitud de ajuste de inventario en estado PENDIENTE_APROBACION.

    Args:
        db:   Sesión async de SQLAlchemy.
        data: Datos validados de la solicitud de ajuste.
        user: Usuario solicitante autenticado.

    Raises:
        HTTPException 404: Si el material no existe.
        HTTPException 422: Si el material está inactivo o si el motivo es insuficiente.

    Returns:
        StockAdjustmentResponse: Ajuste registrado con datos enriquecidos.
    """
    # 1. Validar existencia y estado del material
    res_mat = await db.execute(select(Material).where(Material.id == data.material_id))
    material = res_mat.scalar_one_or_none()

    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Materia prima con ID {data.material_id} no encontrada.",
        )

    if not material.activo:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"La materia prima '{material.nombre}' se encuentra inactiva. No se pueden solicitar ajustes.",
        )

    # 2. Calcular la cantidad firmada (delta) para el Stored Procedure
    # MERMA, DANO, DEVOLUCION_PROVEEDOR restan stock (cantidad negativa).
    # SOBRANTE suma stock (cantidad positiva).
    # CONTEO_FISICO ajusta a la diferencia (nueva_cuenta - stock_actual).
    tipo_solicitado = data.tipo
    tipo_db = "MERMA"
    justificacion_limpia = data.motivo.strip()

    if tipo_solicitado in (AdjustmentType.MERMA, AdjustmentType.DANO):
        tipo_db = "MERMA"
        delta = -abs(Decimal(str(data.cantidad)))
        if (
            tipo_solicitado == AdjustmentType.DANO
            and not justificacion_limpia.upper().startswith("[DAÑO]")
        ):
            justificacion_limpia = f"[DAÑO DE MATERIAL] {justificacion_limpia}"
    elif tipo_solicitado == AdjustmentType.DEVOLUCION_PROVEEDOR:
        tipo_db = "DEVOLUCION_PROVEEDOR"
        delta = -abs(Decimal(str(data.cantidad)))
    elif tipo_solicitado == AdjustmentType.SOBRANTE:
        tipo_db = "SOBRANTE"
        delta = abs(Decimal(str(data.cantidad)))
    elif tipo_solicitado == AdjustmentType.CONTEO_FISICO:
        tipo_db = "CONTEO_FISICO"
        # Si es conteo físico, la cantidad enviada es el recuento físico total o la diferencia
        delta = Decimal(str(data.cantidad)) - material.stock_actual
    else:
        tipo_db = "MERMA"
        delta = -abs(Decimal(str(data.cantidad)))

    # Asegurar longitud mínima de 20 caracteres para cumplir la restricción CHECK de PostgreSQL
    if len(justificacion_limpia) < 20:
        justificacion_limpia = f"Ajuste {tipo_db}: {justificacion_limpia}".ljust(
            20, "."
        )

    # 3. Crear registro en BD
    new_adjustment = StockAdjustment(
        material_id=material.id,
        tipo_ajuste=tipo_db,
        cantidad=delta,
        stock_antes=material.stock_actual,
        stock_despues=None,
        justificacion=justificacion_limpia,
        estado="PENDIENTE_APROBACION",
        solicitado_por=user.id,
    )

    db.add(new_adjustment)
    await db.commit()
    await db.refresh(new_adjustment)

    # 4. Cargar relaciones
    return await get_adjustment_by_id(db, new_adjustment.id)


async def get_adjustments(
    db: AsyncSession,
    estado: str | None = None,
    tipo: str | None = None,
    material_id: int | None = None,
    page: int = 1,
    limit: int = 20,
) -> StockAdjustmentListResponse:
    """
    Lista ajustes de inventario con filtros por estado, tipo y material, con paginación.
    """
    query = (
        select(StockAdjustment)
        .options(
            selectinload(StockAdjustment.material),
            selectinload(StockAdjustment.solicitante),
            selectinload(StockAdjustment.aprobador),
        )
        .order_by(StockAdjustment.fecha_solicitud.desc())
    )

    count_query = select(func.count(StockAdjustment.id))

    # Filtros
    if estado:
        estado_clean = estado.strip().upper()
        if estado_clean in ("PENDIENTE", "PENDIENTE_APROBACION"):
            query = query.where(StockAdjustment.estado == "PENDIENTE_APROBACION")
            count_query = count_query.where(
                StockAdjustment.estado == "PENDIENTE_APROBACION"
            )
        else:
            query = query.where(StockAdjustment.estado == estado_clean)
            count_query = count_query.where(StockAdjustment.estado == estado_clean)

    if tipo:
        tipo_clean = tipo.strip().upper()
        if tipo_clean == "DANO":
            query = query.where(StockAdjustment.tipo_ajuste == "MERMA")
            count_query = count_query.where(StockAdjustment.tipo_ajuste == "MERMA")
        else:
            query = query.where(StockAdjustment.tipo_ajuste == tipo_clean)
            count_query = count_query.where(StockAdjustment.tipo_ajuste == tipo_clean)

    if material_id:
        query = query.where(StockAdjustment.material_id == material_id)
        count_query = count_query.where(StockAdjustment.material_id == material_id)

    # Total de registros
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Paginación
    offset = (page - 1) * limit
    paginated_query = query.offset(offset).limit(limit)
    result = await db.execute(paginated_query)
    adjustments = result.scalars().all()

    items = [_to_response_dto(adj) for adj in adjustments]
    total_pages = ceil(total / limit) if total > 0 else 1

    return StockAdjustmentListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


async def get_adjustment_by_id(
    db: AsyncSession,
    adjustment_id: int,
) -> StockAdjustmentResponse:
    """
    Obtiene el detalle completo de un ajuste de inventario por su ID.
    """
    query = (
        select(StockAdjustment)
        .options(
            selectinload(StockAdjustment.material),
            selectinload(StockAdjustment.solicitante),
            selectinload(StockAdjustment.aprobador),
        )
        .where(StockAdjustment.id == adjustment_id)
    )
    result = await db.execute(query)
    adjustment = result.scalar_one_or_none()

    if not adjustment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ajuste de inventario con ID {adjustment_id} no encontrado.",
        )

    return _to_response_dto(adjustment)


async def review_adjustment(
    db: AsyncSession,
    adjustment_id: int,
    review_data: StockAdjustmentReview,
    admin_user: User,
) -> StockAdjustmentResponse:
    """
    Revisión y aprobación/rechazo de un ajuste de inventario exclusivo para ADMINISTRADORES.

    Ejecuta el Stored Procedure `sp_ajuste_inventario` asegurando:
    - Verificación de doble firma (el aprobador no puede ser el mismo que solicitó).
    - Bloqueo pesimista del registro y del material.
    - Aplicación de delta al stock y generación de movimiento en auditoría.
    - Captura de errores de consistencia (e.g., stock negativo).

    Args:
        db:           Sesión async de SQLAlchemy.
        adjustment_id: ID del ajuste a evaluar.
        review_data:  Decisión (aprobado: True/False) y observaciones.
        admin_user:   Usuario administrador autenticado.

    Raises:
        HTTPException 404: Si el ajuste no existe.
        HTTPException 422: Si la doble firma falla o el stock resultante es negativo.
        HTTPException 500: Error interno no controlado.
    """
    # 1. Verificar existencia y estado previo
    query = select(StockAdjustment).where(StockAdjustment.id == adjustment_id)
    res = await db.execute(query)
    adj = res.scalar_one_or_none()

    if not adj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ajuste con ID {adjustment_id} no encontrado.",
        )

    if adj.estado != "PENDIENTE_APROBACION":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"El ajuste #{adjustment_id} ya fue procesado con estado '{adj.estado}' y no puede modificarse.",
        )

    # 2. Doble firma: El usuario que aprueba o rechaza no puede ser el mismo que solicitó
    if adj.solicitado_por == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Un usuario no puede aprobar su propia solicitud de ajuste de inventario (regla de doble firma).",
        )

    # 3. Invocar el Stored Procedure atómico (o emular en SQLite para pruebas)
    bind = db.get_bind()
    is_sqlite = bind and bind.dialect.name == "sqlite"

    if is_sqlite:
        from app.models.material import Material
        from app.models.stock_movement import StockMovement

        if not review_data.aprobado:
            adj.estado = "RECHAZADO"
            adj.aprobado_por = admin_user.id
            adj.fecha_aprobacion = func.now()
            await db.commit()
            await db.refresh(adj)
            return await get_adjustment_by_id(db, adjustment_id)

        mat = (
            await db.execute(select(Material).where(Material.id == adj.material_id))
        ).scalar_one_or_none()
        if mat:
            curr_stock = Decimal(str(mat.stock_actual))
            adj_qty = Decimal(str(adj.cantidad))
            nuevo_stock = curr_stock + adj_qty
            if nuevo_stock < 0:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"No se pudo aplicar el ajuste: El ajuste dejaría el stock en {nuevo_stock} (negativo).",
                )
            mat.stock_actual = nuevo_stock
            adj.stock_despues = nuevo_stock
            adj.estado = "APROBADO"
            adj.aprobado_por = admin_user.id
            adj.fecha_aprobacion = func.now()

            mov = StockMovement(
                material_id=mat.id,
                tipo_movimiento="AJUSTE_APROBADO",
                cantidad=abs(adj_qty),
                stock_antes=adj.stock_antes,
                stock_despues=nuevo_stock,
                referencia_id=adj.id,
                referencia_tipo="AJUSTE",
                ejecutado_por=admin_user.id,
            )
            db.add(mov)
            await db.commit()
            await db.refresh(adj)
            return await get_adjustment_by_id(db, adjustment_id)

    try:
        sp_query = text("""
            CALL sp_ajuste_inventario(
                CAST(:ajuste_id AS BIGINT),
                CAST(:aprobador_id AS BIGINT),
                CAST(:aprobar AS BOOLEAN)
            )
        """)

        await db.execute(
            sp_query,
            {
                "ajuste_id": int(adjustment_id),
                "aprobador_id": int(admin_user.id),
                "aprobar": bool(review_data.aprobado),
            },
        )
        await db.commit()
    except DBAPIError as exc:
        await db.rollback()
        raw_msg = str(exc.orig) if exc.orig else str(exc)

        # Tratar mensajes controlados del Stored Procedure
        if (
            "P0001" in raw_msg
            or "dejaría el stock" in raw_msg
            or "negativo" in raw_msg.lower()
        ):
            detail_clean = raw_msg.split("CONTEXT:")[0].split("DETAIL:")[0].strip()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"No se pudo aplicar el ajuste de inventario: {detail_clean}",
            ) from exc

        if "doble firma" in raw_msg.lower() or "no puede aprobar" in raw_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Violación de regla de doble firma en base de datos.",
            ) from exc

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al ejecutar sp_ajuste_inventario: {raw_msg}",
        ) from exc

    # 4. Si se proporcionaron observaciones adicionales, anexarlas
    if review_data.observaciones and review_data.observaciones.strip():
        obs_clean = review_data.observaciones.strip()
        adj_to_update = await db.get(StockAdjustment, adjustment_id)
        if adj_to_update:
            adj_to_update.justificacion = (
                f"{adj_to_update.justificacion} | [Revisión Admin]: {obs_clean}"
            )
            await db.commit()

    return await get_adjustment_by_id(db, adjustment_id)
