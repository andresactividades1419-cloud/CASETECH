# ============================================================
# Frontend Dockerfile — CASETECH
# Base: node:20-alpine (LTS) con PNPM via Corepack
# ============================================================

FROM node:20-alpine AS base

# Metadatos de la imagen
LABEL maintainer="casetech-team"
LABEL description="Frontend React 18 para CASETECH ERP"
LABEL node.version="20-lts"

# Instalar dependencias del sistema
RUN apk add --no-cache \
        libc6-compat \
        curl

# Habilitar PNPM via Corepack (incluido en Node 20)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Directorio de trabajo
WORKDIR /app

# ============================================================
# Etapa de instalación de dependencias
# ============================================================
FROM base AS dependencies

# Copiar archivos de manifiesto de dependencias
COPY package.json pnpm-lock.yaml* ./

# Instalar dependencias en modo desarrollo
# --no-frozen-lockfile: permite instalar aunque pnpm-lock.yaml no exista o esté desactualizado
RUN pnpm install --no-frozen-lockfile

# ============================================================
# Etapa de desarrollo (imagen final para docker-compose dev)
# ============================================================
FROM base AS development

WORKDIR /app

# Copiar node_modules instalados desde la etapa anterior
COPY --from=dependencies /app/node_modules ./node_modules

# Copiar el código fuente
COPY . .

# Puerto del servidor de desarrollo React
EXPOSE 3000

# Iniciar servidor de desarrollo con hot-reload y escucha en todas las interfaces
CMD ["pnpm", "run", "dev"]
