from datetime import date, datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.product_type import ProductType
    from app.models.user import User


class Order(Base):
    """
    Órdenes de producción de casetones con máquina de estados.
    Tabla: pedidos
    """
    __tablename__ = "pedidos"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('PENDIENTE', 'EN_PRODUCCION', 'COMPLETADO', 'CANCELADO')",
            name="ck_pedidos_estado",
        ),
        CheckConstraint("cantidad > 0", name="ck_pedidos_cantidad_positive"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    codigo_pedido: Mapped[str] = mapped_column(
        String(20), nullable=False, unique=True, index=True
    )
    cliente: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    tipo_caseton_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("tipos_caseton.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    cantidad: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDIENTE", server_default="PENDIENTE", index=True
    )
    fecha_entrega_estimada: Mapped[date] = mapped_column(
        Date, nullable=False
    )
    creado_por: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    observaciones: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, onupdate=func.now()
    )

    # Relaciones
    tipo_caseton: Mapped["ProductType"] = relationship("ProductType", back_populates="pedidos")
    creador: Mapped["User"] = relationship("User", back_populates="pedidos_creados", foreign_keys=[creado_por])

    def __repr__(self) -> str:
        return (
            f"<Order(id={self.id}, codigo='{self.codigo_pedido}', cliente='{self.cliente}', "
            f"estado='{self.estado}')>"
        )
