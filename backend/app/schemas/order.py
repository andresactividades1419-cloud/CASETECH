"""
schemas/order.py — Esquemas Pydantic v2 para el módulo de Pedidos de Producción (HU07, HU08, HU11).

Modelo de datos:
  - Un pedido está vinculado a un tipo de casetón (tipo_caseton_id).
  - El motor BOM (sp_descontar_receta) aplica el descuento de materiales
    de forma automática basándose en la tabla `recetas`.
  - Estados válidos: PENDIENTE → EN_PRODUCCION → COMPLETADO | CANCELADO
"""

from datetime import date, datetime
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


class RecipePreviewItem(BaseModel):
    """Detalle de consumo por material en la receta BOM."""

    material_id: int = Field(..., description="ID de la materia prima.")
    material_nombre: str = Field(..., description="Nombre del material.")
    unidad_medida: str = Field(
        ..., description="Unidad de medida (ej. M2, M, KG, UNIDAD)."
    )
    cantidad_por_unidad: float = Field(
        ..., description="Consumo por unidad de casetón."
    )
    cantidad_total_requerida: float = Field(
        ..., description="Consumo total para el pedido completo."
    )
    stock_actual: float = Field(
        ..., description="Stock actualmente disponible en inventario."
    )
    deficit: float = Field(
        default=0.0, description="Déficit de material si el stock es insuficiente."
    )
    suficiente: bool = Field(
        ..., description="Indica si hay suficiente stock para cubrir el pedido."
    )

    # Campos opcionales para compatibilidad con develop
    cantidad_requerida: float | None = None
    stock_disponible: float | None = None


# Alias para retrocompatibilidad
RecipeItemPreview = RecipePreviewItem


class OrderRecipePreviewResponse(BaseModel):
    """Respuesta completa de la explosión y viabilidad de la receta BOM para un pedido."""

    order_id: int = Field(..., description="ID del pedido.")
    codigo_pedido: str = Field(
        ..., description="Código del pedido (ej. PED-2026-00001)."
    )
    cliente: str | None = Field(
        default=None, description="Nombre del cliente del pedido."
    )
    tipo_caseton_id: int | None = Field(
        default=None, description="ID del tipo de casetón."
    )
    tipo_caseton_nombre: str | None = Field(
        default=None, description="Nombre del tipo de casetón."
    )
    cantidad: int = Field(..., description="Cantidad de unidades a fabricar.")
    es_viable: bool = Field(
        ..., description="True si todas las materias primas tienen stock suficiente."
    )
    materiales: list[RecipePreviewItem] = Field(
        ..., description="Lista de materiales requeridos y su balance."
    )
    resumen_deficits: list[str] = Field(
        default_factory=list,
        description="Lista textual de mensajes descriptivos de déficit.",
    )

    # Campos alias para compatibilidad con develop
    pedido_id: int | None = None
    tipo_caseton: str | None = None
    cantidad_casetones: int | None = None
    es_factible: bool | None = None
    items: list[RecipePreviewItem] | None = None
