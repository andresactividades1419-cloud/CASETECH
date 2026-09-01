"""
api/v1/endpoints/stock_adjustments.py — Endpoints REST para Ajustes Manuales de Inventario y Auditoría (HU13).

Provee:
- POST   /api/v1/stock-adjustments/           → Crear solicitud de ajuste (Operario o Admin).
- GET    /api/v1/stock-adjustments/           → Listar historial de ajustes y solicitudes con filtros.
- GET    /api/v1/stock-adjustments/{id}       → Ver detalle completo de auditoría.
- POST   /api/v1/stock-adjustments/{id}/review→ Aprobar o rechazar solicitud (Solo Admin con doble firma).
"""

from fastapi import APIRouter, Query, status

from app.api.deps import AdminUser, CurrentUser, DBSession
from app.schemas.stock_adjustment import (
    StockAdjustmentCreate,
    StockAdjustmentListResponse,
    StockAdjustmentResponse,
    StockAdjustmentReview,
)
from app.services import stock_adjustment_service

router = APIRouter()


@router.post(
    "/",
    response_model=StockAdjustmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Solicitar un nuevo ajuste manual de inventario (HU13)",
    description="Crea una solicitud de ajuste en estado PENDIENTE. Permite registrar mermas, sobrantes, daños o conteo físico.",
)
async def create_adjustment_endpoint(
    data: StockAdjustmentCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> StockAdjustmentResponse:
    """Registra una nueva solicitud de ajuste de stock con el usuario autenticado como solicitante."""
    return await stock_adjustment_service.create_adjustment(
        db=db,
        data=data,
        user=current_user,
    )


@router.get(
    "/",
    response_model=StockAdjustmentListResponse,
    summary="Listar solicitudes y movimientos de ajuste de inventario",
    description="Retorna el listado paginado con filtros por estado (PENDIENTE, APROBADO, RECHAZADO), tipo de ajuste y material.",
)
async def get_adjustments_endpoint(
    db: DBSession,
    current_user: CurrentUser,
    estado: str | None = Query(
        None, description="Filtrar por estado: PENDIENTE, APROBADO, RECHAZADO"
    ),
    tipo: str | None = Query(
        None,
        description="Filtrar por tipo de ajuste (MERMA, SOBRANTE, CONTEO_FISICO, DANO)",
    ),
    material_id: int | None = Query(
        None, description="Filtrar por ID de la materia prima", gt=0
    ),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(
        20, ge=1, le=100, description="Cantidad de registros por página"
    ),
) -> StockAdjustmentListResponse:
    """Consulta el historial de ajustes de inventario según los filtros proporcionados."""
    return await stock_adjustment_service.get_adjustments(
        db=db,
        estado=estado,
        tipo=tipo,
        material_id=material_id,
        page=page,
        limit=limit,
    )


@router.get(
    "/{id}",
    response_model=StockAdjustmentResponse,
    summary="Consultar detalle de un ajuste de inventario",
    description="Obtiene la información completa de trazabilidad de un ajuste manual por su identificador.",
)
async def get_adjustment_by_id_endpoint(
    id: int,
    db: DBSession,
    current_user: CurrentUser,
) -> StockAdjustmentResponse:
    """Recupera la auditoría de un ajuste individual."""
    return await stock_adjustment_service.get_adjustment_by_id(
        db=db,
        adjustment_id=id,
    )


@router.post(
    "/{id}/review",
    response_model=StockAdjustmentResponse,
    summary="Aprobar o rechazar solicitud de ajuste (Solo ADMINISTRADOR)",
    description="Aplica de forma atómica el ajuste de stock o lo rechaza mediante el Stored Procedure `sp_ajuste_inventario`. Exige doble firma.",
)
async def review_adjustment_endpoint(
    id: int,
    review_data: StockAdjustmentReview,
    db: DBSession,
    admin_user: AdminUser,
) -> StockAdjustmentResponse:
    """Evalúa la solicitud de ajuste. Si se aprueba, actualiza el stock físico y genera un movimiento en kardex."""
    return await stock_adjustment_service.review_adjustment(
        db=db,
        adjustment_id=id,
        review_data=review_data,
        admin_user=admin_user,
    )
