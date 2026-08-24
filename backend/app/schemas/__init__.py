"""
schemas/ — Esquemas Pydantic v2 de validación y serialización para CASETECH ERP.
"""

from app.schemas.role import RoleBase, RoleCreate, RoleRead
from app.schemas.user import UserBase, UserCreate, UserRead
from app.schemas.token import Token, TokenPayload
from app.schemas.provider import (
    ProviderBase,
    ProviderCreate,
    ProviderUpdate,
    ProviderRead,
    ProviderListResponse,
)
from app.schemas.material import (
    MaterialBase,
    MaterialCreate,
    MaterialUpdate,
    MaterialStatusUpdate,
    MaterialResponse,
    MaterialListResponse,
)

__all__ = [
    # Role
    "RoleBase",
    "RoleCreate",
    "RoleRead",
    # User
    "UserBase",
    "UserCreate",
    "UserRead",
    # Token
    "Token",
    "TokenPayload",
    # Provider
    "ProviderBase",
    "ProviderCreate",
    "ProviderUpdate",
    "ProviderRead",
    "ProviderListResponse",
    # Material
    "MaterialBase",
    "MaterialCreate",
    "MaterialUpdate",
    "MaterialStatusUpdate",
    "MaterialResponse",
    "MaterialListResponse",
]
