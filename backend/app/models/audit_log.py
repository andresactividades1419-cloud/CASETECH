from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import JSON, BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

JSON_TYPE = JSONB().with_variant(JSON(), "sqlite")

if TYPE_CHECKING:
    from app.models.user import User


class AuditLog(Base):
    """
    Log de auditoría inmutable de todas las acciones del sistema.
    Tabla: auditoria_acciones
    """

    __tablename__ = "auditoria_acciones"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    usuario_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    accion: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entidad: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entidad_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    payload_antes: Mapped[dict[str, Any] | None] = mapped_column(
        JSON_TYPE, nullable=True
    )
    payload_despues: Mapped[dict[str, Any] | None] = mapped_column(
        JSON_TYPE, nullable=True
    )

    ip_origen: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )

    # Relaciones
    usuario: Mapped[Optional["User"]] = relationship(
        "User", back_populates="auditorias", foreign_keys=[usuario_id]
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog(id={self.id}, accion='{self.accion}', entidad='{self.entidad}', "
            f"entidad_id={self.entidad_id})>"
        )
