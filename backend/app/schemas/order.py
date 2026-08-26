"""
schemas/order.py — Esquemas Pydantic v2 para el módulo de Pedidos de Producción (HU07, HU08, HU11).

Modelo de datos real:
  - Un pedido está vinculado a un tipo de casetón (tipo_caseton_id).
  - El motor BOM (sp_descontar_receta) aplica el descuento de materiales
    de forma automática basándose en la tabla `recetas`.
  - Estados válidos: PENDIENTE → EN_PRODUCCION → COMPLETADO | CANCELADO
"""

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enum de estados válidos según constraint de BD
# ---------------------------------------------------------------------------

class OrderStatus(str, Enum):
    """Estados válidos de la máquina de estados de pedidos."""
    PENDIENTE = "PENDIENTE"
    EN_PRODUCCION = "EN_PRODUCCION"
    COMPLETADO = "COMPLETADO"
    CANCELADO = "CANCELADO"


# ---------------------------------------------------------------------------
# Schemas de entrada
# ---------------------------------------------------------------------------

class OrderBase(BaseModel):
    """Campos base compartidos por creación y lectura de pedidos."""

    cliente: str = Field(
        ...,
        min_length=3,
        max_length=255,
        description="Nombre del cliente o proyecto para el que se fabrica el casetón.",
        examples=["Constructora El Pinar S.A.S.", "Proyecto Torres del Norte"],
    )
    tipo_caseton_id: int = Field(
        ...,
        gt=0,
        description="ID del tipo de casetón a producir. Determina la receta BOM aplicada.",
        examples=[1, 2],
    )
    cantidad: int = Field(
        ...,
        gt=0,
        description="Número de unidades de casetón a fabricar.",
        examples=[50, 200],
    )
    fecha_entrega_estimada: date = Field(
        ...,
        description="Fecha estimada de entrega al cliente (formato YYYY-MM-DD).",
        examples=["2026-09-15"],
    )
    observaciones: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Notas adicionales o instrucciones especiales para producción.",
        examples=["Entregar en la obra principal, coordinar con el maestro de obra."],
    )

    @field_validator("cliente")
    @classmethod
    def clean_cliente(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 3:
            raise ValueError("El nombre del cliente debe tener al menos 3 caracteres.")
        return cleaned

    @field_validator("fecha_entrega_estimada")
    @classmethod
    def validate_fecha_futura(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("La fecha de entrega estimada no puede ser una fecha pasada.")
        return v


class OrderCreate(OrderBase):
    """Payload para registrar un nuevo pedido de producción."""

    # Hereda todos los campos de OrderBase.
    # El campo `creado_por` se infiere del JWT en el endpoint.
    # El `codigo_pedido` se genera automáticamente en el servicio.
    # El `estado` siempre inicia como 'PENDIENTE'.
    pass


class OrderStatusUpdate(BaseModel):
    """Payload para cambiar el estado de un pedido."""

    estado: OrderStatus = Field(
        ...,
        description=(
            "Nuevo estado del pedido. Transiciones válidas:\n"
            "  PENDIENTE → EN_PRODUCCION (ejecuta sp_descontar_receta)\n"
            "  PENDIENTE → CANCELADO\n"
            "  EN_PRODUCCION → COMPLETADO\n"
            "  EN_PRODUCCION → CANCELADO"
        ),
    )


# ---------------------------------------------------------------------------
# Schemas de salida
# ---------------------------------------------------------------------------

class OrderResponse(OrderBase):
    """Respuesta completa de un pedido de producción."""

    id: int = Field(..., description="Identificador único del pedido.")
    codigo_pedido: str = Field(
        ...,
        description="Código consecutivo único del pedido (formato PED-YYYY-XXXXX).",
        examples=["PED-2026-00001"],
    )
    estado: str = Field(..., description="Estado actual del pedido en la máquina de estados.")
    creado_por: int = Field(..., description="ID del usuario que registró el pedido.")
    tipo_caseton_nombre: Optional[str] = Field(
        default=None,
        description="Nombre del tipo de casetón (JOIN con tipos_caseton).",
        examples=["Casetón Lona 60x60"],
    )
    created_at: datetime = Field(..., description="Fecha y hora de creación (UTC).")
    updated_at: Optional[datetime] = Field(
        default=None, description="Fecha y hora de la última modificación (UTC)."
    )

    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    """Respuesta paginada para el listado de pedidos."""

    total: int = Field(..., description="Total de registros encontrados con los filtros aplicados.")
    skip: int = Field(..., description="Offset aplicado en la paginación.")
    limit: int = Field(..., description="Límite de registros por página.")
    items: list[OrderResponse] = Field(..., description="Lista de pedidos de producción.")
