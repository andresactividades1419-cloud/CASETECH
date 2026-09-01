from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Computed,
    ForeignKey,
    Numeric,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.material import Material
    from app.models.purchase import Purchase


class PurchaseDetail(Base):
    """
    Líneas de la orden de compra.
    Tabla: detalle_compras
    """

    __tablename__ = "detalle_compras"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_detalle_compras_cantidad_positive"),
        CheckConstraint(
            "precio_unitario >= 0", name="ck_detalle_compras_precio_non_negative"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    compra_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("compras.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    material_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("materiales.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    cantidad: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        Computed("cantidad * precio_unitario", persisted=True),
        nullable=False,
    )

    # Relaciones
    compra: Mapped["Purchase"] = relationship("Purchase", back_populates="detalles")
    material: Mapped["Material"] = relationship(
        "Material", back_populates="detalle_compras"
    )

    def __repr__(self) -> str:
        return (
            f"<PurchaseDetail(id={self.id}, compra_id={self.compra_id}, "
            f"material_id={self.material_id}, subtotal={self.subtotal})>"
        )
