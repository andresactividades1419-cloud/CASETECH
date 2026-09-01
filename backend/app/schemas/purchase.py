"""
schemas/purchase.py — Esquemas Pydantic v2 para el Módulo de Compras a Proveedores e Ingreso de Stock (HU07).

Define validaciones de entrada para registrar órdenes de compra con detalle de materiales,
y modelos de respuesta para visualización y kardex.
"""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PurchaseItemCreate(BaseModel):
    """Esquema de creación para una línea de detalle de compra."""

    material_id: int = Field(
        ..., gt=0, description="ID de la materia prima a abastecer"
    )
    cantidad: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=3,
        description="Cantidad comprada a ingresar al stock",
    )
    precio_unitario: Decimal = Field(
        ...,
        ge=0,
        max_digits=12,
        decimal_places=2,
        description="Precio unitario de compra (COP)",
    )


class PurchaseCreate(BaseModel):
    """Esquema de creación para la cabecera y líneas de una orden de compra."""

    proveedor_id: int = Field(..., gt=0, description="ID del proveedor activo")
    fecha_compra: date = Field(
        ..., description="Fecha de emisión o entrega de la compra"
    )
    items: list[PurchaseItemCreate] = Field(
        ...,
        min_length=1,
        description="Lista de materias primas adquiridas (mínimo 1 ítem)",
    )
    observaciones: str | None = Field(
        None,
        max_length=500,
        description="Observaciones, número de factura o remisión del proveedor",
    )


class PurchaseItemResponse(BaseModel):
    """Respuesta para una línea de detalle de compra enriquecida."""

    id: int
    compra_id: int
    material_id: int
    material_nombre: str | None = None
    unidad_medida: str | None = None
    cantidad: Decimal
    precio_unitario: Decimal
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class PurchaseResponse(BaseModel):
    """Respuesta completa de una orden de compra con sus líneas y relaciones cargadas."""

    id: int
    codigo_compra: str
    proveedor_id: int
    proveedor_nombre: str | None = None
    fecha_compra: date
    total: Decimal
    registrado_por: int
    registrado_por_nombre: str | None = None
    observaciones: str | None = None
    items: list[PurchaseItemResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PurchaseListResponse(BaseModel):
    """Respuesta paginada para listados de compras."""

    items: list[PurchaseResponse]
    total: int
    page: int
    limit: int
    total_pages: int
