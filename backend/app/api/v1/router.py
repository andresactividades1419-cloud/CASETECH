"""
api/v1/router.py — Router central de la versión 1 de la API CASETECH ERP.

Agrupa todos los sub-routers de los distintos dominios bajo el prefijo
``/api/v1``. Cada módulo de endpoints se registra aquí con su prefijo y tag.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth

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
# Aquí se agregarán futuros dominios, por ejemplo:
#   api_router.include_router(products.router, prefix="/products", tags=["Productos"])
#   api_router.include_router(orders.router,   prefix="/orders",   tags=["Pedidos"])
# -----------------------------------------------------------------------
