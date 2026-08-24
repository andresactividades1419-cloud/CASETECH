from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.material import Material
    from app.models.user import User


class StockMovement(Base):
    """
    Log inmutable de todos los movimientos de inventario.
    Tabla: movimientos_inventario
    """
    __tablename__ = "movimientos_inventario"
    __table_args__ = (
        CheckConstraint(
            "tipo_movimiento IN ("
            "'INGRESO_COMPRA', "
            "'DESCUENTO_PRODUCCION', "
            "'DESCUENTO_PRODUCCION_DEFINITIVO', "
            "'DEVOLUCION_CANCELACION', "
            "'AJUSTE_APROBADO'"
            ")",
            name="ck_movimientos_tipo_movimiento",
        ),
        CheckConstraint(
            "referencia_tipo IS NULL OR referencia_tipo IN ('PEDIDO', 'COMPRA', 'AJUSTE')",
            name="ck_movimientos_referencia_tipo",
        ),
    )

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    material_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("materiales.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    tipo_movimiento: Mapped[str] = mapped_column(
        String(40), nullable=False, index=True
    )
    cantidad: Mapped[Decimal] = mapped_column(
        Numeric(12, 3), nullable=False
    )
    stock_antes: Mapped[Decimal] = mapped_column(
        Numeric(12, 3), nullable=False
    )
    stock_despues: Mapped[Decimal] = mapped_column(
        Numeric(12, 3), nullable=False
    )
    referencia_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    referencia_tipo: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, index=True
    )
    ejecutado_por: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )

    # Relaciones
    material: Mapped["Material"] = relationship("Material", back_populates="movimientos")
    ejecutor: Mapped[Optional["User"]] = relationship(
        "User", back_populates="movimientos_ejecutados", foreign_keys=[ejecutado_por]
    )

    def __repr__(self) -> str:
        return (
            f"<StockMovement(id={self.id}, material_id={self.material_id}, "
            f"tipo='{self.tipo_movimiento}', cantidad={self.cantidad})>"
        )
