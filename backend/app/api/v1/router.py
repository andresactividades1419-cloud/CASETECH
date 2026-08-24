"""
api/v1/router.py — Router central de la versión 1 de la API CASETECH ERP.

Agrupa todos los sub-routers de los distintos dominios bajo el prefijo
``/api/v1``. Cada módulo de endpoints se registra aquí con su prefijo y tag.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, providers

api_router = APIRouter()

# -----------------------------------------------------------------------
# Autenticación y gestión de usuarios  (HU01, HU14)
# -----------------------------------------------------------------------
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Autenticación"],
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
# Futuros dominios:
#   api_router.include_router(materials.router, prefix="/materials", tags=["Materiales"])
#   api_router.include_router(orders.router,    prefix="/orders",    tags=["Pedidos"])
# -----------------------------------------------------------------------
