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



class UserUpdate(BaseModel):
    """Payload para actualizar datos de un usuario (Admin)."""
    nombre_completo: str | None = Field(None, min_length=2, max_length=255)
    email: EmailStr | None = None
    rol_id: int | None = Field(None, gt=0)
    activo: bool | None = None
    password: str | None = Field(None, min_length=8, max_length=128)


class UserAdminResponse(UserRead):
    """Representación enriquecida de usuario con nombre de rol para panel admin."""
    rol_nombre: str | None = Field(default=None, description="Nombre del rol asignado.")


class UserListResponse(BaseModel):
    """Lista de usuarios para administración."""
    total: int
    items: list[UserAdminResponse]

