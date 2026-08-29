"""
schemas/dashboard.py — Esquemas Pydantic v2 para el Dashboard de Auditoría, Trazabilidad y Reportes (HU15).

Estructuras de datos para KPIs globales del ERP, desglose de producción BOM,
kardex inmutable de movimientos de stock y logs de auditoría del sistema.
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DashboardKPIs(BaseModel):
    """Métricas clave consolidadas de alto nivel para el ERP."""
    total_pedidos: int = Field(..., description="Cantidad total histórica de pedidos de producción")
    pedidos_en_produccion: int = Field(..., description="Pedidos actualmente en estado EN_PRODUCCION")
    compras_mes_cop: Decimal = Field(..., description="Gasto total en compras durante el mes en curso (COP)")
    materiales_alerta_stock: int = Field(..., description="Cantidad de materias primas con stock <= stock mínimo")
    ajustes_pendientes: int = Field(..., description="Solicitudes de ajuste manual pendientes de doble firma")

    model_config = ConfigDict(from_attributes=True)


class ProductionByType(BaseModel):
    """Distribución y agregación de producción por tipo de casetón y naturaleza BOM."""
    tipo_caseton: str = Field(..., description="Nombre del tipo de casetón")
    naturaleza: str = Field(..., description="Naturaleza BOM: RECUPERABLE o PERDIDO")
    total_pedidos: int = Field(..., description="Cantidad de órdenes registradas")
    total_unidades: Decimal = Field(..., description="Total de unidades producidas o solicitadas")

    model_config = ConfigDict(from_attributes=True)


class StockMovementAuditItem(BaseModel):
    """Ítem detallado de trazabilidad de Kardex de movimientos de inventario."""
    id: int
    material_nombre: str
    tipo_movimiento: str
    cantidad: Decimal
    stock_antes: Decimal
    stock_despues: Decimal
    referencia_tipo: Optional[str] = None
    referencia_id: Optional[int] = None
    usuario_nombre: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StockMovementListResponse(BaseModel):
    """Respuesta paginada para la trazabilidad de movimientos de inventario."""
    items: List[StockMovementAuditItem]
    total: int
    page: int
    limit: int
    total_pages: int


class AuditLogItem(BaseModel):
    """Ítem de auditoría del sistema sobre acciones realizadas."""
    id: int
    accion: str
    entidad: str
    entidad_id: Optional[int] = None
    usuario_nombre: Optional[str] = None
    ip_address: Optional[str] = None
    detalles_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(BaseModel):
    """Respuesta paginada para los logs de auditoría administrativa."""
    items: List[AuditLogItem]
    total: int
    page: int
    limit: int
    total_pages: int


class DashboardMetricsResponse(BaseModel):
    """Respuesta agregada completa para el panel principal del Dashboard."""
    kpis: DashboardKPIs
    produccion_por_tipo: List[ProductionByType]

    model_config = ConfigDict(from_attributes=True)
