"""
api/v1/endpoints/recipes.py — Endpoints REST para administrar Recetas BOM (Issue #88).

Rutas expuestas bajo el prefijo ``/api/v1/recipes``:

  GET    /            → Listar recetas (opcionalmente por tipo de casetón) [autenticado]
  POST   /            → Agregar material a la receta de un tipo           [ADMINISTRADOR]
  PUT    /{id}        → Actualizar cantidad de una receta                 [ADMINISTRADOR]
  DELETE /{id}        → Quitar un material de la receta                  [ADMINISTRADOR]

Antes de este módulo, la única forma de configurar el BOM era insertando
filas directo en la base de datos — no existía ningún camino de código ni
de UI para hacerlo.
"""

from fastapi import APIRouter, Query, status

from app.api.deps import AdminUser, CurrentUser, DBSession
from app.schemas.recipe import (
    RecipeCreate,
    RecipeListResponse,
    RecipeResponse,
    RecipeUpdate,
)
from app.services import recipe_service

router = APIRouter()


@router.get(
    "/",
    response_model=RecipeListResponse,
    summary="Listar recetas BOM",
    description="Retorna las recetas configuradas, opcionalmente filtradas por tipo de casetón.",
    responses={
        200: {"description": "Listado de recetas recuperado con éxito."},
        401: {"description": "No autenticado."},
    },
)
async def list_recipes(
    _user: CurrentUser,
    db: DBSession,
    tipo_caseton_id: int | None = Query(
        default=None, gt=0, description="Filtrar por tipo de casetón."
    ),
) -> RecipeListResponse:
    """Consulta las recetas BOM configuradas en el sistema."""
    return await recipe_service.get_recipes(db=db, tipo_caseton_id=tipo_caseton_id)


@router.post(
    "/",
    response_model=RecipeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar material a una receta",
    description=(
        "Agrega un material a la receta BOM de un tipo de casetón. "
        "**Requiere rol ADMINISTRADOR.**"
    ),
    responses={
        201: {"description": "Receta creada exitosamente."},
        401: {"description": "No autenticado."},
        403: {"description": "Se requiere rol ADMINISTRADOR."},
        404: {"description": "Tipo de casetón o material no encontrado."},
        409: {"description": "Ya existe una receta para ese material en ese tipo de casetón."},
    },
)
async def create_recipe(
    recipe_in: RecipeCreate,
    _admin: AdminUser,
    db: DBSession,
) -> RecipeResponse:
    """Agrega una fila de receta (tipo de casetón + material + cantidad)."""
    return await recipe_service.create_recipe(db=db, recipe_in=recipe_in)


@router.put(
    "/{recipe_id}",
    response_model=RecipeResponse,
    summary="Actualizar cantidad de una receta",
    description="Modifica la cantidad por unidad de una receta existente. **Requiere rol ADMINISTRADOR.**",
    responses={
        200: {"description": "Receta actualizada exitosamente."},
        401: {"description": "No autenticado."},
        403: {"description": "Se requiere rol ADMINISTRADOR."},
        404: {"description": "Receta no encontrada."},
    },
)
async def update_recipe(
    recipe_id: int,
    recipe_in: RecipeUpdate,
    _admin: AdminUser,
    db: DBSession,
) -> RecipeResponse:
    """Actualiza la cantidad por unidad de una receta."""
    return await recipe_service.update_recipe(
        db=db, recipe_id=recipe_id, recipe_in=recipe_in
    )


@router.delete(
    "/{recipe_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un material de una receta",
    description="Quita un material de la receta BOM de un tipo de casetón. **Requiere rol ADMINISTRADOR.**",
    responses={
        204: {"description": "Receta eliminada exitosamente."},
        401: {"description": "No autenticado."},
        403: {"description": "Se requiere rol ADMINISTRADOR."},
        404: {"description": "Receta no encontrada."},
    },
)
async def delete_recipe(
    recipe_id: int,
    _admin: AdminUser,
    db: DBSession,
) -> None:
    """Elimina una fila de receta por su ID."""
    await recipe_service.delete_recipe(db=db, recipe_id=recipe_id)
