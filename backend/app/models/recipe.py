from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.material import Material
    from app.models.product_type import ProductType


class Recipe(Base):
    """
    Lista de materiales (BOM) por tipo de casetón.
    Tabla: recetas
    """

    __tablename__ = "recetas"
    __table_args__ = (
        UniqueConstraint(
            "tipo_caseton_id", "material_id", name="uq_receta_tipo_material"
        ),
        CheckConstraint("cantidad_por_unidad > 0", name="ck_recetas_cantidad_positive"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tipo_caseton_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("tipos_caseton.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    material_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("materiales.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    cantidad_por_unidad: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relaciones
    tipo_caseton: Mapped["ProductType"] = relationship(
        "ProductType", back_populates="recetas"
    )
    material: Mapped["Material"] = relationship("Material", back_populates="recetas")

    def __repr__(self) -> str:
        return (
            f"<Recipe(id={self.id}, tipo_caseton_id={self.tipo_caseton_id}, "
            f"material_id={self.material_id}, cantidad={self.cantidad_por_unidad})>"
        )
