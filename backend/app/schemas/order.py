"""
schemas/order.py — Esquemas Pydantic v2 para el módulo de Pedidos de Producción (HU07, HU08, HU11).

Modelo de datos real:
  - Un pedido está vinculado a un tipo de casetón (tipo_caseton_id).
  - El motor BOM (sp_descontar_receta) aplica el descuento de materiales
    de forma automática basándose en la tabla `recetas`.
  - Estados válidos: PENDIENTE → EN_PRODUCCION → COMPLETADO | CANCELADO
"""

from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------------------
# Enum de estados válidos según constraint de BD
# ---------------------------------------------------------------------------


class OrderStatus(StrEnum):
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
    observaciones: str | None = Field(
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
            raise ValueError(
                "La fecha de entrega estimada no puede ser una fecha pasada."
            )
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
    estado: str = Field(
        ..., description="Estado actual del pedido en la máquina de estados."
    )
    creado_por: int = Field(..., description="ID del usuario que registró el pedido.")
    tipo_caseton_nombre: str | None = Field(
        default=None,
        description="Nombre del tipo de casetón (JOIN con tipos_caseton).",
        examples=["Casetón Lona 60x60"],
    )
    created_at: datetime = Field(..., description="Fecha y hora de creación (UTC).")
    updated_at: datetime | None = Field(
        default=None, description="Fecha y hora de la última modificación (UTC)."
    )

    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    """Respuesta paginada para el listado de pedidos."""

    total: int = Field(
        ..., description="Total de registros encontrados con los filtros aplicados."
    )
    skip: int = Field(..., description="Offset aplicado en la paginación.")
    limit: int = Field(..., description="Límite de registros por página.")
    items: list[OrderResponse] = Field(
        ..., description="Lista de pedidos de producción."
    )


# ---------------------------------------------------------------------------
# Schemas de Previsualización BOM (HU11)
# ---------------------------------------------------------------------------


class RecipeItemPreview(BaseModel):
    """Detalle de consumo por material en la receta BOM con precisión decimal."""

    material_id: int = Field(..., description="ID de la materia prima.")
    material_nombre: str = Field(..., description="Nombre del material.")
    unidad_medida: str = Field(
        ..., description="Unidad de medida (ej. M2, M, KG, UNIDAD)."
    )
    cantidad_requerida: Decimal = Field(
        ..., description="Consumo total requerido para el pedido completo."
    )
    stock_disponible: Decimal = Field(
        ..., description="Stock actualmente disponible en inventario."
    )
    deficit: Decimal = Field(
        default=Decimal("0.0"),
        description="Déficit de material si el stock es insuficiente (0 si stock >= requerido).",
    )
    suficiente: bool = Field(
        ..., description="Indica si hay suficiente stock para cubrir el pedido."
    )

    # Campos auxiliares para compatibilidad de frontend
    cantidad_por_unidad: Decimal | None = Field(
        default=None, description="Consumo unitario por casetón."
    )
    cantidad_total_requerida: Decimal | None = Field(
        default=None, description="Alias de cantidad_requerida."
    )
    stock_actual: Decimal | None = Field(
        default=None, description="Alias de stock_disponible."
    )


class OrderRecipePreviewResponse(BaseModel):
    """Respuesta completa de la explosión y viabilidad de la receta BOM para un pedido."""

    pedido_id: int = Field(..., description="Identificador único del pedido.")
    codigo_pedido: str = Field(
        ..., description="Código del pedido (ej. PED-2026-00001)."
    )
    tipo_caseton: str = Field(..., description="Nombre del tipo de casetón.")
    cantidad_casetones: int = Field(
        ..., description="Cantidad de casetones a fabricar."
    )
    es_factible: bool = Field(
        ..., description="True si todos los insumos tienen suficiente = True."
    )
    items: list[RecipeItemPreview] = Field(
        ..., description="Lista de insumos requeridos con cálculo de balance."
    )

    # Campos auxiliares para compatibilidad
    order_id: int | None = Field(default=None, description="Alias de pedido_id.")
    cliente: str | None = Field(
        default=None, description="Nombre del cliente del pedido."
    )
    tipo_caseton_id: int | None = Field(
        default=None, description="ID del tipo de casetón."
    )
    tipo_caseton_nombre: str | None = Field(
        default=None, description="Alias de tipo_caseton."
    )
    cantidad: int | None = Field(
        default=None, description="Alias de cantidad_casetones."
    )
    es_viable: bool | None = Field(default=None, description="Alias de es_factible.")
    materiales: list[RecipeItemPreview] | None = Field(
        default=None, description="Alias de items."
    )
    resumen_deficits: list[str] = Field(
        default_factory=list,
        description="Lista textual de mensajes descriptivos de déficit.",
    )
