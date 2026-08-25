"""
main.py — Punto de entrada de la aplicación FastAPI CASETECH ERP.

Responsabilidades:
- Instanciación de FastAPI con metadatos OpenAPI.
- Configuración del middleware CORS.
- Registro del router v1 bajo el prefijo ``/api/v1``.
- Eventos de ciclo de vida (startup / shutdown).
- Health-check accesible sin autenticación.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.init_db import init_db

# ---------------------------------------------------------------------------
# Ciclo de vida de la aplicación (lifespan handler — FastAPI 0.110+)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Gestor de ciclo de vida async de FastAPI.

    Startup : Siembra automática de roles y usuarios iniciales si la BD es nueva.
    Shutdown: Cierre limpio de recursos.
    """
    # --- Startup ---
    await init_db()
    yield
    # --- Shutdown ---


# ---------------------------------------------------------------------------
# Instancia principal de FastAPI
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "API REST del ERP CASETECH para gestión de producción, inventario, "
        "pedidos y compras de casetones de concreto. "
        "Autenticación vía JWT Bearer (OAuth2)."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware CORS
# ---------------------------------------------------------------------------
# En producción, reemplazar ["*"] por los orígenes permitidos explícitamente.
# Ejemplo: ["https://app.casetech.com", "https://admin.casetech.com"]
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # ← Restringir en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Registro de routers
# ---------------------------------------------------------------------------

app.include_router(
    api_router,
    prefix=settings.API_V1_STR,  # /api/v1
)


# ---------------------------------------------------------------------------
# Health-check (sin autenticación)
# ---------------------------------------------------------------------------

@app.get(
    "/health",
    tags=["Infraestructura"],
    summary="Estado del servicio",
    description="Endpoint de comprobación de salud para load balancers y orquestadores.",
    response_description="Objeto con status y versión del servicio.",
)
async def health_check() -> dict[str, str]:
    """
    Responde con HTTP 200 y un payload mínimo que indica que el servicio
    está levantado y la versión activa.
    """
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }
