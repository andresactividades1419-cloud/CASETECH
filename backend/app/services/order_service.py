"""
services/order_service.py — Lógica de negocio del módulo de Pedidos de Producción (HU07, HU08, HU11).

Convenciones:
- El Stored Procedure `sp_descontar_receta` se invoca con ``text()`` de SQLAlchemy.
- Los errores P0001 (stock insuficiente) del SP se capturan y se retornan como HTTP 422.
- La generación del código consecutivo usa un COUNT anual para evitar gaps visibles.
- Todas las funciones son ``async/await`` para compatibilidad con asyncpg.
"""

from datetime import date, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Material
from app.models.order import Order
from app.models.product_type import ProductType
from app.models.recipe import Recipe
from app.models.stock_movement import StockMovement
from app.schemas.order import (
    OrderCreate,
    OrderListResponse,
    OrderRecipePreviewResponse,
    OrderResponse,
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
    """
    year = datetime.now().year
    result = await db.execute(
        select(func.count(Order.id)).where(Order.codigo_pedido.like(f"PED-{year}-%"))
    )
    count: int = result.scalar_one()
    return f"PED-{year}-{str(count + 1).zfill(5)}"


async def _get_order_orm(db: AsyncSession, order_id: int) -> Order:
    """Recupera la instancia ORM de un pedido o lanza HTTP 404."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pedido con ID {order_id} no encontrado.",
        )
    return order


async def _enrich_order(db: AsyncSession, order: Order) -> OrderResponse:
    """Enriquece una instancia de Order con el nombre del tipo de casetón."""
    tipo_res = await db.execute(
        select(ProductType.nombre).where(ProductType.id == order.tipo_caseton_id)
    )
    tipo_nombre = tipo_res.scalar_one_or_none() or "Casetón"
    order_dict = {
        "id": order.id,
        "codigo_pedido": order.codigo_pedido,
        "cliente": order.cliente,
        "tipo_caseton_id": order.tipo_caseton_id,
        "tipo_caseton_nombre": tipo_nombre,
        "cantidad": order.cantidad,
        "fecha_entrega_estimada": order.fecha_entrega_estimada,
        "observaciones": order.observaciones,
        "estado": order.estado,
        "creado_por": order.creado_por,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
    }
    return OrderResponse(**order_dict)


# ---------------------------------------------------------------------------
# create_order — Creación de pedidos
# ---------------------------------------------------------------------------


async def create_order(
    db: AsyncSession,
    order_in: OrderCreate,
    user_id: int,
) -> OrderResponse:
    # 1. Validar que el tipo de casetón exista y esté activo
    tipo_res = await db.execute(
        select(ProductType).where(
            and_(
                ProductType.id == order_in.tipo_caseton_id,
                ProductType.activo.is_(True),
            )
        )
    )
    tipo = tipo_res.scalar_one_or_none()
    if not tipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El tipo de casetón con ID {order_in.tipo_caseton_id} no existe o está inactivo.",
        )

    # 2. Generar código consecutivo único
    codigo_pedido = await _generate_codigo_pedido(db)

    # 3. Crear pedido en estado PENDIENTE
    order = Order(
        codigo_pedido=codigo_pedido,
        cliente=order_in.cliente,
        tipo_caseton_id=order_in.tipo_caseton_id,
        cantidad=order_in.cantidad,
        fecha_entrega_estimada=order_in.fecha_entrega_estimada,
        observaciones=order_in.observaciones,
        estado="PENDIENTE",
        creado_por=user_id,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    return await _enrich_order(db, order)


# ---------------------------------------------------------------------------
# update_order_status — Transiciones de estado y motor BOM
# ---------------------------------------------------------------------------

VALID_TRANSITIONS: dict[str, set[str]] = {
    "PENDIENTE": {"EN_PRODUCCION", "CANCELADO"},
    "EN_PRODUCCION": {"COMPLETADO", "CANCELADO"},
    "COMPLETADO": set(),
    "CANCELADO": set(),
}


async def update_order_status(
    db: AsyncSession,
    order_id: int,
    status_update: OrderStatusUpdate,
    user_id: int,
) -> OrderResponse:
    order = await _get_order_orm(db, order_id)
    current_status = order.estado
    new_status = (
        status_update.estado.value
        if hasattr(status_update.estado, "value")
        else str(status_update.estado)
    )

    # Transición idéntica: idempotente
    if current_status == new_status:
        return await _enrich_order(db, order)

    allowed = VALID_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"El pedido '{order.codigo_pedido}' se encuentra en estado terminal '{current_status}'. "
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
    # Ejecuta el descuento BOM de forma transaccional
    # ─────────────────────────────────────────────────────────────
    if current_status == "PENDIENTE" and new_status == "EN_PRODUCCION":
        bind = db.get_bind()
        is_sqlite = bind and bind.dialect.name == "sqlite"

        if is_sqlite:
            rec_query = (
                select(Recipe, Material)
                .join(Material, Material.id == Recipe.material_id)
                .where(Recipe.tipo_caseton_id == order.tipo_caseton_id)
                .order_by(Recipe.material_id)
            )
            rec_rows = (await db.execute(rec_query)).all()

            for recipe_item, material_item in rec_rows:
                consumo_total = float(recipe_item.cantidad_por_unidad) * float(
                    order.cantidad
                )
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
                consumo_total = float(recipe_item.cantidad_por_unidad) * float(
                    order.cantidad
                )
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
            # En PostgreSQL: ejecuta el Stored Procedure transaccional con FOR UPDATE
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
            raw_msg = str(exc.orig) if exc.orig else str(exc)

            is_stock_error = (
                "P0001" in raw_msg
                or "stock insuficiente" in raw_msg.lower()
                or "déficit" in raw_msg.lower()
                or "deficit" in raw_msg.lower()
                or "disponible" in raw_msg.lower()
            )
            if is_stock_error:
                detail_msg = raw_msg.split("DETAIL:")[0].strip()
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        f"No se puede iniciar la producción del pedido '{order.codigo_pedido}'. "
                        f"Stock insuficiente en inventario: {detail_msg}"
                    ),
                ) from exc

            if "no puede iniciar producción" in raw_msg.lower() or "P0001" in raw_msg:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=raw_msg.split("DETAIL:")[0].strip(),
                ) from exc

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al ejecutar el motor BOM: {raw_msg}",
            ) from exc

        await db.refresh(order)
        return await _enrich_order(db, order)

    # Otras transiciones directas
    await db.execute(
        update(Order).where(Order.id == order_id).values(estado=new_status)
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
    base_query = select(Order)

    if estado:
        base_query = base_query.where(Order.estado == estado.upper())
    if cliente:
        base_query = base_query.where(Order.cliente.ilike(f"%{cliente.strip()}%"))
    if tipo_caseton_id:
        base_query = base_query.where(Order.tipo_caseton_id == tipo_caseton_id)
    if fecha_inicio:
        base_query = base_query.where(
            Order.created_at >= datetime.combine(fecha_inicio, datetime.min.time())
        )
    if fecha_fin:
        base_query = base_query.where(
            Order.created_at <= datetime.combine(fecha_fin, datetime.max.time())
        )

    count_query = select(func.count()).select_from(base_query.subquery())
    total: int = (await db.execute(count_query)).scalar_one()

    paginated = base_query.order_by(Order.created_at.desc()).offset(skip).limit(limit)
    rows = await db.execute(paginated)
    orders = rows.scalars().all()

    items: list[OrderResponse] = []
    for order in orders:
        items.append(await _enrich_order(db, order))

    return OrderListResponse(total=total, skip=skip, limit=limit, items=items)


# ---------------------------------------------------------------------------
# get_order_by_id — Detalle completo
# ---------------------------------------------------------------------------


async def get_order_by_id(db: AsyncSession, order_id: int) -> OrderResponse:
    order = await _get_order_orm(db, order_id)
    return await _enrich_order(db, order)


# ---------------------------------------------------------------------------
# get_product_types — Catálogo de tipos de casetón
# ---------------------------------------------------------------------------


async def get_product_types(db: AsyncSession) -> ProductTypeListResponse:
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
# preview_order_recipe — HU11: Explosión y Previsualización de Consumo BOM
# ---------------------------------------------------------------------------


async def preview_order_recipe(
    db: AsyncSession,
    order_id: int,
) -> OrderRecipePreviewResponse:
    """
    Calcula la explosión de materiales requeridos para un pedido específico
    y los contrasta con el stock disponible en bodega para determinar viabilidad y déficits.

    Args:
        db:       Sesión async de SQLAlchemy.
        order_id: ID del pedido a consultar.

    Raises:
        HTTPException 404: Si el pedido o el tipo de casetón no existen.

    Returns:
        OrderRecipePreviewResponse con el detalle por material, viabilidad y resumen de déficits.
    """
    order = await _get_order_orm(db, order_id)

    tipo_res = await db.execute(
        select(ProductType).where(ProductType.id == order.tipo_caseton_id)
    )
    tipo: ProductType | None = tipo_res.scalar_one_or_none()
    tipo_nombre = tipo.nombre if tipo else f"Tipo #{order.tipo_caseton_id}"

    query = (
        select(Recipe, Material)
        .join(Material, Material.id == Recipe.material_id)
        .where(Recipe.tipo_caseton_id == order.tipo_caseton_id)
        .order_by(Recipe.material_id.asc())
    )
    rows = (await db.execute(query)).all()

    items: list[RecipePreviewItem] = []
    resumen_deficits: list[str] = []
    es_viable = True

    cantidad_casetones = int(order.cantidad)

    for recipe_row, material_row in rows:
        cant_por_unidad = float(recipe_row.cantidad_por_unidad)
        total_req = round(cant_por_unidad * cantidad_casetones, 4)
        stock_act = float(material_row.stock_actual)

        suficiente = stock_act >= total_req
        deficit = 0.0

        if not suficiente:
            es_viable = False
            deficit = round(total_req - stock_act, 4)
            resumen_deficits.append(
                f'Stock insuficiente para "{material_row.nombre}". '
                f"Disponible: {stock_act:,.2f} {material_row.unidad_medida} — "
                f"Requerido: {total_req:,.2f} {material_row.unidad_medida} — "
                f"Déficit: {deficit:,.2f} {material_row.unidad_medida}."
            )

        items.append(
            RecipePreviewItem(
                material_id=material_row.id,
                material_nombre=material_row.nombre,
                unidad_medida=material_row.unidad_medida,
                cantidad_por_unidad=cant_por_unidad,
                cantidad_total_requerida=total_req,
                stock_actual=stock_act,
                deficit=deficit,
                suficiente=suficiente,
                cantidad_requerida=total_req,
                stock_disponible=stock_act,
            )
        )

    return OrderRecipePreviewResponse(
        order_id=order.id,
        codigo_pedido=order.codigo_pedido,
        cliente=order.cliente,
        tipo_caseton_id=order.tipo_caseton_id,
        tipo_caseton_nombre=tipo_nombre,
        cantidad=cantidad_casetones,
        es_viable=es_viable,
        materiales=items,
        resumen_deficits=resumen_deficits,
        pedido_id=order.id,
        tipo_caseton=tipo_nombre,
        cantidad_casetones=cantidad_casetones,
        es_factible=es_viable,
        items=items,
    )


# Alias para retrocompatibilidad
get_order_recipe_preview = preview_order_recipe
