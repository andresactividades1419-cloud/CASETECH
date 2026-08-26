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
from app.schemas.order import (
    OrderBase,
    OrderCreate,
    OrderStatusUpdate,
    OrderResponse,
    OrderListResponse,
    OrderStatus,
)
from app.schemas.product_type import ProductTypeResponse, ProductTypeListResponse

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
    # Order
    "OrderBase",
    "OrderCreate",
    "OrderStatusUpdate",
    "OrderResponse",
    "OrderListResponse",
    "OrderStatus",
    # ProductType
    "ProductTypeResponse",
    "ProductTypeListResponse",
]
