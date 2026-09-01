"""
schemas/stock_adjustment.py — Esquemas Pydantic v2 para Ajustes Manuales de Inventario y Auditoría (HU13).

Define validaciones de entrada y modelos de respuesta para solicitudes de ajuste de stock
con soporte para doble firma, Stored Procedure sp_ajuste_inventario y trazabilidad total.
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class AdjustmentType(str, Enum):
    """
    Tipos de ajuste manual soportados por el motor de inventario.
    """
    MERMA = "MERMA"
    SOBRANTE = "SOBRANTE"
    CONTEO_FISICO = "CONTEO_FISICO"
    DANO = "DANO"
    DEVOLUCION_PROVEEDOR = "DEVOLUCION_PROVEEDOR"


class AdjustmentStatus(str, Enum):
    """
    Estados posibles de una solicitud de ajuste de inventario.
    """
    PENDIENTE = "PENDIENTE"
    PENDIENTE_APROBACION = "PENDIENTE_APROBACION"
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"


class StockAdjustmentBase(BaseModel):
    """Esquema base con atributos comunes de un ajuste de inventario."""
    material_id: int = Field(..., description="ID de la materia prima a ajustar", gt=0)
    tipo: AdjustmentType = Field(..., description="Tipo de ajuste (MERMA, SOBRANTE, CONTEO_FISICO, DANO)")
    cantidad: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=3,
        description="Cantidad a ajustar (valor positivo; el backend determina el signo según el tipo)",
    )
    motivo: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="Justificación detallada del motivo del ajuste para auditoría",
    )


class StockAdjustmentCreate(StockAdjustmentBase):
    """Esquema para la creación/solicitud de un ajuste de inventario."""
    pass


class StockAdjustmentReview(BaseModel):
    """Esquema para que un Administrador apruebe o rechace una solicitud."""
    aprobado: bool = Field(..., description="True para aprobar y aplicar al stock, False para rechazar")
    observaciones: str | None = Field(
        None,
        max_length=500,
        description="Observaciones o notas adicionales del revisor",
    )


class StockAdjustmentResponse(BaseModel):
    """Esquema de respuesta detallado con datos enriquecidos para la vista y auditoría."""
    id: int
    material_id: int
    tipo: str
    cantidad: Decimal
    motivo: str
    stock_antes: Decimal | None = None
    stock_despues: Decimal | None = None
    estado: str
    solicitante_id: int
    revisor_id: int | None = None
    solicitante_nombre: str | None = None
    material_nombre: str | None = None
    revisor_nombre: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class StockAdjustmentListResponse(BaseModel):
    """Respuesta paginada para listados de ajustes de inventario."""
    items: list[StockAdjustmentResponse]
    total: int
    page: int
    limit: int
    total_pages: int
