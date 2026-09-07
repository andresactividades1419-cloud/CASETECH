from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.recipe import Recipe


class ProductType(Base):
    """
    Catálogo de tipos de producto / casetón (BOM).
    Tabla: tipos_caseton

    No existe distinción RECUPERABLE/PERDIDO: los casetones se venden, no se
    alquilan, así que ninguno vuelve a la fábrica (Issue #78).
    """

    __tablename__ = "tipos_caseton"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relaciones
    recetas: Mapped[list["Recipe"]] = relationship(
        "Recipe", back_populates="tipo_caseton", passive_deletes=True
    )
    pedidos: Mapped[list["Order"]] = relationship(
        "Order", back_populates="tipo_caseton", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"<ProductType(id={self.id}, nombre='{self.nombre}')>"
