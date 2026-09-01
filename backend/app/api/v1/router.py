"""
api/v1/router.py — Router central de la versión 1 de la API CASETECH ERP.

Agrupa todos los sub-routers de los distintos dominios bajo el prefijo
``/api/v1``. Cada módulo de endpoints se registra aquí con su prefijo y tag.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    dashboard,
    materials,
    providers,
    purchases,
    reports,
    stock_adjustments,
    users,
)
from app.api.v1.endpoints.orders import product_types_router
from app.api.v1.endpoints.orders import router as orders_router

api_router = APIRouter()

# -----------------------------------------------------------------------
# Dashboard, Métricas y Auditoría  (HU14, HU15)
# -----------------------------------------------------------------------
api_router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["Dashboard & Auditoría"],
)

# -----------------------------------------------------------------------
# Reportes y Exportación de Datos  (HU06, RF12)
# -----------------------------------------------------------------------
api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["Reportes"],
)


# -----------------------------------------------------------------------
# Autenticación  (HU01)
# -----------------------------------------------------------------------
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Autenticación"],
)

# -----------------------------------------------------------------------
# Administración de Usuarios  (HU02, HU14)
# -----------------------------------------------------------------------
api_router.include_router(
    users.router,
    prefix="/users",
    tags=["Usuarios"],
)

# -----------------------------------------------------------------------
# Proveedores  (HU02, HU03)
# -----------------------------------------------------------------------
api_router.include_router(
    providers.router,
    prefix="/providers",
    tags=["Proveedores"],
)

# -----------------------------------------------------------------------
# Materiales e Insumos  (HU10, HU12)
# -----------------------------------------------------------------------
api_router.include_router(
    materials.router,
    prefix="/materials",
    tags=["Materiales"],
)

# -----------------------------------------------------------------------
# Compras a Proveedores e Ingreso de Stock  (HU07 Compras)
# -----------------------------------------------------------------------
api_router.include_router(
    purchases.router,
    prefix="/purchases",
    tags=["Compras"],
)

# -----------------------------------------------------------------------
# Pedidos de Producción + Motor BOM  (HU07, HU08, HU11)
# -----------------------------------------------------------------------
api_router.include_router(
    orders_router,
    prefix="/orders",
    tags=["Pedidos"],
)

# -----------------------------------------------------------------------
# Catálogo de Tipos de Casetón  (selector frontend)
# -----------------------------------------------------------------------
api_router.include_router(
    product_types_router,
    prefix="/product-types",
    tags=["Tipos de Casetón"],
)

# -----------------------------------------------------------------------
# Ajustes Manuales de Inventario y Auditoría  (HU13)
# -----------------------------------------------------------------------
api_router.include_router(
    stock_adjustments.router,
    prefix="/stock-adjustments",
    tags=["Ajustes de Inventario"],
)
