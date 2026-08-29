"""
api/v1/endpoints/dashboard.py — Endpoints REST para el Dashboard General, Trazabilidad y Auditoría (HU15).

Provee:
- GET /api/v1/dashboard/metrics    → KPIs clave de inventario, compras, producción y BOM (CurrentUser).
- GET /api/v1/dashboard/movements  → Log inmutable de movimientos de inventario / Kardex (CurrentUser).
- GET /api/v1/dashboard/audit-logs → Log de auditoría de acciones del sistema con detalles JSON (AdminUser).
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Query

from app.api.deps import AdminUser, CurrentUser, DBSession
from app.schemas.dashboard import (
    AuditLogListResponse,
    DashboardMetricsResponse,
    StockMovementListResponse,
)
from app.services import dashboard_service

router = APIRouter()


@router.get(
    "/metrics",
    response_model=DashboardMetricsResponse,
    summary="Obtener métricas y KPIs globales del ERP (HU15)",
    description="Retorna indicadores agregados en tiempo real sobre órdenes de producción, compras COP, alertas de stock y BOM.",
)
async def get_dashboard_metrics_endpoint(
    db: DBSession,
    current_user: CurrentUser,
) -> DashboardMetricsResponse:
    """Calcula y retorna los KPIs consolidados del sistema."""
    return await dashboard_service.get_dashboard_metrics(db=db)


@router.get(
    "/movements",
    response_model=StockMovementListResponse,
    summary="Consultar trazabilidad de movimientos de inventario (Kardex)",
    description="Retorna el log inmutable de ingresos, consumos por producción, cancelaciones y ajustes con snapshots de stock.",
)
async def get_stock_movements_endpoint(
    db: DBSession,
    current_user: CurrentUser,
    tipo_movimiento: Optional[str] = Query(None, description="Filtrar por tipo (INGRESO_COMPRA, DESCUENTO_PRODUCCION, AJUSTE_APROBADO)"),
    material_id: Optional[int] = Query(None, description="Filtrar por ID de la materia prima", gt=0),
    fecha_desde: Optional[date] = Query(None, description="Fecha mínima del movimiento (YYYY-MM-DD)"),
    fecha_hasta: Optional[date] = Query(None, description="Fecha máxima del movimiento (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(25, ge=1, le=100, description="Cantidad de registros por página"),
) -> StockMovementListResponse:
    """Consulta los movimientos de stock con sus snapshots y usuarios ejecutores."""
    return await dashboard_service.get_stock_movements_log(
        db=db,
        tipo_movimiento=tipo_movimiento,
        material_id=material_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        page=page,
        limit=limit,
    )


@router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
    summary="Consultar logs de auditoría del sistema (Solo ADMINISTRADOR)",
    description="Retorna el historial inmutable de acciones realizadas en el ERP (cambios de pedidos, compras, ajustes, etc.).",
)
async def get_audit_logs_endpoint(
    db: DBSession,
    admin_user: AdminUser,
    entidad: Optional[str] = Query(None, description="Filtrar por entidad (pedidos, compras, ajustes_inventario, proveedores)"),
    usuario_id: Optional[int] = Query(None, description="Filtrar por ID de usuario ejecutor", gt=0),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(25, ge=1, le=100, description="Cantidad de registros por página"),
) -> AuditLogListResponse:
    """Consulta la bitácora administrativa de auditoría con detalles JSON estructurados."""
    return await dashboard_service.get_system_audit_logs(
        db=db,
        entidad=entidad,
        usuario_id=usuario_id,
        page=page,
        limit=limit,
    )
