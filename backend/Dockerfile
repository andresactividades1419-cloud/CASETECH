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

# ── Etapa A: instalar SOLO dependencias externas (máxima cache de capas) ─────
# Se copian únicamente los manifiestos; el código fuente aún no existe aquí.
# --no-install-project: instala las deps del lockfile sin intentar construir
#                       el paquete local (evita que Hatchling busque README.md).
COPY pyproject.toml README.md uv.lock* ./
RUN uv sync --no-install-project --no-dev

# ── Etapa B: copiar código e instalar el proyecto completo ───────────────────
# Ahora sí existen todos los archivos que Hatchling necesita (README.md, app/).
COPY . .
RUN uv sync --no-dev

# Puerto expuesto por el backend
EXPOSE 8000

# Comando de inicio (puede ser sobreescrito por docker-compose para desarrollo)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
