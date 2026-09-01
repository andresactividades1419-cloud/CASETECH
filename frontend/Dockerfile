# ============================================================
# Frontend Dockerfile — CASETECH ERP
# Base: node:20-alpine (LTS) con PNPM via Corepack
# Multi-stage: builder -> runner (Nginx Alpine)
# ============================================================

# --- Stage 1: Compilación (Builder) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias del sistema y habilitar PNPM en versión fija
RUN apk add --no-cache libc6-compat curl && \
    corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copiar manifiestos de dependencias e instalar
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Copiar código fuente de la aplicación
COPY . .

# Variables de entorno y compilación del bundle para producción
ENV NODE_ENV=production
RUN pnpm run build

# --- Stage 2: Servidor Web Nginx (Runner) ---
FROM nginx:1.27-alpine AS production

LABEL maintainer="CASETECH Team"
LABEL description="Servidor Nginx de producción para CASETECH ERP Frontend"

# Eliminar configuración y contenido por defecto de Nginx
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copiar configuración optimizada de Nginx con SPA fallback y reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos estáticos compilados desde la etapa builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer puerto HTTP estándar
EXPOSE 80

# Healthcheck HTTP interno
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

# Iniciar servidor Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
