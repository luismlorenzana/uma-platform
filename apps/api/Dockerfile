# The Uma Platform API image (SH2), adapted from uma-quest's at 47ca16d. Build from the repo root:
#   docker build -f apps/api/Dockerfile -t platform-api .
# Every package it needs is in this workspace (uma-server), so no registry token is involved. .dockerignore keeps the
# context to the manifests, the lockfile, apps/api and packages/server.
#
# Not `pnpm deploy`: its legacy mode re-resolves the whole workspace and fails on packages that live only on GitHub
# Packages. Instead the builder installs the API's own graph in place, builds it, then keeps production dependencies only.
# uma-server's Nest and Firebase imports are peers it gets from the API, so NODE_PATH points at the API's node_modules:
# one copy of each, the same the API uses (checked locally, SH2).

FROM node:22-slim AS builder
RUN corepack enable
WORKDIR /repo

COPY . .
RUN CI=true pnpm install --filter @uma-platform/api... --frozen-lockfile
RUN pnpm --filter @uma-platform/api... run build
RUN rm -rf node_modules apps/api/node_modules packages/server/node_modules \
    && CI=true pnpm install --filter @uma-platform/api... --frozen-lockfile --prod

FROM node:22-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8080
ENV NODE_PATH=/repo/apps/api/node_modules
WORKDIR /repo
COPY --from=builder /repo ./
WORKDIR /repo/apps/api
EXPOSE 8080
CMD ["node", "dist/main.js"]
