"""
schemas/material.py — Esquemas Pydantic v2 para el módulo de Materiales e Insumos (HU10 y HU12).
"""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

# Unidades de medida estándar en la fabricación de casetones
VALID_UNITS = ("m", "m2", "m3", "kg", "und", "pulgada", "mm")


class MaterialBase(BaseModel):
    """Campos base compartidos por todos los esquemas de material."""

    nombre: str = Field(
        ...,
        min_length=3,
        max_length=255,
        description="Nombre único del insumo o materia prima.",
        examples=["Icopor EPS Densidad 10", "Lona Impermeable 600D", "Guadua Angustifolia"],
    )
    unidad_medida: str = Field(
        ...,
        min_length=1,
        max_length=30,
        description="Unidad de medida ('m', 'm2', 'm3', 'kg', 'und', 'culmo').",
        examples=["m2", "kg", "und", "culmo"],
    )
    stock_minimo: Decimal = Field(
        default=Decimal("0.000"),
        ge=0,
        description="Umbral mínimo de inventario para disparar alertas de reabastecimiento (HU12).",
        examples=[Decimal("10.000")],
    )

    @field_validator("nombre")
    @classmethod
    def clean_nombre(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 3:
            raise ValueError("El nombre del material debe tener al menos 3 caracteres.")
        return cleaned

    @field_validator("unidad_medida")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        unit = v.strip().lower()
        if unit not in VALID_UNITS:
            # Permitir si el usuario envía variantes pero normalizar
            return unit
        return unit


class MaterialCreate(MaterialBase):
    """Payload para registrar un nuevo material en el inventario."""

    stock_actual: Decimal = Field(
        default=Decimal("0.000"),
        ge=0,
        description="Cantidad física inicial disponible en bodega.",
        examples=[Decimal("100.000")],
    )


class MaterialUpdate(BaseModel):
    """Payload para actualización parcial de un material."""

    nombre: str | None = Field(
        default=None,
        min_length=3,
        max_length=255,
        description="Nuevo nombre del material.",
    )
    unidad_medida: str | None = Field(
        default=None,
        min_length=1,
        max_length=30,
        description="Nueva unidad de medida.",
    )
    stock_minimo: Decimal | None = Field(
        default=None,
        ge=0,
        description="Nuevo umbral de alerta de stock mínimo.",
    )
    stock_actual: Decimal | None = Field(
        default=None,
        ge=0,
        description="Ajuste directo de stock actual (si aplica).",
    )


class MaterialStatusUpdate(BaseModel):
    """Payload para alternar estado activo/inactivo."""

    activo: bool = Field(..., description="Nuevo estado del material.")


class MaterialResponse(MaterialBase):
    """Respuesta pública con información completa del insumo."""

    id: int = Field(..., description="Identificador único del insumo.")
    stock_actual: Decimal = Field(..., description="Stock físico actual disponible.")
    activo: bool = Field(..., description="Indica si el insumo está activo.")
    created_at: datetime = Field(..., description="Fecha y hora de creación UTC.")
    updated_at: datetime | None = Field(default=None, description="Fecha y hora de última modificación UTC.")

    # Campo auxiliar para determinar si está en alerta crítica de stock
    @property
    def alerta_stock(self) -> bool:
        return self.stock_actual <= self.stock_minimo

    model_config = {"from_attributes": True}


class MaterialListResponse(BaseModel):
    """Respuesta paginada para la lista de materiales."""

    total: int = Field(..., description="Total de registros encontrados.")
    skip: int = Field(..., description="Offset aplicado.")
    limit: int = Field(..., description="Límite de registros.")
    items: list[MaterialResponse] = Field(..., description="Lista de insumos.")
