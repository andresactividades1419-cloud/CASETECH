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
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.material import Material
    from app.models.user import User


class StockAdjustment(Base):
    """
    Solicitudes de ajuste manual de inventario con doble firma (solicitante y aprobador).
    Tabla: ajustes_inventario
    """

    __tablename__ = "ajustes_inventario"
    __table_args__ = (
        CheckConstraint(
            "tipo_ajuste IN ('MERMA', 'DEVOLUCION_PROVEEDOR', 'CONTEO_FISICO', 'SOBRANTE')",
            name="ck_ajustes_tipo_ajuste",
        ),
        CheckConstraint(
            "LENGTH(justificacion) >= 20",
            name="ck_ajustes_justificacion_min_length",
        ),
        CheckConstraint(
            "estado IN ('PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO')",
            name="ck_ajustes_estado",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    material_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("materiales.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    tipo_ajuste: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    cantidad: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    stock_antes: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    stock_despues: Mapped[Decimal | None] = mapped_column(Numeric(12, 3), nullable=True)
    justificacion: Mapped[str] = mapped_column(Text, nullable=False)
    estado: Mapped[str] = mapped_column(
        String(25),
        nullable=False,
        default="PENDIENTE_APROBACION",
        server_default="PENDIENTE_APROBACION",
        index=True,
    )
    solicitado_por: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("usuarios.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    aprobado_por: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("usuarios.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    fecha_solicitud: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    fecha_aprobacion: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relaciones
    material: Mapped["Material"] = relationship("Material", back_populates="ajustes")
    solicitante: Mapped["User"] = relationship(
        "User", back_populates="ajustes_solicitados", foreign_keys=[solicitado_por]
    )
    aprobador: Mapped[Optional["User"]] = relationship(
        "User", back_populates="ajustes_aprobados", foreign_keys=[aprobado_por]
    )

    def __repr__(self) -> str:
        return (
            f"<StockAdjustment(id={self.id}, material_id={self.material_id}, "
            f"tipo='{self.tipo_ajuste}', estado='{self.estado}')>"
        )
