from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.recipe import Recipe
    from app.models.purchase_detail import PurchaseDetail
    from app.models.stock_movement import StockMovement
    from app.models.stock_adjustment import StockAdjustment


class Material(Base):
    """
    Inventario maestro de materias primas. Fuente de verdad del stock.
    Tabla: materiales
    """
    __tablename__ = "materiales"
    __table_args__ = (
        CheckConstraint("stock_actual >= 0", name="ck_materiales_stock_actual_non_negative"),
        CheckConstraint("stock_minimo >= 0", name="ck_materiales_stock_minimo_non_negative"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    nombre: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    unidad_medida: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    stock_actual: Mapped[Decimal] = mapped_column(
        Numeric(12, 3), nullable=False, default=Decimal("0.000"), server_default="0"
    )
    stock_minimo: Mapped[Decimal] = mapped_column(
        Numeric(12, 3), nullable=False, default=Decimal("0.000"), server_default="0"
    )
    activo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, onupdate=func.now()
    )

    # Relaciones
    recetas: Mapped[List["Recipe"]] = relationship(
        "Recipe", back_populates="material", passive_deletes=True
    )
    detalle_compras: Mapped[List["PurchaseDetail"]] = relationship(
        "PurchaseDetail", back_populates="material", passive_deletes=True
    )
    movimientos: Mapped[List["StockMovement"]] = relationship(
        "StockMovement", back_populates="material", passive_deletes=True
    )
    ajustes: Mapped[List["StockAdjustment"]] = relationship(
        "StockAdjustment", back_populates="material", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"<Material(id={self.id}, nombre='{self.nombre}', stock_actual={self.stock_actual})>"
