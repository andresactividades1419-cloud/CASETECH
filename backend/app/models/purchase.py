from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.provider import Provider
    from app.models.user import User
    from app.models.purchase_detail import PurchaseDetail


class Purchase(Base):
    """
    Cabecera de órdenes de compra a proveedores.
    Tabla: compras
    """
    __tablename__ = "compras"
    __table_args__ = (
        CheckConstraint("total >= 0", name="ck_compras_total_non_negative"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    codigo_compra: Mapped[str] = mapped_column(
        String(20), nullable=False, unique=True, index=True
    )
    proveedor_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("proveedores.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    fecha_compra: Mapped[date] = mapped_column(
        Date, nullable=False
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=Decimal("0.00"), server_default="0"
    )
    registrado_por: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    observaciones: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relaciones
    proveedor: Mapped["Provider"] = relationship("Provider", back_populates="compras")
    registrador: Mapped["User"] = relationship("User", back_populates="compras_registradas", foreign_keys=[registrado_por])
    detalles: Mapped[List["PurchaseDetail"]] = relationship(
        "PurchaseDetail", back_populates="compra", cascade="all, delete-orphan", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"<Purchase(id={self.id}, codigo='{self.codigo_compra}', total={self.total})>"
