"""
api/v1/endpoints/providers.py — Endpoints del módulo de Proveedores (HU02/HU03).

Rutas expuestas bajo el prefijo ``/api/v1/providers``:

  POST   /            → Crea proveedor via sp_crear_proveedor   [ADMINISTRADOR]
  GET    /            → Lista proveedores con paginación y búsqueda  [autenticado]
  GET    /{id}        → Detalle de un proveedor por ID           [autenticado]
  PUT    /{id}        → Actualiza datos editables                [ADMINISTRADOR]
  PATCH  /{id}/status → Borrado lógico (toggle activo)           [ADMINISTRADOR]
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser, CurrentUser, get_db
from app.schemas.provider import (
    ProviderCreate,
    ProviderListResponse,
    ProviderRead,
    ProviderUpdate,
)
from app.services import provider_service

router = APIRouter()


# ---------------------------------------------------------------------------
# POST / — Registro de proveedor (HU02 — solo ADMINISTRADOR)
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=ProviderRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar proveedor",
    description=(
        "Crea un nuevo proveedor ejecutando el Stored Procedure ``sp_crear_proveedor``. "
        "**Requiere rol ADMINISTRADOR.** El NIT es inmutable una vez registrado."
    ),
    responses={
        201: {"description": "Proveedor creado exitosamente."},
        401: {"description": "Token ausente o inválido."},
        403: {"description": "Se requiere rol ADMINISTRADOR."},
        409: {"description": "El NIT ya está registrado en el sistema."},
        422: {"description": "Datos de entrada inválidos o error en el SP."},
    },
)
async def create_provider(
    provider_in: ProviderCreate,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> ProviderRead:
    """
    Registra un nuevo proveedor en el sistema.

    - El NIT debe ser único; en caso de duplicidad se retorna HTTP 409.
    - Solo usuarios con rol **ADMINISTRADOR** pueden ejecutar este endpoint.
    """
    return await provider_service.create_provider(
        db=db,
        provider_in=provider_in,
        user_id=admin.id,
    )


# ---------------------------------------------------------------------------
# GET / — Listado paginado con búsqueda (HU03 — autenticado)
# ---------------------------------------------------------------------------

@router.get(
    "/",
    response_model=ProviderListResponse,
    summary="Listar proveedores",
    description=(
        "Retorna la lista paginada de proveedores activos. "
        "Soporta búsqueda por NIT o nombre de empresa. "
        "Los usuarios ADMINISTRADOR pueden incluir proveedores inactivos."
    ),
    responses={
        200: {"description": "Listado de proveedores retornado."},
        401: {"description": "Token ausente o inválido."},
    },
)
async def list_providers(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    skip: int = Query(default=0, ge=0, description="Número de registros a omitir."),
    limit: int = Query(default=50, ge=1, le=200, description="Máximo de registros a retornar."),
    search: Optional[str] = Query(
        default=None,
        max_length=100,
        description="Texto para buscar por NIT o nombre de empresa.",
    ),
    include_inactive: bool = Query(
        default=False,
        description="Si es True, incluye proveedores desactivados (solo ADMINISTRADOR).",
    ),
) -> ProviderListResponse:
    """
    Lista proveedores con paginación, búsqueda y filtro de estado.

    - Por defecto solo retorna proveedores con ``activo = True``.
    - ``include_inactive=true`` muestra también los inactivos (borrado lógico).
    """
    return await provider_service.get_providers(
        db=db,
        skip=skip,
        limit=limit,
        include_inactive=include_inactive,
        search=search,
    )


# ---------------------------------------------------------------------------
# GET /{provider_id} — Detalle por ID (autenticado)
# ---------------------------------------------------------------------------

@router.get(
    "/{provider_id}",
    response_model=ProviderRead,
    summary="Detalle de proveedor",
    description="Retorna los datos completos de un proveedor por su ID.",
    responses={
        200: {"description": "Datos del proveedor."},
        401: {"description": "Token ausente o inválido."},
        404: {"description": "Proveedor no encontrado."},
    },
)
async def get_provider(
    provider_id: int,
    _current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ProviderRead:
    """
    Recupera el detalle completo de un proveedor por su identificador único.
    Retorna HTTP 404 si el ID no existe en la base de datos.
    """
    return await provider_service.get_provider_by_id(db=db, provider_id=provider_id)


# ---------------------------------------------------------------------------
# PUT /{provider_id} — Actualización de datos editables (ADMINISTRADOR)
# ---------------------------------------------------------------------------

@router.put(
    "/{provider_id}",
    response_model=ProviderRead,
    summary="Actualizar proveedor",
    description=(
        "Modifica los datos editables de un proveedor. "
        "El NIT es **inmutable** y no puede cambiarse. "
        "**Requiere rol ADMINISTRADOR.**"
    ),
    responses={
        200: {"description": "Proveedor actualizado exitosamente."},
        401: {"description": "Token ausente o inválido."},
        403: {"description": "Se requiere rol ADMINISTRADOR."},
        404: {"description": "Proveedor no encontrado."},
        422: {"description": "Datos de actualización inválidos."},
    },
)
async def update_provider(
    provider_id: int,
    provider_in: ProviderUpdate,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> ProviderRead:
    """
    Actualiza los campos editables del proveedor indicado.

    Solo se modifican los campos explícitamente enviados en el body
    (comportamiento PATCH semántico sobre verbo PUT para facilidad de cliente).
    """
    return await provider_service.update_provider(
        db=db,
        provider_id=provider_id,
        provider_in=provider_in,
        user_id=admin.id,
    )


# ---------------------------------------------------------------------------
# PATCH /{provider_id}/status — Borrado lógico (ADMINISTRADOR)
# ---------------------------------------------------------------------------

@router.patch(
    "/{provider_id}/status",
    response_model=ProviderRead,
    summary="Alternar estado del proveedor",
    description=(
        "Alterna el campo ``activo`` del proveedor entre ``true`` y ``false``. "
        "Implementa **borrado lógico**: el registro nunca se elimina físicamente. "
        "**Requiere rol ADMINISTRADOR.**"
    ),
    responses={
        200: {"description": "Estado del proveedor alternado."},
        401: {"description": "Token ausente o inválido."},
        403: {"description": "Se requiere rol ADMINISTRADOR."},
        404: {"description": "Proveedor no encontrado."},
    },
)
async def toggle_provider_status(
    provider_id: int,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> ProviderRead:
    """
    Activa o desactiva un proveedor sin eliminarlo de la base de datos.

    - Si ``activo`` era ``true``  → pasa a ``false`` (desactivación / baja lógica).
    - Si ``activo`` era ``false`` → pasa a ``true``  (reactivación).
    """
    return await provider_service.toggle_provider_status(
        db=db,
        provider_id=provider_id,
        user_id=admin.id,
    )
