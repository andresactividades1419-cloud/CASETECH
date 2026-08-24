from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import BigInteger, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class Role(Base):
    """
    Catálogo de roles del sistema (ADMINISTRADOR, OPERARIO).
    Tabla: roles
    """
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    nombre: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True, index=True
    )
    descripcion: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relación inversa con usuarios
    usuarios: Mapped[List["User"]] = relationship(
        "User", back_populates="rol", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"<Role(id={self.id}, nombre='{self.nombre}')>"
