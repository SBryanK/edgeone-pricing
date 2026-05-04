# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first for better layer caching.
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy sources and build.
COPY . .

# Build-time env vars. We deliberately accept these as build args (NOT runtime
# env vars in the final image) because Vite bakes any VITE_* variable into
# the static bundle at build time. Keep them OUT of the Dockerfile default
# (no `ARG foo=secret`) — the docker build command must supply them.
ARG VITE_APP_PASSWORD=""
ENV VITE_APP_PASSWORD=${VITE_APP_PASSWORD}

RUN npm run build

# ---------- Production stage ----------
FROM nginx:1.27-alpine AS runtime

# gettext gives us envsubst, used to interpolate the Anthropic key into
# nginx.conf at container start — we avoid baking the key into the image.
RUN apk add --no-cache gettext

# Copy the nginx config as a TEMPLATE; the entrypoint below renders it.
COPY nginx.conf /etc/nginx/nginx.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

# Entrypoint: render the template with env vars, then exec nginx.
# Only ${ANTHROPIC_API_KEY} is expanded — any other `$var` in the file
# (e.g. nginx built-ins like $remote_addr) is preserved verbatim.
RUN printf '%s\n' \
    '#!/bin/sh' \
    'set -eu' \
    ': "${ANTHROPIC_API_KEY:=}"' \
    'export ANTHROPIC_API_KEY' \
    'envsubst "\$ANTHROPIC_API_KEY" < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf' \
    'exec nginx -g "daemon off;"' \
    > /docker-entrypoint.d/40-render-nginx.sh \
    && chmod +x /docker-entrypoint.d/40-render-nginx.sh

# Simple healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

EXPOSE 8080

# The base nginx image's default entrypoint runs /docker-entrypoint.d/*.sh
# scripts then execs `nginx -g daemon off;`. Our script above renders the
# config and then execs nginx itself, so CMD is effectively unused but we
# keep a sensible default.
CMD ["nginx", "-g", "daemon off;"]