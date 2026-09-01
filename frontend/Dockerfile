# ============================================================
# Frontend Dockerfile — CASETECH
# Base: node:20-alpine (LTS) con PNPM via Corepack
# Multi-stage: development | builder | production (Nginx)
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

# Instalar dependencias
RUN pnpm install --no-frozen-lockfile

# ============================================================
# Etapa de desarrollo (imagen para docker-compose dev)
# ============================================================
FROM base AS development

WORKDIR /app

# Copiar node_modules instalados desde la etapa anterior
COPY --from=dependencies /app/node_modules ./node_modules

# Copiar el código fuente
COPY . .

# Puerto del servidor de desarrollo React (Vite)
EXPOSE 3000

# Iniciar servidor de desarrollo con hot-reload y escucha en todas las interfaces
CMD ["pnpm", "run", "dev"]

# ============================================================
# Etapa de compilación para producción
# ============================================================
FROM base AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Variables de entorno de compilación
ENV NODE_ENV=production

# Compilar bundle de producción optimizado
RUN pnpm run build

# ============================================================
# Etapa de producción final (Nginx Alpine)
# ============================================================
FROM nginx:1.27-alpine AS production

# Metadatos
LABEL maintainer="casetech-team"
LABEL description="Servidor Nginx de producción para CASETECH ERP Frontend"

# Eliminar configuración por defecto de Nginx
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copiar configuración optimizada de Nginx con SPA fallback y reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos estáticos compilados desde la etapa builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer puerto HTTP estándar
EXPOSE 80

# Healthcheck HTTP
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Iniciar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
