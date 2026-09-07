"""
services/recipe_service.py — Lógica de negocio para la administración de Recetas BOM (Issue #88).

Antes de este módulo no existía ningún camino (ni de código ni de UI) para
configurar qué materiales lleva cada tipo de casetón salvo insertar filas
directo en la base de datos — este servicio expone esa gestión vía API.
"""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.material import Material
from app.models.product_type import ProductType
from app.models.recipe import Recipe
from app.schemas.recipe import (
    RecipeCreate,
    RecipeListResponse,
    RecipeResponse,
    RecipeUpdate,
)


def _to_response(recipe: Recipe) -> RecipeResponse:
    return RecipeResponse(
        id=recipe.id,
        tipo_caseton_id=recipe.tipo_caseton_id,
        tipo_caseton_nombre=recipe.tipo_caseton.nombre,
        material_id=recipe.material_id,
        material_nombre=recipe.material.nombre,
        unidad_medida=recipe.material.unidad_medida,
        cantidad_por_unidad=recipe.cantidad_por_unidad,
        created_at=recipe.created_at,
    )


async def get_recipes(
    db: AsyncSession,
    tipo_caseton_id: int | None = None,
) -> RecipeListResponse:
    """
    Lista las recetas BOM, opcionalmente filtradas por tipo de casetón.
    """
    query = select(Recipe).options(
        selectinload(Recipe.tipo_caseton), selectinload(Recipe.material)
    )
    if tipo_caseton_id:
        query = query.where(Recipe.tipo_caseton_id == tipo_caseton_id)
    query = query.order_by(Recipe.tipo_caseton_id, Recipe.material_id)

    rows = (await db.execute(query)).scalars().all()

    return RecipeListResponse(
        total=len(rows),
        items=[_to_response(r) for r in rows],
    )


async def create_recipe(db: AsyncSession, recipe_in: RecipeCreate) -> RecipeResponse:
    """
    Agrega un material a la receta de un tipo de casetón.

    Raises:
        HTTPException 404: Si el tipo de casetón o el material no existen.
        HTTPException 409: Si ya existe una receta para ese par tipo/material.
    """
    tipo = await db.get(ProductType, recipe_in.tipo_caseton_id)
    if tipo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tipo de casetón con id={recipe_in.tipo_caseton_id} no encontrado.",
        )

    material = await db.get(Material, recipe_in.material_id)
    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Material con id={recipe_in.material_id} no encontrado.",
        )

    # Se guardan los nombres en variables planas antes de intentar el commit:
    # si falla y hace rollback, SQLAlchemy expira los objetos ORM y acceder
    # a sus atributos despues dispara una recarga perezosa que no funciona
    # en contexto async.
    material_nombre = material.nombre
    tipo_nombre = tipo.nombre

    new_recipe = Recipe(
        tipo_caseton_id=recipe_in.tipo_caseton_id,
        material_id=recipe_in.material_id,
        cantidad_por_unidad=recipe_in.cantidad_por_unidad,
    )

    try:
        db.add(new_recipe)
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Ya existe una receta para '{material_nombre}' en "
                f"'{tipo_nombre}'. Edita la cantidad existente en vez de duplicarla."
            ),
        ) from exc

    reloaded = await db.get(
        Recipe,
        new_recipe.id,
        options=[selectinload(Recipe.tipo_caseton), selectinload(Recipe.material)],
    )
    assert reloaded is not None
    return _to_response(reloaded)


async def update_recipe(
    db: AsyncSession, recipe_id: int, recipe_in: RecipeUpdate
) -> RecipeResponse:
    """
    Actualiza la cantidad por unidad de una receta existente.
    """
    recipe = await db.get(
        Recipe,
        recipe_id,
        options=[selectinload(Recipe.tipo_caseton), selectinload(Recipe.material)],
    )
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Receta con id={recipe_id} no encontrada.",
        )

    recipe.cantidad_por_unidad = recipe_in.cantidad_por_unidad
    await db.commit()

    return _to_response(recipe)


async def delete_recipe(db: AsyncSession, recipe_id: int) -> None:
    """
    Elimina una receta. Los pedidos ya facturados no se ven afectados porque
    el motor BOM ya registró sus movimientos de inventario en su momento;
    esto solo afecta pedidos futuros.
    """
    recipe = await db.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Receta con id={recipe_id} no encontrada.",
        )

    await db.delete(recipe)
    await db.commit()
