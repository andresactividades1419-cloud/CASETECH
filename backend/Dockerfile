# ============================================================
# Backend Dockerfile — CASETECH ERP (Producción y Hardening)
# Base: python:3.11-slim + UV (ghcr.io/astral-sh/uv:0.4.18)
# Multi-stage & Non-Root (appuser: 10001)
# ============================================================

# --- Etapa 1: Instalador UV ---
FROM ghcr.io/astral-sh/uv:0.4.18 AS uv-installer

# --- Etapa 2: Imagen de producción / runtime ---
FROM python:3.11-slim AS runtime

# Metadatos de la imagen
LABEL maintainer="CASETECH Team"
LABEL description="Backend FastAPI para CASETECH ERP"
LABEL python.version="3.11"

# Variables de entorno de optimización de Python y UV
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

# Copiar el binario de UV desde la etapa de instalación
COPY --from=uv-installer /uv /usr/local/bin/uv
COPY --from=uv-installer /uvx /usr/local/bin/uvx

# Instalar dependencias del sistema mínimas necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Crear usuario y grupo no privilegiado (appuser:appgroup UID 10001)
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/sh -m appuser

# Directorio de trabajo de la aplicación
WORKDIR /app

# ── Etapa A: Instalar SOLO dependencias externas (máximo aprovechamiento de caché) ──
COPY pyproject.toml README.md uv.lock* ./
RUN uv sync --no-install-project --no-dev

# ── Etapa B: Copiar código e instalar el paquete en modo producción ──────────────────
COPY . .
RUN uv sync --no-dev

# Asignar propiedad de los archivos al usuario sin privilegios
RUN chown -R appuser:appgroup /app

# Puerto interno expuesto por el servicio FastAPI
EXPOSE 8000

# Ejecución bajo usuario no-root por seguridad
USER appuser

# Comando de inicio de producción: 4 workers, sin reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
