"""
schemas/provider.py — Esquemas Pydantic v2 para el módulo de Proveedores (HU02/HU03).

Alineados con la tabla ``proveedores`` del modelo ORM Provider:
  - nit               → String(20), único
  - nombre_empresa    → String(255)
  - contacto_nombre   → String(255), nullable
  - contacto_telefono → String(20),  nullable
  - contacto_email    → String(255), nullable
  - direccion         → Text,        nullable
  - activo            → Boolean
"""

import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

# ---------------------------------------------------------------------------
# Validador de NIT reutilizable
# ---------------------------------------------------------------------------

_NIT_PATTERN = re.compile(r"^[\w\-]+$")  # letras, dígitos, guión y guión bajo


def _validate_nit(v: str) -> str:
    """Rechaza NITs con caracteres especiales distintos a '-' y '_'."""
    v = v.strip()
    if not _NIT_PATTERN.match(v):
        raise ValueError(
            "El NIT solo puede contener letras, dígitos, guiones (-) y guiones bajos (_)."
        )
    return v


# ---------------------------------------------------------------------------
# ProviderBase — campos comunes
# ---------------------------------------------------------------------------


class ProviderBase(BaseModel):
    """
    Campos compartidos entre creación, actualización y lectura de proveedores.
    Los nombres de campo siguen la nomenclatura del ORM (tabla ``proveedores``).
    """

    nit: str = Field(
        ...,
        min_length=3,
        max_length=20,
        description="NIT o RUC del proveedor. Solo caracteres alfanuméricos y guiones.",
        examples=["900123456-1"],
    )
    nombre_empresa: str = Field(
        ...,
        min_length=2,
        max_length=255,
        description="Razón social o nombre comercial del proveedor.",
        examples=["Materiales del Valle S.A.S."],
    )
    contacto_nombre: str | None = Field(
        default=None,
        max_length=255,
        description="Nombre del contacto principal en la empresa proveedora.",
        examples=["Carlos Martínez"],
    )
    contacto_telefono: str | None = Field(
        default=None,
        max_length=20,
        description="Teléfono del contacto (incluye indicativo si aplica).",
        examples=["+57 321 456 7890"],
    )
    contacto_email: EmailStr | None = Field(
        default=None,
        description="Correo electrónico del contacto principal.",
        examples=["carlos@materiales.com"],
    )
    direccion: str | None = Field(
        default=None,
        max_length=1000,
        description="Dirección física de la sede del proveedor.",
        examples=["Calle 15 # 32-41, Cali, Valle del Cauca"],
    )

    @field_validator("nit")
    @classmethod
    def nit_sin_caracteres_especiales(cls, v: str) -> str:
        return _validate_nit(v)


# ---------------------------------------------------------------------------
# ProviderCreate — payload de registro (solo ADMINISTRADOR)
# ---------------------------------------------------------------------------


class ProviderCreate(ProviderBase):
    """
    Payload para registrar un nuevo proveedor mediante ``sp_crear_proveedor``.
    ``nit`` y ``nombre_empresa`` son obligatorios; heredados de ProviderBase.
    """

    pass


# ---------------------------------------------------------------------------
# ProviderUpdate — actualización parcial (PATCH semántico sobre PUT)
# ---------------------------------------------------------------------------


class ProviderUpdate(BaseModel):
    """
    Campos editables de un proveedor. Todos son opcionales para permitir
    actualizaciones parciales. El ``nit`` es inmutable y no se incluye.
    """

    nombre_empresa: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
        description="Nueva razón social del proveedor.",
    )
    contacto_nombre: str | None = Field(
        default=None,
        max_length=255,
        description="Nuevo nombre del contacto principal.",
    )
    contacto_telefono: str | None = Field(
        default=None,
        max_length=20,
        description="Nuevo teléfono de contacto.",
    )
    contacto_email: EmailStr | None = Field(
        default=None,
        description="Nuevo correo electrónico del contacto.",
    )
    direccion: str | None = Field(
        default=None,
        max_length=1000,
        description="Nueva dirección del proveedor.",
    )


# ---------------------------------------------------------------------------
# ProviderRead — representación pública / respuesta de la API
# ---------------------------------------------------------------------------


class ProviderRead(ProviderBase):
    """
    Respuesta pública completa de un proveedor, incluyendo campos generados
    por la base de datos. Configurado con ``from_attributes = True`` para
    deserializar directamente desde instancias ORM de SQLAlchemy.
    """

    id: int = Field(..., description="Identificador único del proveedor.", examples=[1])
    activo: bool = Field(
        ..., description="Indica si el proveedor está activo en el sistema."
    )
    created_at: datetime = Field(..., description="Timestamp de creación en UTC.")
    updated_at: datetime | None = Field(
        default=None,
        description="Timestamp de la última modificación en UTC.",
    )

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# ProviderListResponse — wrapper de paginación
# ---------------------------------------------------------------------------


class ProviderListResponse(BaseModel):
    """Respuesta paginada para el listado de proveedores."""

    total: int = Field(..., description="Total de registros que cumplen el filtro.")
    skip: int = Field(..., description="Offset aplicado en la consulta.")
    limit: int = Field(..., description="Límite de registros por página.")
    items: list[ProviderRead]
