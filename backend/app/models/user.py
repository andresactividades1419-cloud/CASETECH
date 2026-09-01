from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.audit_log import AuditLog
    from app.models.order import Order
    from app.models.purchase import Purchase
    from app.models.role import Role
    from app.models.stock_adjustment import StockAdjustment
    from app.models.stock_movement import StockMovement


class User(Base):
    """
    Usuarios del sistema con roles y autenticación JWT (bcrypt).
    Tabla: usuarios
    """
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint(
            "email LIKE '%@%.%'",
            name="ck_usuarios_email_format",
        ),
    )


    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    nombre_completo: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    password_hash: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    rol_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    activo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, onupdate=func.now()
    )

    # Relaciones ORM
    rol: Mapped["Role"] = relationship("Role", back_populates="usuarios")
    pedidos_creados: Mapped[list["Order"]] = relationship(
        "Order", back_populates="creador", foreign_keys="Order.creado_por"
    )
    compras_registradas: Mapped[list["Purchase"]] = relationship(
        "Purchase", back_populates="registrador", foreign_keys="Purchase.registrado_por"
    )
    ajustes_solicitados: Mapped[list["StockAdjustment"]] = relationship(
        "StockAdjustment", back_populates="solicitante", foreign_keys="StockAdjustment.solicitado_por"
    )
    ajustes_aprobados: Mapped[list["StockAdjustment"]] = relationship(
        "StockAdjustment", back_populates="aprobador", foreign_keys="StockAdjustment.aprobado_por"
    )
    movimientos_ejecutados: Mapped[list["StockMovement"]] = relationship(
        "StockMovement", back_populates="ejecutor", foreign_keys="StockMovement.ejecutado_por"
    )
    auditorias: Mapped[list["AuditLog"]] = relationship(
        "AuditLog", back_populates="usuario", foreign_keys="AuditLog.usuario_id"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', activo={self.activo})>"
