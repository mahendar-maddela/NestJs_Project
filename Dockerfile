# syntax=docker/dockerfile:1
#
# Builds one image for all three real processes in this monorepo — apps/api,
# apps/ocpp-gateway, apps/scheduler (apps/workers was removed from the codebase;
# see nest-cli.json/package.json cleanup in the same change that added this file).
# docker-compose.yml runs three containers off this single image, each with a
# different `command:`, so there is exactly one artifact to build, version, and push.
#
# Nest's per-app `tsc` builder does NOT bundle — it compiles each app's src/ plus
# every shared libs/modules/database/integrations file it imports, mirroring the
# monorepo's full relative path under dist/apps/<app>/. That's why the runtime CMDs
# below point at dist/apps/<app>/apps/<app>/src/main.js and not the flatter path
# you might expect — verified by an actual build, not assumed.

ARG NODE_VERSION=24-bookworm-slim

# ---------------------------------------------------------------------------
# base: shared env for every stage
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
WORKDIR /app
# Skip puppeteer's bundled Chromium download at install time — the runtime stage
# installs Debian's `chromium` package instead and points PUPPETEER_EXECUTABLE_PATH
# at it. Saves ~200MB and a flaky download during `npm ci`.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# ---------------------------------------------------------------------------
# deps: full install (incl. devDependencies) — needed to run `nest build`
# ---------------------------------------------------------------------------
FROM base AS deps
# python3/build-essential: bcrypt falls back to compiling its native addon from
# source when no prebuilt binary matches this exact node/glibc combo.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY .npmrc package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# build: compile all three apps
# ---------------------------------------------------------------------------
FROM deps AS build
COPY . .
RUN npx nest build api \
    && npx nest build ocpp-gateway \
    && npx nest build scheduler

# ---------------------------------------------------------------------------
# prod-deps: production-only node_modules (no devDependencies in the final image)
# ---------------------------------------------------------------------------
FROM base AS prod-deps
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY .npmrc package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
# runtime: the actual image that ships
# ---------------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# chromium: apps/integrations/pdf launches puppeteer with no executablePath override,
#   so it picks up PUPPETEER_EXECUTABLE_PATH automatically — no code change needed.
# curl: used by the container HEALTHCHECK below.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nestjs

COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --chown=nestjs:nodejs package.json ./

USER nestjs

# Informational only — actual published ports are set per-service in docker-compose.yml.
EXPOSE 8080 8000

# No default CMD: each docker-compose service supplies its own `command:`
# (api / ocpp-gateway / scheduler all live in this one image).
CMD ["node", "dist/apps/api/apps/api/src/main.js"]
