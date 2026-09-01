"""
schemas/product_type.py — Esquemas Pydantic v2 para el catálogo de Tipos de Casetón (tipos_caseton).

Permite exponer el selector de tipos de casetón al frontend sin necesidad
de un módulo CRUD completo en esta fase.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class ProductTypeResponse(BaseModel):
    """Respuesta pública de un tipo de casetón para selectores del frontend."""

    id: int = Field(..., description="Identificador único del tipo de casetón.")
    nombre: str = Field(..., description="Nombre descriptivo del tipo de casetón.")
    descripcion: str | None = Field(
        default=None, description="Descripción técnica del casetón."
    )
    naturaleza: str = Field(
        ...,
        description="Naturaleza del material: 'RECUPERABLE' (Lona, Guadua) o 'PERDIDO' (Icopor, cemento).",
    )
    activo: bool = Field(
        ..., description="Indica si el tipo de casetón está disponible para producción."
    )
    created_at: datetime = Field(..., description="Fecha de registro en el catálogo.")

    model_config = {"from_attributes": True}


class ProductTypeListResponse(BaseModel):
    """Respuesta paginada para el catálogo de tipos de casetón."""

    total: int = Field(..., description="Total de tipos de casetón activos.")
    items: list[ProductTypeResponse] = Field(
        ..., description="Lista de tipos de casetón disponibles."
    )
