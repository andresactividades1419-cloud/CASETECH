from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.purchase import Purchase


class Provider(Base):
    """
    Directorio de proveedores con borrado lógico (campo activo) y NIT inmutable.
    Tabla: proveedores
    """

    __tablename__ = "proveedores"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nit: Mapped[str] = mapped_column(
        String(20), nullable=False, unique=True, index=True
    )
    nombre_empresa: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    contacto_nombre: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contacto_telefono: Mapped[str | None] = mapped_column(String(20), nullable=True)
    contacto_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    direccion: Mapped[str | None] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, onupdate=func.now()
    )

    # Relaciones
    compras: Mapped[list["Purchase"]] = relationship(
        "Purchase", back_populates="proveedor", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"<Provider(id={self.id}, nit='{self.nit}', empresa='{self.nombre_empresa}')>"
