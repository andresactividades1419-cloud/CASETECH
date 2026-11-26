"""
main.py — Punto de entrada de la aplicación FastAPI CASETECH ERP.

Responsabilidades:
- Instanciación de FastAPI con metadatos OpenAPI.
- Configuración del middleware CORS.
- Registro del router v1 bajo el prefijo ``/api/v1``.
- Eventos de ciclo de vida (startup / shutdown).
- Health-check accesible sin autenticación.
"""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.init_db import init_db
from app.core.limiter import limiter

logger = logging.getLogger("casetech.api")

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
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None,
    docs_url=f"{settings.API_V1_STR}/docs" if settings.DEBUG else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Rate Limiting (SlowAPI)
# ---------------------------------------------------------------------------
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]
app.add_middleware(SlowAPIMiddleware)


# ---------------------------------------------------------------------------
# Manejo global de errores no controlados
# ---------------------------------------------------------------------------
# ¿Qué? Atrapa cualquier excepción que ningún endpoint haya manejado.
# ¿Para qué? Que el cliente reciba siempre JSON con el mismo formato
# ({"detail": "..."}) en vez de texto plano, sin filtrar detalles internos
# (rutas, consultas SQL, nombres de tablas), y que el error real quede en el log.
# ¿Impacto? Los errores esperados (404, 409, 422...) siguen funcionando igual:
# ya los lanzan los servicios como HTTPException; esto solo cubre los imprevistos.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Error no controlado en %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Error interno del servidor. Intenta de nuevo; si el problema "
            "persiste, contacta al administrador."
        },
    )


# ---------------------------------------------------------------------------
# JSON mal formado (hallazgo bootcamp semana 4)
# ---------------------------------------------------------------------------
# ¿Qué? Si el cuerpo de la petición no es un JSON válido, responde 400 con el
# formato del contrato {"detail": "..."}. Los demás errores de validación
# (tipos o campos incorrectos) siguen con el 422 que da FastAPI por defecto.
# ¿Para qué? Antes respondía 422 con una lista interna de Pydantic
# ("json_invalid", "JSON decode error", posición del error), distinta al
# formato que el frontend espera para mostrar el mensaje.
# ¿Impacto? El frontend recibe siempre un "detail" legible ante un JSON roto.
@app.exception_handler(RequestValidationError)
async def request_validation_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    if any(error["type"] == "json_invalid" for error in exc.errors()):
        return JSONResponse(
            status_code=400,
            content={"detail": "El cuerpo de la petición no es un JSON válido."},
        )
    return await request_validation_exception_handler(request, exc)


# ---------------------------------------------------------------------------
# Middleware CORS — Issue #48
# ---------------------------------------------------------------------------
# Los orígenes permitidos se leen desde settings.CORS_ORIGINS (variable de
# entorno CORS_ORIGINS). El wildcard ["*"] está explícitamente prohibido junto
# con allow_credentials=True, ya que viola la spec CORS y es un vector de
# ataque CSRF. Ver: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Lista explícita desde .env
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
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
    response_description="Estado del servicio y de la conexión a la base de datos.",
    response_model=None,
)
async def health_check(db: AsyncSession = Depends(get_db)) -> JSONResponse:
    """
    ¿Qué? Informa si el servicio está vivo y si puede hablar con PostgreSQL.
    ¿Para qué? Lo usan Docker (healthcheck) y los orquestadores para saber si
    el backend está realmente listo, no solo encendido.
    ¿Impacto? HTTP 200 si todo está bien; HTTP 503 si la base de datos no
    responde (así Docker lo marca "unhealthy" en vez de "healthy").
    """
    database = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Health-check: no hay conexión con la base de datos")
        database = "error"

    return JSONResponse(
        status_code=200 if database == "ok" else 503,
        content={
            "status": "ok" if database == "ok" else "degraded",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "database": database,
        },
    )
