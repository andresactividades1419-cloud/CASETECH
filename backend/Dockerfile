# ============================================================
# Backend Dockerfile — CASETECH
# Base: python:3.11-slim + UV (ghcr.io/astral-sh/uv)
# ============================================================

# --- Etapa 1: Instalador UV ---
FROM ghcr.io/astral-sh/uv:latest AS uv-installer

# --- Etapa 2: Imagen de producción/desarrollo ---
FROM python:3.11-slim AS runtime

# Metadatos de la imagen
LABEL maintainer="casetech-team"
LABEL description="Backend FastAPI para CASETECH ERP"
LABEL python.version="3.11"

# Variables de entorno para Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    # UV: ubicación del entorno virtual dentro del contenedor
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

# Copiar el binario de UV desde la etapa anterior
COPY --from=uv-installer /uv /usr/local/bin/uv
COPY --from=uv-installer /uvx /usr/local/bin/uvx

# Instalar dependencias del sistema necesarias para psycopg2-binary
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de dependencias primero (cache de capas)
COPY pyproject.toml ./
COPY uv.lock* ./

# Instalar dependencias Python con UV (usa el lock file si existe)
RUN uv sync --frozen --no-dev

# Copiar el código fuente de la aplicación
COPY . .

# Puerto expuesto por el backend
EXPOSE 8000

# Comando de inicio (puede ser sobreescrito por docker-compose para desarrollo)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
