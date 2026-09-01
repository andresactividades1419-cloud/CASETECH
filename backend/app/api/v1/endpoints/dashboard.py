"""
api/v1/endpoints/dashboard.py — Endpoints REST para el Dashboard General, Trazabilidad y Auditoría (HU15).

Provee:
- GET /api/v1/dashboard/metrics    → KPIs clave de inventario, compras, producción y BOM (CurrentUser).
- GET /api/v1/dashboard/movements  → Log inmutable de movimientos de inventario / Kardex (CurrentUser).
- GET /api/v1/dashboard/audit-logs → Log de auditoría de acciones del sistema con detalles JSON (AdminUser).
"""

from datetime import date, datetime

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

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
    tipo_movimiento: str | None = Query(
        None,
        description="Filtrar por tipo (INGRESO_COMPRA, DESCUENTO_PRODUCCION, AJUSTE_APROBADO)",
    ),
    material_id: int | None = Query(
        None, description="Filtrar por ID de la materia prima", gt=0
    ),
    fecha_desde: date | None = Query(
        None, description="Fecha mínima del movimiento (YYYY-MM-DD)"
    ),
    fecha_hasta: date | None = Query(
        None, description="Fecha máxima del movimiento (YYYY-MM-DD)"
    ),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(
        25, ge=1, le=100, description="Cantidad de registros por página"
    ),
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
    "/movements/export-csv",
    summary="Exportar movimientos de Kardex a formato CSV (HU06, RF12)",
    description=(
        "Genera un archivo CSV con codificación UTF-8 con BOM del historial de movimientos de inventario. "
        "Permite aplicar los mismos filtros que la consulta visual."
    ),
    responses={
        200: {
            "description": "Archivo CSV descargable con el historial de Kardex.",
            "content": {"text/csv": {}},
        },
        401: {"description": "No autenticado."},
    },
)
async def export_stock_movements_csv_endpoint(
    db: DBSession,
    current_user: CurrentUser,
    tipo_movimiento: str | None = Query(
        None,
        description="Filtrar por tipo (INGRESO_COMPRA, DESCUENTO_PRODUCCION, AJUSTE_APROBADO)",
    ),
    material_id: int | None = Query(
        None, description="Filtrar por ID de la materia prima", gt=0
    ),
    fecha_desde: date | None = Query(
        None, description="Fecha mínima del movimiento (YYYY-MM-DD)"
    ),
    fecha_hasta: date | None = Query(
        None, description="Fecha máxima del movimiento (YYYY-MM-DD)"
    ),
) -> StreamingResponse:
    """Genera y transmite el archivo CSV con la trazabilidad del Kardex."""
    csv_content = await dashboard_service.export_stock_movements_csv(
        db=db,
        tipo_movimiento=tipo_movimiento,
        material_id=material_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )

    date_str = datetime.now().strftime("%Y%m%d")
    filename = f"kardex_movimientos_{date_str}.csv"

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
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
    entidad: str | None = Query(
        None,
        description="Filtrar por entidad (pedidos, compras, ajustes_inventario, proveedores)",
    ),
    usuario_id: int | None = Query(
        None, description="Filtrar por ID de usuario ejecutor", gt=0
    ),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(
        25, ge=1, le=100, description="Cantidad de registros por página"
    ),
) -> AuditLogListResponse:
    """Consulta la bitácora administrativa de auditoría con detalles JSON estructurados."""
    return await dashboard_service.get_system_audit_logs(
        db=db,
        entidad=entidad,
        usuario_id=usuario_id,
        page=page,
        limit=limit,
    )


@router.get(
    "/audit-logs/export-csv",
    summary="Exportar Bitácora de Auditoría a formato CSV (HU06, RF12)",
    description=(
        "Genera un archivo CSV con codificación UTF-8 con BOM de la bitácora administrativa de auditoría. "
        "**Exclusivo para rol ADMINISTRADOR.**"
    ),
    responses={
        200: {
            "description": "Archivo CSV descargable con el log de auditoría del sistema.",
            "content": {"text/csv": {}},
        },
        401: {"description": "No autenticado."},
        403: {"description": "Acceso denegado: se requiere el rol ADMINISTRADOR."},
    },
)
async def export_audit_logs_csv_endpoint(
    db: DBSession,
    _admin_user: AdminUser,
    entidad: str | None = Query(
        None,
        description="Filtrar por entidad (pedidos, compras, ajustes_inventario, proveedores)",
    ),
    usuario_id: int | None = Query(
        None, description="Filtrar por ID de usuario ejecutor", gt=0
    ),
    fecha_desde: date | None = Query(
        None, description="Fecha mínima del registro (YYYY-MM-DD)"
    ),
    fecha_hasta: date | None = Query(
        None, description="Fecha máxima del registro (YYYY-MM-DD)"
    ),
) -> StreamingResponse:
    """Genera y transmite el archivo CSV con la bitácora de auditoría."""
    csv_content = await dashboard_service.export_audit_logs_csv(
        db=db,
        entidad=entidad,
        usuario_id=usuario_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )

    date_str = datetime.now().strftime("%Y%m%d")
    filename = f"bitacora_auditoria_{date_str}.csv"

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
