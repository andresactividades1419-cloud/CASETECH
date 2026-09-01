"""
services/order_service.py — Lógica de negocio del módulo de Pedidos de Producción (HU07, HU08, HU11).

Convenciones:
- El Stored Procedure `sp_descontar_receta` se invoca con ``text()`` de SQLAlchemy.
- Los errores P0001 (stock insuficiente) del SP se capturan y se retornan como HTTP 422.
- La generación del código consecutivo usa un COUNT anual para evitar gaps visibles.
- Todas las funciones son ``async/await`` para compatibilidad con asyncpg.
"""

from datetime import date, datetime

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Material
from app.models.order import Order
from app.models.product_type import ProductType
from app.models.recipe import Recipe
from app.schemas.order import (
    OrderCreate,
    OrderListResponse,
    OrderRecipePreviewResponse,
    OrderResponse,
    OrderStatus,
    OrderStatusUpdate,
    RecipePreviewItem,
)
from app.schemas.product_type import ProductTypeListResponse, ProductTypeResponse

# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

async def _generate_codigo_pedido(db: AsyncSession) -> str:
    """
    Genera el código consecutivo del pedido con el formato PED-YYYY-XXXXX.

    Usa un COUNT del año en curso para calcular el siguiente número,
    garantizando unicidad incluso bajo alta concurrencia gracias al
    índice UNIQUE de la columna ``codigo_pedido``.

    Args:
        db: Sesión async de SQLAlchemy.

    Returns:
        Cadena con formato ``PED-2026-00042``.
    """
    year = datetime.now().year
    # Contar pedidos del año en curso como base del consecutivo
    result = await db.execute(
        select(func.count(Order.id)).where(
            Order.codigo_pedido.like(f"PED-{year}-%")
        )
    )
    count: int = result.scalar_one()
    return f"PED-{year}-{str(count + 1).zfill(5)}"


async def _get_order_orm(db: AsyncSession, order_id: int) -> Order:
    """
    Recupera el ORM de un pedido o lanza HTTP 404.

    Args:
        db:       Sesión async.
        order_id: PK del pedido.

    Raises:
        HTTPException 404: Si el pedido no existe.

    Returns:
        Instancia ORM del pedido.
    """
    result = await db.execute(select(Order).where(Order.id == order_id))
    order: Order | None = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido con id={order_id} no encontrado.",
        )
    return order


async def _enrich_order(db: AsyncSession, order: Order) -> OrderResponse:
    """
    Construye un OrderResponse enriquecido con el nombre del tipo de casetón.

    Args:
        db:    Sesión async.
        order: Instancia ORM del pedido.

    Returns:
        OrderResponse con campo ``tipo_caseton_nombre`` resuelto.
    """
    result = await db.execute(
        select(ProductType.nombre).where(ProductType.id == order.tipo_caseton_id)
    )
    tipo_nombre: str | None = result.scalar_one_or_none()

    response = OrderResponse.model_validate(order)
    response.tipo_caseton_nombre = tipo_nombre
    return response


# ---------------------------------------------------------------------------
# create_order — HU07: Registrar pedido de producción
# ---------------------------------------------------------------------------

async def create_order(
    db: AsyncSession,
    order_in: OrderCreate,
    user_id: int,
) -> OrderResponse:
    """
    Registra un nuevo pedido de producción con estado inicial 'PENDIENTE'.

    Pasos:
    1. Valida que el tipo de casetón exista y esté activo.
    2. Genera el código consecutivo anual (PED-YYYY-XXXXX).
    3. Inserta el pedido con ``creado_por = user_id``.
    4. Retorna el pedido enriquecido con el nombre del tipo de casetón.

    Args:
        db:       Sesión async de SQLAlchemy.
        order_in: Datos validados del nuevo pedido.
        user_id:  ID del usuario autenticado que registra el pedido.

    Raises:
        HTTPException 404: Si el tipo_caseton_id no existe o está inactivo.
        HTTPException 409: Si se genera colisión en el código (reintento automático).

    Returns:
        OrderResponse con el pedido recién creado.
    """
    # 1. Validar existencia y estado activo del tipo de casetón
    tipo_result = await db.execute(
        select(ProductType).where(
            and_(
                ProductType.id == order_in.tipo_caseton_id,
                ProductType.activo.is_(True),
            )
        )
    )
    tipo: ProductType | None = tipo_result.scalar_one_or_none()

    if tipo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Tipo de casetón con id={order_in.tipo_caseton_id} no encontrado "
                "o se encuentra inactivo. Verifique el catálogo de tipos."
            ),
        )

    # 2. Generar código consecutivo
    codigo = await _generate_codigo_pedido(db)

    # 3. Insertar pedido
    new_order = Order(
        codigo_pedido=codigo,
        cliente=order_in.cliente,
        tipo_caseton_id=order_in.tipo_caseton_id,
        cantidad=order_in.cantidad,
        estado=OrderStatus.PENDIENTE.value,
        fecha_entrega_estimada=order_in.fecha_entrega_estimada,
        creado_por=user_id,
        observaciones=order_in.observaciones,
    )
    db.add(new_order)

    try:
        await db.commit()
        await db.refresh(new_order)
    except Exception as exc:
        await db.rollback()
        # Colisión de código (carrera entre requests simultáneos)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Error al generar el código de pedido. Reintente la operación.",
        ) from exc

    return await _enrich_order(db, new_order)


# ---------------------------------------------------------------------------
# update_order_status — HU08/HU11: Máquina de estados + SP BOM
# ---------------------------------------------------------------------------

# Mapa de transiciones válidas de la máquina de estados
_VALID_TRANSITIONS: dict[str, set[str]] = {
    "PENDIENTE":     {"EN_PRODUCCION", "CANCELADO"},
    "EN_PRODUCCION": {"COMPLETADO", "CANCELADO"},
    "COMPLETADO":    set(),  # Estado terminal
    "CANCELADO":     set(),  # Estado terminal
}


async def update_order_status(
    db: AsyncSession,
    order_id: int,
    status_update: OrderStatusUpdate,
    user_id: int,
) -> OrderResponse:
    """
    Actualiza el estado del pedido aplicando la máquina de estados definida.

    Al transicionar de 'PENDIENTE' a 'EN_PRODUCCION':
    - Ejecuta ``CALL sp_descontar_receta(:pedido_id, :usuario_id)`` de forma
      transaccional con bloqueo pesimista (FOR UPDATE en el SP).
    - Si el SP lanza excepción P0001 (stock insuficiente), captura el mensaje
      descriptivo del déficit y retorna HTTP 422 con el detalle completo.

    Args:
        db:            Sesión async.
        order_id:      ID del pedido a actualizar.
        status_update: Nuevo estado solicitado.
        user_id:       ID del usuario que ejecuta el cambio de estado.

    Raises:
        HTTPException 404: Si el pedido no existe.
        HTTPException 422: Si la transición de estado no es válida.
        HTTPException 422: Si el SP falla por stock insuficiente (detalla el déficit).

    Returns:
        OrderResponse actualizado.
    """
    order = await _get_order_orm(db, order_id)
    current_status = order.estado
    new_status = status_update.estado.value

    # Validar transición en la máquina de estados
    allowed = _VALID_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"El pedido '{order.codigo_pedido}' se encuentra en estado "
                    f"'{current_status}' que es un estado terminal. "
                    "No puede modificarse."
                ),
            )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Transición de estado no válida: '{current_status}' → '{new_status}'. "
                f"Transiciones permitidas desde '{current_status}': {sorted(allowed)}."
            ),
        )

    # ─────────────────────────────────────────────────────────────
    # Transición especial: PENDIENTE → EN_PRODUCCION
    # Ejecuta el SP de descuento BOM de forma transaccional
    # ─────────────────────────────────────────────────────────────
    if current_status == "PENDIENTE" and new_status == "EN_PRODUCCION":
        bind = db.get_bind()
        is_sqlite = bind and bind.dialect.name == "sqlite"

        if is_sqlite:
            from app.models.stock_movement import StockMovement

            rec_query = (
                select(Recipe, Material)
                .join(Material, Material.id == Recipe.material_id)
                .where(Recipe.tipo_caseton_id == order.tipo_caseton_id)
                .order_by(Recipe.material_id)
            )
            rec_rows = (await db.execute(rec_query)).all()

            for recipe_item, material_item in rec_rows:
                consumo_total = float(recipe_item.cantidad_por_unidad) * float(order.cantidad)
                stock_act = float(material_item.stock_actual)
                if stock_act < consumo_total:
                    deficit = consumo_total - stock_act
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=(
                            f"No se puede iniciar la producción del pedido '{order.codigo_pedido}'. "
                            f"Stock insuficiente en inventario: Para '{material_item.nombre}' se requieren "
                            f"{consumo_total:.3f} {material_item.unidad_medida}, disponible {stock_act:.3f} "
                            f"{material_item.unidad_medida} (déficit: {deficit:.3f} {material_item.unidad_medida})."
                        ),
                    )

            for recipe_item, material_item in rec_rows:
                consumo_total = float(recipe_item.cantidad_por_unidad) * float(order.cantidad)
                stock_antes = float(material_item.stock_actual)
                stock_despues = stock_antes - consumo_total
                material_item.stock_actual = stock_despues

                mov = StockMovement(
                    material_id=material_item.id,
                    tipo_movimiento="DESCUENTO_PRODUCCION",
                    cantidad=consumo_total,
                    stock_antes=stock_antes,
                    stock_despues=stock_despues,
                    referencia_id=order.id,
                    referencia_tipo="PEDIDO",
                    ejecutado_por=user_id,
                )
                db.add(mov)

            order.estado = "EN_PRODUCCION"
            await db.commit()
            await db.refresh(order)
            return await _enrich_order(db, order)

        try:
            # El SP internamente hace FOR UPDATE en pedidos y materiales,
            # actualiza el estado a EN_PRODUCCION y registra movimientos.
            query = text("""
                CALL sp_descontar_receta(
                    CAST(:pedido_id AS BIGINT),
                    CAST(:usuario_id AS BIGINT)
                )
            """)
            await db.execute(
                query,
                {"pedido_id": int(order_id), "usuario_id": int(user_id)},
            )
            await db.commit()

        except DBAPIError as exc:
            await db.rollback()
            # Extraer el mensaje descriptivo del SP (déficit de material)
            raw_msg = str(exc.orig) if exc.orig else str(exc)

            # El SP usa ERRCODE P0001 para stock insuficiente
            is_stock_error = (
                "P0001" in raw_msg
                or "stock insuficiente" in raw_msg.lower()
                or "déficit" in raw_msg.lower()
                or "deficit" in raw_msg.lower()
                or "disponible" in raw_msg.lower()
            )
            if is_stock_error:
                # Limpiar el mensaje del SP para el cliente
                detail_msg = raw_msg.split("DETAIL:")[0].strip()
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        f"No se puede iniciar la producción del pedido '{order.codigo_pedido}'. "
                        f"Stock insuficiente en inventario: {detail_msg}"
                    ),
                ) from exc

            # El SP impide re-ejecutar en estado ≠ PENDIENTE
            if "no puede iniciar producción" in raw_msg.lower() or "P0001" in raw_msg:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=raw_msg.split("DETAIL:")[0].strip(),
                ) from exc

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al ejecutar el motor BOM: {raw_msg}",
            ) from exc

        # Refrescar para obtener el estado actualizado por el SP
        await db.refresh(order)
        return await _enrich_order(db, order)


    # ─────────────────────────────────────────────────────────────
    # Otras transiciones: actualización directa
    # ─────────────────────────────────────────────────────────────
    await db.execute(
        update(Order)
        .where(Order.id == order_id)
        .values(estado=new_status)
    )
    await db.commit()
    await db.refresh(order)
    return await _enrich_order(db, order)


# ---------------------------------------------------------------------------
# get_orders — Listado paginado con filtros
# ---------------------------------------------------------------------------

async def get_orders(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    estado: str | None = None,
    cliente: str | None = None,
    tipo_caseton_id: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
) -> OrderListResponse:
    """
    Retorna pedidos paginados con soporte de filtros múltiples.

    Args:
        db:              Sesión async.
        skip:            Offset de paginación.
        limit:           Máximo de registros por página (máx 200).
        estado:          Filtrar por estado exacto (PENDIENTE, EN_PRODUCCION, etc.).
        cliente:         Búsqueda parcial por nombre de cliente (case-insensitive).
        tipo_caseton_id: Filtrar por tipo de casetón específico.
        fecha_inicio:    Rango de fechas — inicio (basado en created_at).
        fecha_fin:       Rango de fechas — fin (basado en created_at).

    Returns:
        OrderListResponse con ``total``, ``skip``, ``limit`` e ``items``.
    """
    limit = min(limit, 200)

    base_query = select(Order)

    # Filtros acumulativos
    if estado:
        base_query = base_query.where(Order.estado == estado)

    if cliente:
        base_query = base_query.where(Order.cliente.ilike(f"%{cliente.strip()}%"))

    if tipo_caseton_id:
        base_query = base_query.where(Order.tipo_caseton_id == tipo_caseton_id)

    if fecha_inicio:
        base_query = base_query.where(Order.created_at >= datetime.combine(fecha_inicio, datetime.min.time()))

    if fecha_fin:
        base_query = base_query.where(Order.created_at <= datetime.combine(fecha_fin, datetime.max.time()))

    # Total sin paginación
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total: int = total_result.scalar_one()

    # Consulta paginada (más recientes primero)
    paginated = (
        base_query.order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = await db.execute(paginated)
    orders = rows.scalars().all()

    # Enriquecer con nombre del tipo de casetón
    items: list[OrderResponse] = []
    for order in orders:
        items.append(await _enrich_order(db, order))

    return OrderListResponse(total=total, skip=skip, limit=limit, items=items)


# ---------------------------------------------------------------------------
# get_order_by_id — Detalle completo
# ---------------------------------------------------------------------------

async def get_order_by_id(db: AsyncSession, order_id: int) -> OrderResponse:
    """
    Recupera el detalle completo de un pedido por su PK.

    Args:
        db:       Sesión async.
        order_id: PK del pedido.

    Raises:
        HTTPException 404: Si el pedido no existe.

    Returns:
        OrderResponse enriquecido con nombre del tipo de casetón.
    """
    order = await _get_order_orm(db, order_id)
    return await _enrich_order(db, order)


# ---------------------------------------------------------------------------
# get_product_types — Catálogo de tipos de casetón para el selector frontend
# ---------------------------------------------------------------------------

async def get_product_types(db: AsyncSession) -> ProductTypeListResponse:
    """
    Retorna todos los tipos de casetón activos para poblar el selector del frontend.

    Args:
        db: Sesión async.

    Returns:
        ProductTypeListResponse con la lista de tipos activos ordenados por nombre.
    """
    result = await db.execute(
        select(ProductType)
        .where(ProductType.activo.is_(True))
        .order_by(ProductType.nombre.asc())
    )
    types = result.scalars().all()

    return ProductTypeListResponse(
        total=len(types),
        items=[ProductTypeResponse.model_validate(t) for t in types],
    )


# ---------------------------------------------------------------------------
# get_order_recipe_preview — HU11: Previsualización de Consumo BOM
# ---------------------------------------------------------------------------

async def get_order_recipe_preview(
    db: AsyncSession, order_id: int
) -> OrderRecipePreviewResponse:
    """
    Calcula la explosión de materiales requerida para el pedido y determina
    si el stock en inventario es suficiente para iniciar producción.
    """
    order = await _get_order_orm(db, order_id)
    tipo_nombre = (
        await db.scalar(
            select(ProductType.nombre).where(ProductType.id == order.tipo_caseton_id)
        )
        or "Casetón"
    )

    query = (
        select(Recipe, Material)
        .join(Material, Material.id == Recipe.material_id)
        .where(Recipe.tipo_caseton_id == order.tipo_caseton_id)
        .order_by(Recipe.material_id)
    )
    rows = (await db.execute(query)).all()

    items: list[RecipePreviewItem] = []
    es_viable = True
    deficits: list[str] = []

    for recipe_item, material_item in rows:
        cant_por_unidad = float(recipe_item.cantidad_por_unidad)
        total_req = cant_por_unidad * float(order.cantidad)
        stock_actual = float(material_item.stock_actual)
        suficiente = stock_actual >= total_req
        deficit = max(0.0, total_req - stock_actual)

        if not suficiente:
            es_viable = False
            deficits.append(
                f"{material_item.nombre}: Requiere {total_req:.3f} {material_item.unidad_medida}, "
                f"disponible {stock_actual:.3f} {material_item.unidad_medida} (Déficit: {deficit:.3f} {material_item.unidad_medida})"
            )

        items.append(
            RecipePreviewItem(
                material_id=material_item.id,
                material_nombre=material_item.nombre,
                unidad_medida=material_item.unidad_medida,
                cantidad_por_unidad=cant_por_unidad,
                cantidad_total_requerida=total_req,
                stock_actual=stock_actual,
                suficiente=suficiente,
                deficit=deficit,
            )
        )

    return OrderRecipePreviewResponse(
        order_id=order.id,
        codigo_pedido=order.codigo_pedido,
        tipo_caseton_nombre=tipo_nombre,
        cantidad=order.cantidad,
        es_viable=es_viable,
        materiales=items,
        resumen_deficits=deficits,
    )

