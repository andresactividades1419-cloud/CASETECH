"""
schemas/ — Esquemas Pydantic v2 de validación y serialización para CASETECH ERP.
"""

from app.schemas.dashboard import (
    AuditLogItem,
    AuditLogListResponse,
    DashboardKPIs,
    DashboardMetricsResponse,
    ProductionByType,
    StockMovementAuditItem,
    StockMovementListResponse,
)
from app.schemas.material import (
    MaterialBase,
    MaterialCreate,
    MaterialListResponse,
    MaterialResponse,
    MaterialStatusUpdate,
    MaterialUpdate,
)
from app.schemas.order import (
    OrderBase,
    OrderCreate,
    OrderListResponse,
    OrderRecipePreviewResponse,
    OrderResponse,
    OrderStatus,
    OrderStatusUpdate,
    RecipeItemPreview,
)
from app.schemas.product_type import ProductTypeListResponse, ProductTypeResponse
from app.schemas.provider import (
    ProviderBase,
    ProviderCreate,
    ProviderListResponse,
    ProviderRead,
    ProviderUpdate,
)
from app.schemas.purchase import (
    PurchaseCreate,
    PurchaseItemCreate,
    PurchaseItemResponse,
    PurchaseListResponse,
    PurchaseResponse,
)
from app.schemas.role import RoleBase, RoleCreate, RoleRead
from app.schemas.stock_adjustment import (
    AdjustmentStatus,
    AdjustmentType,
    StockAdjustmentBase,
    StockAdjustmentCreate,
    StockAdjustmentListResponse,
    StockAdjustmentResponse,
    StockAdjustmentReview,
)
from app.schemas.token import Token, TokenPayload
from app.schemas.user import (
    UserAdminRead,
    UserBase,
    UserCreate,
    UserListResponse,
    UserRead,
    UserResponse,
    UserStatusToggle,
    UserUpdate,
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
    "UserUpdate",
    "UserStatusToggle",
    "UserAdminRead",
    "UserResponse",
    "UserListResponse",
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
    "RecipeItemPreview",
    "OrderRecipePreviewResponse",
    # ProductType
    "ProductTypeResponse",
    "ProductTypeListResponse",
    # Purchase
    "PurchaseCreate",
    "PurchaseItemCreate",
    "PurchaseItemResponse",
    "PurchaseListResponse",
    "PurchaseResponse",
    # StockAdjustment
    "AdjustmentStatus",
    "AdjustmentType",
    "StockAdjustmentBase",
    "StockAdjustmentCreate",
    "StockAdjustmentListResponse",
    "StockAdjustmentResponse",
    "StockAdjustmentReview",
    # Dashboard
    "AuditLogItem",
    "AuditLogListResponse",
    "DashboardKPIs",
    "DashboardMetricsResponse",
    "ProductionByType",
    "StockMovementAuditItem",
    "StockMovementListResponse",
]
