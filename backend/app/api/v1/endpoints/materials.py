"""
api/v1/endpoints/materials.py — Endpoints REST para Materiales e Insumos (HU10 y HU12).

Rutas expuestas bajo el prefijo ``/api/v1/materials``:

  POST   /            → Registrar nuevo insumo                 [ADMINISTRADOR]
  GET    /            → Listar insumos con filtros y alertas   [autenticado]
  GET    /{id}        → Detalle de un insumo por ID            [autenticado]
  PUT    /{id}        → Actualizar datos de insumo             [ADMINISTRADOR]
  PATCH  /{id}/status → Borrado lógico (toggle activo)         [ADMINISTRADOR]
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser, CurrentUser, get_db
from app.schemas.material import (
    MaterialCreate,
    MaterialListResponse,
    MaterialResponse,
    MaterialUpdate,
)
from app.services import material_service

router = APIRouter()


@router.post(
    "/",
    response_model=MaterialResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo material o insumo",
    description="Crea un nuevo material en el inventario maestro. **Requiere rol ADMINISTRADOR.** Valida unicidad de nombre.",
    responses={
        201: {"description": "Material creado exitosamente."},
        401: {"description": "No autenticado."},
        403: {"description": "Se requiere rol ADMINISTRADOR."},
        409: {"description": "El nombre del material ya existe en el sistema."},
        422: {"description": "Error de validación en los datos ingresados."},
    },
)
async def create_material(
    material_in: MaterialCreate,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> MaterialResponse:
    """
    Registra un insumo de producción en el inventario con su stock inicial y umbral de alerta mínima.
    """
    return await material_service.create_material(
        db=db,
        material_in=material_in,
        user_id=admin.id,
    )


@router.get(
    "/",
    response_model=MaterialListResponse,
    summary="Listar materiales e inventario",
    description="Retorna la lista de materiales con soporte de búsqueda por nombre, filtro de estado y alerta de stock crítico (HU12).",
    responses={
        200: {"description": "Listado de materiales recuperado con éxito."},
        401: {"description": "No autenticado."},
    },
)
async def list_materials(
    _user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    skip: int = Query(default=0, ge=0, description="Registros a omitir."),
    limit: int = Query(default=50, ge=1, le=200, description="Límite de registros por página."),
    nombre: Optional[str] = Query(default=None, max_length=100, description="Filtro por nombre parcial."),
    activo: Optional[bool] = Query(default=None, description="Filtrar por estado activo (true/false)."),
    alerta_stock: Optional[bool] = Query(
        default=None,
        description="Si es true, retorna únicamente insumos con stock_actual <= stock_minimo (HU12).",
    ),
) -> MaterialListResponse:
    """
    Consulta el inventario maestro con filtros avanzados para control de stock.
    """
    return await material_service.get_materials(
        db=db,
        skip=skip,
        limit=limit,
        nombre=nombre,
        activo=activo,
        alerta_stock=alerta_stock,
    )


@router.get(
    "/{material_id}",
    response_model=MaterialResponse,
    summary="Detalle de un material",
    description="Retorna los datos de un material por su ID.",
    responses={
        200: {"description": "Detalle del material."},
        401: {"description": "No autenticado."},
        404: {"description": "Material no encontrado."},
    },
)
async def get_material(
    material_id: int,
    _user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> MaterialResponse:
    """
    Recupera la información completa de un insumo por su identificador único.
    """
    return await material_service.get_material_by_id(db=db, material_id=material_id)


@router.put(
    "/{material_id}",
    response_model=MaterialResponse,
    summary="Actualizar material",
    description="Modifica los datos editables de un material. **Requiere rol ADMINISTRADOR.**",
    responses={
        200: {"description": "Material actualizado exitosamente."},
        401: {"description": "No autenticado."},
        403: {"description": "Se requiere rol ADMINISTRADOR."},
        404: {"description": "Material no encontrado."},
        409: {"description": "El nuevo nombre ya está en uso por otro material."},
        422: {"description": "Datos no válidos."},
    },
)
async def update_material(
    material_id: int,
    material_in: MaterialUpdate,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> MaterialResponse:
    """
    Actualiza nombre, unidad de medida o umbrales de stock de un material.
    """
    return await material_service.update_material(
        db=db,
        material_id=material_id,
        material_in=material_in,
        user_id=admin.id,
    )


@router.patch(
    "/{material_id}/status",
    response_model=MaterialResponse,
    summary="Alternar estado activo/inactivo (Borrado Lógico)",
    description="Activa o desactiva un material sin eliminarlo físicamente. **Requiere rol ADMINISTRADOR.**",
    responses={
        200: {"description": "Estado del material alternado con éxito."},
        401: {"description": "No autenticado."},
        403: {"description": "Se requiere rol ADMINISTRADOR."},
        404: {"description": "Material no encontrado."},
    },
)
async def toggle_material_status(
    material_id: int,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
) -> MaterialResponse:
    """
    Aplica borrado lógico alternando el campo ``activo`` del material.
    """
    return await material_service.toggle_material_status(
        db=db,
        material_id=material_id,
        user_id=admin.id,
    )
