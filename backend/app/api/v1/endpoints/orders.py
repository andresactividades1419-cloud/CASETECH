"""
api/v1/endpoints/orders.py — Endpoints REST para Pedidos de Producción (HU07, HU08, HU11).

Rutas expuestas bajo el prefijo ``/api/v1/orders``:

  POST   /                → Registrar nuevo pedido de producción          [autenticado]
  GET    /                → Listar pedidos con filtros y paginación        [autenticado]
  GET    /{id}            → Detalle completo de un pedido                  [autenticado]
  PATCH  /{id}/status     → Cambiar estado e invocar sp_descontar_receta   [autenticado]
  GET    /{id}/recipe-preview → Previsualización de consumo BOM            [autenticado]

Ruta auxiliar expuesta bajo ``/api/v1/product-types``:

  GET    /product-types/  → Catálogo de tipos de casetón activos          [autenticado]
"""

from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_db
from app.schemas.order import (
    OrderCreate,
    OrderListResponse,
    OrderRecipePreviewResponse,
    OrderResponse,
    OrderStatusUpdate,
)
from app.schemas.product_type import ProductTypeListResponse
from app.services import order_service

router = APIRouter()


# ---------------------------------------------------------------------------
# POST / — Crear pedido de producción
# ---------------------------------------------------------------------------


@router.post(
    "/",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo pedido de producción",
    description=(
        "Crea un pedido de producción de casetones con estado inicial **PENDIENTE**. "
        "Genera automáticamente el código consecutivo `PED-YYYY-XXXXX`. "
        "El descuento de materiales BOM ocurre al cambiar el estado a `EN_PRODUCCION`."
    ),
    responses={
        201: {"description": "Pedido registrado exitosamente."},
        401: {"description": "No autenticado."},
        404: {"description": "Tipo de casetón no encontrado o inactivo."},
        409: {"description": "Colisión en código de pedido. Reintente."},
        422: {"description": "Datos de entrada no válidos."},
    },
)
async def create_order(
    order_in: OrderCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    """
    Registra un pedido de producción asociado al usuario autenticado.
    """
    return await order_service.create_order(
        db=db,
        order_in=order_in,
        user_id=current_user.id,
    )


# ---------------------------------------------------------------------------
# GET / — Listar pedidos con filtros
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=OrderListResponse,
    summary="Listar pedidos de producción",
    description=(
        "Retorna la lista paginada de pedidos con soporte de filtros por estado, "
        "cliente, tipo de casetón y rango de fechas. Ordenados del más reciente al más antiguo."
    ),
    responses={
        200: {"description": "Listado de pedidos recuperado con éxito."},
        401: {"description": "No autenticado."},
    },
)
async def list_orders(
    _user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    skip: int = Query(
        default=0, ge=0, description="Registros a omitir (offset de paginación)."
    ),
    limit: int = Query(
        default=50, ge=1, le=200, description="Límite de registros por página."
    ),
    estado: str | None = Query(
        default=None,
        description="Filtrar por estado: PENDIENTE | EN_PRODUCCION | COMPLETADO | CANCELADO.",
    ),
    cliente: str | None = Query(
        default=None,
        max_length=255,
        description="Búsqueda parcial por nombre de cliente (case-insensitive).",
    ),
    tipo_caseton_id: int | None = Query(
        default=None,
        gt=0,
        description="Filtrar por ID de tipo de casetón específico.",
    ),
    fecha_inicio: date | None = Query(
        default=None,
        description="Fecha de inicio del rango (YYYY-MM-DD, basada en created_at).",
    ),
    fecha_fin: date | None = Query(
        default=None,
        description="Fecha de fin del rango (YYYY-MM-DD, basada en created_at).",
    ),
) -> OrderListResponse:
    """
    Consulta el historial de pedidos con filtros avanzados para gestión de producción.
    """
    return await order_service.get_orders(
        db=db,
        skip=skip,
        limit=limit,
        estado=estado,
        cliente=cliente,
        tipo_caseton_id=tipo_caseton_id,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
    )


# ---------------------------------------------------------------------------
# GET /{order_id} — Detalle de pedido
# ---------------------------------------------------------------------------


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
    summary="Detalle de un pedido de producción",
    description="Retorna la información completa de un pedido por su ID, incluyendo el nombre del tipo de casetón.",
    responses={
        200: {"description": "Detalle del pedido."},
        401: {"description": "No autenticado."},
        404: {"description": "Pedido no encontrado."},
    },
)
async def get_order(
    order_id: int,
    _user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    """
    Recupera el detalle completo de un pedido por su identificador único.
    """
    return await order_service.get_order_by_id(db=db, order_id=order_id)


# ---------------------------------------------------------------------------
# PATCH /{order_id}/status — Actualizar estado e invocar SP BOM
# ---------------------------------------------------------------------------


@router.patch(
    "/{order_id}/status",
    response_model=OrderResponse,
    summary="Cambiar estado del pedido (Motor BOM)",
    description=(
        "Actualiza el estado del pedido según la máquina de estados definida.\n\n"
        "**Transición especial PENDIENTE → EN_PRODUCCION:**\n"
        "Ejecuta el Stored Procedure `sp_descontar_receta` de forma transaccional. "
        "Si el inventario no tiene suficiente stock para cubrir la receta BOM, "
        "retorna HTTP 422 con el mensaje descriptivo del déficit por material."
    ),
    responses={
        200: {"description": "Estado actualizado exitosamente."},
        401: {"description": "No autenticado."},
        404: {"description": "Pedido no encontrado."},
        422: {
            "description": (
                "Transición de estado no válida, o stock insuficiente en inventario "
                "(detalla el material faltante y el déficit)."
            )
        },
    },
)
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    """
    Aplica la transición de estado validando la máquina de estados del pedido.
    Al iniciar producción, ejecuta el motor BOM via Stored Procedure.
    """
    return await order_service.update_order_status(
        db=db,
        order_id=order_id,
        status_update=status_update,
        user_id=current_user.id,
    )


# ---------------------------------------------------------------------------
# GET /{order_id}/recipe-preview — HU11: Previsualización de Consumo BOM
# ---------------------------------------------------------------------------


@router.get(
    "/{order_id}/recipe-preview",
    response_model=OrderRecipePreviewResponse,
    summary="Previsualización de consumo BOM y balance de stock (HU11)",
    description=(
        "Calcula la explosión de materiales requeridos para el pedido según su receta BOM "
        "y los contrasta con el stock disponible en bodega. Retorna si la producción es viable "
        "y el detalle descriptivo de cualquier déficit existente."
    ),
    responses={
        200: {"description": "Balance y viabilidad del consumo BOM."},
        401: {"description": "No autenticado."},
        404: {"description": "Pedido no encontrado."},
    },
)
async def get_order_recipe_preview(
    order_id: int,
    _user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> OrderRecipePreviewResponse:
    """
    Retorna la explosión de materiales requeridos vs stock actual para un pedido.
    """
    return await order_service.get_order_recipe_preview(db=db, order_id=order_id)


# Alias para retrocompatibilidad
get_recipe_preview = get_order_recipe_preview


# ---------------------------------------------------------------------------
# Router auxiliar: tipos de casetón (selector frontend)
# ---------------------------------------------------------------------------

product_types_router = APIRouter()


@product_types_router.get(
    "/",
    response_model=ProductTypeListResponse,
    summary="Catálogo de tipos de casetón activos",
    description=(
        "Retorna la lista de todos los tipos de casetón activos para poblar "
        "el selector dinámico en el formulario de creación de pedidos."
    ),
    responses={
        200: {"description": "Catálogo de tipos de casetón."},
        401: {"description": "No autenticado."},
    },
)
async def list_product_types(
    _user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ProductTypeListResponse:
    """
    Expone el catálogo de tipos de casetón activos para el frontend.
    """
    return await order_service.get_product_types(db=db)
