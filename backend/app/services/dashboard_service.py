"""
services/dashboard_service.py — Servicio analítico para el Dashboard, Auditoría y Kardex (HU15).

Provee consultas agregadas optimizadas sobre:
- KPIs globales de producción, compras, inventario y alertas.
- Distribución de demanda BOM por naturaleza de casetón.
- Log inmutable de movimientos de inventario (Kardex).
- Log inmutable de auditoría de acciones del sistema.
"""

from datetime import date, datetime
from decimal import Decimal
from math import ceil
from typing import Optional

from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit_log import AuditLog
from app.models.material import Material
from app.models.order import Order
from app.models.product_type import ProductType
from app.models.purchase import Purchase
from app.models.stock_adjustment import StockAdjustment
from app.models.stock_movement import StockMovement
from app.schemas.dashboard import (
    AuditLogItem,
    AuditLogListResponse,
    DashboardKPIs,
    DashboardMetricsResponse,
    ProductionByType,
    StockMovementAuditItem,
    StockMovementListResponse,
)


async def get_dashboard_metrics(db: AsyncSession) -> DashboardMetricsResponse:
    """
    Calcula y agrega métricas clave de producción, abastecimiento e inventario.
    """
    # 1. Total de pedidos
    res_pedidos = await db.execute(select(func.count(Order.id)))
    total_pedidos = res_pedidos.scalar_one() or 0

    # 2. Pedidos en producción
    res_en_prod = await db.execute(
        select(func.count(Order.id)).where(Order.estado == "EN_PRODUCCION")
    )
    pedidos_en_produccion = res_en_prod.scalar_one() or 0

    # 3. Compras del mes en curso (COP)
    now = datetime.now()
    res_compras = await db.execute(
        select(func.coalesce(func.sum(Purchase.total), Decimal("0.00"))).where(
            extract("year", Purchase.fecha_compra) == now.year,
            extract("month", Purchase.fecha_compra) == now.month,
        )
    )
    compras_mes_cop = res_compras.scalar_one() or Decimal("0.00")

    # Si en el mes actual no hay compras registradas, calcular el total general para mostrar datos útiles
    if compras_mes_cop == Decimal("0.00"):
        res_compras_total = await db.execute(
            select(func.coalesce(func.sum(Purchase.total), Decimal("0.00")))
        )
        compras_mes_cop = res_compras_total.scalar_one() or Decimal("0.00")

    # 4. Materiales con alerta de stock crítico (stock_actual <= stock_minimo)
    res_alertas = await db.execute(
        select(func.count(Material.id)).where(
            Material.activo == True,
            Material.stock_actual <= Material.stock_minimo,
        )
    )
    materiales_alerta_stock = res_alertas.scalar_one() or 0

    # 5. Ajustes pendientes de doble firma
    res_ajustes = await db.execute(
        select(func.count(StockAdjustment.id)).where(
            StockAdjustment.estado.in_(["PENDIENTE", "PENDIENTE_APROBACION"])
        )
    )
    ajustes_pendientes = res_ajustes.scalar_one() or 0

    kpis = DashboardKPIs(
        total_pedidos=total_pedidos,
        pedidos_en_produccion=pedidos_en_produccion,
        compras_mes_cop=compras_mes_cop,
        materiales_alerta_stock=materiales_alerta_stock,
        ajustes_pendientes=ajustes_pendientes,
    )

    # 6. Desglose de producción por tipo de casetón y naturaleza
    query_prod = (
        select(
            ProductType.nombre.label("tipo_caseton"),
            ProductType.naturaleza.label("naturaleza"),
            func.count(Order.id).label("total_pedidos"),
            func.coalesce(func.sum(Order.cantidad), 0).label("total_unidades"),
        )
        .join(Order, Order.tipo_caseton_id == ProductType.id, isouter=True)
        .group_by(ProductType.id, ProductType.nombre, ProductType.naturaleza)
        .order_by(func.coalesce(func.sum(Order.cantidad), 0).desc())
    )
    res_prod = await db.execute(query_prod)
    rows_prod = res_prod.all()

    produccion_list = [
        ProductionByType(
            tipo_caseton=row.tipo_caseton,
            naturaleza=row.naturaleza,
            total_pedidos=row.total_pedidos or 0,
            total_unidades=Decimal(str(row.total_unidades or 0)),
        )
        for row in rows_prod
    ]

    return DashboardMetricsResponse(
        kpis=kpis,
        produccion_por_tipo=produccion_list,
    )


async def get_stock_movements_log(
    db: AsyncSession,
    tipo_movimiento: Optional[str] = None,
    material_id: Optional[int] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    page: int = 1,
    limit: int = 25,
) -> StockMovementListResponse:
    """
    Retorna el log inmutable de movimientos de inventario con paginación y filtros.
    """
    query = (
        select(StockMovement)
        .options(
            selectinload(StockMovement.material),
            selectinload(StockMovement.ejecutor),
        )
        .order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
    )

    count_query = select(func.count(StockMovement.id))

    # Filtros
    if tipo_movimiento and tipo_movimiento.strip() and tipo_movimiento != "TODOS":
        tipo_clean = tipo_movimiento.strip().upper()
        if tipo_clean in ("CONSUMO_PRODUCCION", "PRODUCCION", "DESCUENTO_PRODUCCION", "DESCUENTO_PRODUCCION_DEFINITIVO"):
            query = query.where(StockMovement.tipo_movimiento.ilike("%PRODUCCION%"))
            count_query = count_query.where(StockMovement.tipo_movimiento.ilike("%PRODUCCION%"))
        else:
            query = query.where(StockMovement.tipo_movimiento.ilike(f"%{tipo_clean}%"))
            count_query = count_query.where(StockMovement.tipo_movimiento.ilike(f"%{tipo_clean}%"))

    if material_id:
        query = query.where(StockMovement.material_id == material_id)
        count_query = count_query.where(StockMovement.material_id == material_id)

    if fecha_desde:
        query = query.where(func.date(StockMovement.created_at) >= fecha_desde)
        count_query = count_query.where(func.date(StockMovement.created_at) >= fecha_desde)

    if fecha_hasta:
        query = query.where(func.date(StockMovement.created_at) <= fecha_hasta)
        count_query = count_query.where(func.date(StockMovement.created_at) <= fecha_hasta)

    total_res = await db.execute(count_query)
    total = total_res.scalar_one() or 0

    offset = (page - 1) * limit
    paginated = query.offset(offset).limit(limit)
    result = await db.execute(paginated)
    movements = result.scalars().all()

    items = [
        StockMovementAuditItem(
            id=m.id,
            material_nombre=m.material.nombre if m.material else f"Material #{m.material_id}",
            tipo_movimiento=m.tipo_movimiento,
            cantidad=m.cantidad,
            stock_antes=m.stock_antes,
            stock_despues=m.stock_despues,
            referencia_tipo=m.referencia_tipo,
            referencia_id=m.referencia_id,
            usuario_nombre=m.ejecutor.nombre_completo if m.ejecutor else None,
            created_at=m.created_at,
        )
        for m in movements
    ]

    total_pages = ceil(total / limit) if total > 0 else 1

    return StockMovementListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


async def get_system_audit_logs(
    db: AsyncSession,
    entidad: Optional[str] = None,
    usuario_id: Optional[int] = None,
    page: int = 1,
    limit: int = 25,
) -> AuditLogListResponse:
    """
    Retorna el log inmutable de auditoría de acciones del sistema.
    """
    query = (
        select(AuditLog)
        .options(
            selectinload(AuditLog.usuario),
        )
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
    )

    count_query = select(func.count(AuditLog.id))

    if entidad and entidad.strip() and entidad != "TODAS":
        entidad_clean = entidad.strip().lower()
        query = query.where(func.lower(AuditLog.entidad) == entidad_clean)
        count_query = count_query.where(func.lower(AuditLog.entidad) == entidad_clean)

    if usuario_id:
        query = query.where(AuditLog.usuario_id == usuario_id)
        count_query = count_query.where(AuditLog.usuario_id == usuario_id)

    total_res = await db.execute(count_query)
    total = total_res.scalar_one() or 0

    offset = (page - 1) * limit
    paginated = query.offset(offset).limit(limit)
    result = await db.execute(paginated)
    logs = result.scalars().all()

    items = [
        AuditLogItem(
            id=log.id,
            accion=log.accion,
            entidad=log.entidad,
            entidad_id=log.entidad_id,
            usuario_nombre=log.usuario.nombre_completo if log.usuario else None,
            ip_address=log.ip_origen,
            detalles_json=log.payload_despues or log.payload_antes or {},
            created_at=log.created_at,
        )
        for log in logs
    ]

    total_pages = ceil(total / limit) if total > 0 else 1

    return AuditLogListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )
