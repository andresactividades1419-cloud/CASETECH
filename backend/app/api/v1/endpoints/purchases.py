"""
api/v1/endpoints/purchases.py — Endpoints REST para el Módulo de Compras e Ingreso de Stock (HU07).

Provee:
- POST /api/v1/purchases/     → Registrar compra e ingresar stock automáticamente a inventario.
- GET  /api/v1/purchases/     → Listar historial de órdenes de compra con filtros y paginación.
- GET  /api/v1/purchases/{id} → Ver detalle desglosado de una orden de compra con sus líneas.
"""

from datetime import date

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, DBSession
from app.schemas.purchase import (
    PurchaseCreate,
    PurchaseListResponse,
    PurchaseResponse,
)
from app.services import purchase_service

router = APIRouter()


@router.post(
    "/",
    response_model=PurchaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar una nueva orden de compra e ingresar stock",
    description="Crea la cabecera de compra, líneas de detalle, actualiza el inventario físico e inserta el movimiento inmutable en kardex.",
)
async def create_purchase_endpoint(
    data: PurchaseCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> PurchaseResponse:
    """Registra la compra e incrementa el stock de cada materia prima de forma atómica."""
    return await purchase_service.create_purchase(
        db=db,
        data=data,
        current_user=current_user,
    )


@router.get(
    "/",
    response_model=PurchaseListResponse,
    summary="Listar órdenes de compra con filtros y paginación",
    description="Obtiene el historial de compras con filtros por proveedor, código y rango de fechas.",
)
async def get_purchases_endpoint(
    db: DBSession,
    current_user: CurrentUser,
    proveedor_id: int | None = Query(None, description="Filtrar por ID del proveedor", gt=0),
    fecha_desde: date | None = Query(None, description="Fecha mínima de compra (YYYY-MM-DD)"),
    fecha_hasta: date | None = Query(None, description="Fecha máxima de compra (YYYY-MM-DD)"),
    codigo_compra: str | None = Query(None, description="Buscar por código (ej. CMP-2026)"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(20, ge=1, le=100, description="Registros por página"),
) -> PurchaseListResponse:
    """Consulta las compras registradas según los filtros especificados."""
    return await purchase_service.get_purchases(
        db=db,
        proveedor_id=proveedor_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        codigo_compra=codigo_compra,
        page=page,
        limit=limit,
    )


@router.get(
    "/{id}",
    response_model=PurchaseResponse,
    summary="Consultar detalle de una orden de compra",
    description="Retorna la información completa de la compra, líneas de detalle con subtotales, proveedor y usuario registrador.",
)
async def get_purchase_by_id_endpoint(
    id: int,
    db: DBSession,
    current_user: CurrentUser,
) -> PurchaseResponse:
    """Recupera una orden de compra por su identificador."""
    return await purchase_service.get_purchase_by_id(
        db=db,
        purchase_id=id,
    )
