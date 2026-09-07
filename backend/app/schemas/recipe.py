"""
schemas/recipe.py — Esquemas Pydantic v2 para la administración de Recetas BOM (Issue #88).

Permite crear, editar y eliminar las filas de `recetas` que el motor BOM
(sp_descontar_receta / sp_revertir_receta) consume al procesar pedidos.
"""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class RecipeCreate(BaseModel):
    """Payload para agregar un material a la receta de un tipo de casetón."""

    tipo_caseton_id: int = Field(..., gt=0, description="ID del tipo de casetón.")
    material_id: int = Field(..., gt=0, description="ID del material/insumo.")
    cantidad_por_unidad: Decimal = Field(
        ...,
        gt=0,
        description="Cantidad de material consumida por cada unidad de casetón fabricada.",
        examples=[Decimal("2.5000")],
    )


class RecipeUpdate(BaseModel):
    """Payload para actualizar la cantidad de una receta existente."""

    cantidad_por_unidad: Decimal = Field(
        ...,
        gt=0,
        description="Nueva cantidad de material consumida por cada unidad de casetón.",
    )


class RecipeResponse(BaseModel):
    """Respuesta de una receta con los nombres ya resueltos para mostrar en tablas."""

    id: int = Field(..., description="Identificador único de la receta.")
    tipo_caseton_id: int = Field(..., description="ID del tipo de casetón.")
    tipo_caseton_nombre: str = Field(..., description="Nombre del tipo de casetón.")
    material_id: int = Field(..., description="ID del material/insumo.")
    material_nombre: str = Field(..., description="Nombre del material/insumo.")
    unidad_medida: str = Field(..., description="Unidad de medida del material.")
    cantidad_por_unidad: Decimal = Field(
        ..., description="Cantidad consumida por cada unidad de casetón."
    )
    created_at: datetime = Field(..., description="Fecha de creación de la receta.")

    model_config = {"from_attributes": True}


class RecipeListResponse(BaseModel):
    """Respuesta con el listado completo de recetas, opcionalmente filtrado por tipo de casetón."""

    total: int = Field(..., description="Total de filas de receta encontradas.")
    items: list[RecipeResponse] = Field(..., description="Lista de recetas.")
