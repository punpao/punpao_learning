# syntax=docker/dockerfile:1

# ---------- Stage 1: build ----------
# Has ALL dependencies (TypeScript, vitest, ...) to compile src/ -> dist/.
# Nothing from this stage ships except dist/.
FROM node:24.13.0-alpine AS build
WORKDIR /app

# Copy only the package files first. Docker caches this layer, so
# `npm ci` re-runs only when dependencies change, not on every code change.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Stage 2: runtime (the image we ship) ----------
FROM node:24.13.0-alpine AS runtime
# production: test-only routes (/boom, /slow) are off, libraries run in prod mode.
ENV NODE_ENV=production
WORKDIR /app

# Production dependencies only: no TypeScript, vitest, supertest, tsx.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Run as the unprivileged "node" user that the official image already has.
# The app files stay owned by root, so the app can read them but not change them.
USER node

EXPOSE 3000

# Exec form (JSON array): node runs as PID 1 and receives SIGTERM directly
# from `docker stop` / ECS, so our graceful shutdown handler runs.
CMD ["node", "dist/server.js"]
