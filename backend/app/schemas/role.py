"""
schemas/role.py — Esquemas Pydantic v2 para el catálogo de Roles (RBAC).
"""

from pydantic import BaseModel, Field


class RoleBase(BaseModel):
    """Campos comunes compartidos entre creación y lectura de roles."""

    nombre: str = Field(
        ...,
        min_length=2,
        max_length=50,
        description="Nombre único del rol (e.g. 'ADMINISTRADOR', 'OPERARIO').",
        examples=["ADMINISTRADOR"],
    )
    descripcion: str | None = Field(
        default=None,
        max_length=500,
        description="Descripción opcional del rol y sus permisos.",
        examples=["Acceso completo al sistema."],
    )


class RoleCreate(RoleBase):
    """
    Payload para crear un nuevo rol.
    Hereda todos los campos de RoleBase sin añadir campos extra;
    se mantiene como clase separada para flexibilidad futura.
    """

    pass


class RoleRead(RoleBase):
    """
    Representación pública de un rol, incluyendo su PK generada por la BD.
    Configurado con ``from_attributes = True`` para deserializar desde ORM.
    """

    id: int = Field(..., description="Identificador único del rol.", examples=[1])

    model_config = {"from_attributes": True}
