"""
schemas/user.py — Esquemas Pydantic v2 para el modelo Usuario de CASETECH ERP.

Cubre:
- UserBase      → campos compartidos (email, nombre_completo, activo).
- UserCreate    → payload de registro con contraseña y rol_id.
- UserRead      → respuesta pública ORM-serializable con auditoría.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    """
    Campos comunes que todos los esquemas de usuario comparten.

    El email se valida con ``EmailStr`` (requiere ``pydantic[email]``
    o el paquete ``email-validator``).
    """

    email: EmailStr = Field(
        ...,
        description="Dirección de correo electrónico única del usuario.",
        examples=["juan.perez@casetech.com"],
    )
    nombre_completo: str = Field(
        ...,
        min_length=2,
        max_length=255,
        description="Nombre completo del usuario.",
        examples=["Juan Pérez García"],
    )
    activo: bool = Field(
        default=True,
        description="Indica si la cuenta está habilitada para operar.",
    )


class UserCreate(UserBase):
    """
    Payload para registrar un nuevo usuario (HU14 — solo ADMINISTRADOR).

    Añade la contraseña en texto plano (que se hasheará antes de persistir)
    y el identificador del rol que se le asignará.
    """

    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Contraseña en texto plano. Mínimo 8 caracteres.",
        examples=["S3cur3P@ss!"],
    )
    rol_id: int = Field(
        ...,
        gt=0,
        description="FK del rol que se asignará al nuevo usuario.",
        examples=[1],
    )

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """
        Verifica que la contraseña cumpla requisitos mínimos de complejidad:
        - Al menos 8 caracteres (ya garantizado por ``min_length``).
        - Al menos una letra mayúscula.
        - Al menos un dígito numérico.
        """
        if not any(c.isupper() for c in v):
            raise ValueError(
                "La contraseña debe contener al menos una letra mayúscula."
            )
        if not any(c.isdigit() for c in v):
            raise ValueError(
                "La contraseña debe contener al menos un dígito numérico."
            )
        return v


class UserRead(UserBase):
    """
    Representación pública del usuario devuelta por la API.

    Configurado con ``from_attributes = True`` para deserializar
    directamente desde instancias ORM de SQLAlchemy.
    """

    id: int = Field(..., description="PK del usuario.", examples=[1])
    rol_id: int = Field(..., description="FK del rol asignado.", examples=[1])
    created_at: datetime = Field(..., description="Timestamp de creación UTC.")
    updated_at: datetime | None = Field(
        default=None, description="Timestamp de última modificación UTC."
    )

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Schemas para Gestión Administrativa de Usuarios (HU02)
# ---------------------------------------------------------------------------

class UserUpdateAdmin(BaseModel):
    """Payload para actualizar usuarios por parte del Administrador."""

    nombre_completo: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
        description="Nombre completo del usuario.",
    )
    email: EmailStr | None = Field(
        default=None,
        description="Nuevo correo electrónico del usuario.",
    )
    rol_id: int | None = Field(
        default=None,
        gt=0,
        description="Nuevo ID de rol asignado (1: ADMINISTRADOR, 2: OPERARIO).",
    )
    activo: bool | None = Field(
        default=None,
        description="Estado activo o inactivo de la cuenta.",
    )
    password: str | None = Field(
        default=None,
        min_length=8,
        max_length=128,
        description="Nueva contraseña (opcional). Si se envía, se rehashea.",
    )

    @field_validator("password")
    @classmethod
    def validate_new_password(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula.")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un dígito numérico.")
        return v


class UserAdminRead(BaseModel):
    """Representación enriquecida del usuario para la vista de administración."""

    id: int
    nombre_completo: str
    email: str
    rol_id: int
    rol_nombre: str
    activo: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """Listado paginado/completo de usuarios para el panel de administración."""

    total: int
    items: list[UserAdminRead]

