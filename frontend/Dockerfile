# ============================================================
# Frontend Dockerfile — CASETECH ERP
# Base: node:20-alpine (LTS) con PNPM via Corepack
# Multi-stage: development -> builder -> production (Nginx)
# ============================================================

# --- Stage 1: Desarrollo y dependencias (Dev) ---
FROM node:20-alpine AS development

WORKDIR /app

# Instalar dependencias del sistema y habilitar PNPM en versión fija
RUN apk add --no-cache libc6-compat curl gcompat && \
    corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copiar manifiestos e instalar dependencias completas
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# Copiar código fuente
COPY . .

EXPOSE 3000
CMD ["pnpm", "run", "dev"]

# --- Stage 2: Compilación de Producción (Builder) ---
FROM development AS builder

ENV NODE_ENV=production
RUN pnpm run build

# --- Stage 3: Servidor Web Nginx de Producción (Runner) ---
FROM nginx:1.27-alpine AS production

LABEL maintainer="CASETECH Team"
LABEL description="Servidor Nginx de producción para CASETECH ERP Frontend"

# Eliminar configuración y contenido por defecto de Nginx
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copiar configuración optimizada de Nginx con SPA fallback y reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos estáticos compilados desde la etapa builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Healthcheck HTTP interno
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

# Iniciar servidor Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
