# Render builds from the monorepo root by default.
# API source lives in apps/api — see apps/api/Dockerfile for the same build in isolation.

FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/api/package.json apps/api/package-lock.json ./
RUN npm ci

COPY apps/api/tsconfig.json ./
COPY apps/api/src ./src
RUN npm run build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY apps/api/package.json apps/api/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
