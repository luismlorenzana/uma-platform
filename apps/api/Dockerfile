# The Uma Platform API image (SH2), adapted from uma-quest's at 47ca16d. Build from the repo root:
#   docker build -f apps/api/Dockerfile -t platform-api .
# Every package it needs is in this workspace (uma-server, uma-data, tiers), so no registry token is involved.
# .dockerignore keeps the context to the manifests, the lockfile, apps/api and those packages.
#
# Not `pnpm deploy`: its legacy mode re-resolves the whole workspace and fails on packages that live only on GitHub
# Packages. Instead the builder installs the API's own graph in place and builds it, and the image keeps that install
# whole. uma-server is a workspace link, so its peers (Nest, Firebase Admin, Cloud Storage) come from its own
# devDependencies, the same copies the API's: a production-only install drops them, and uma-server's dynamic
# `import('firebase-admin/app')` can't be pointed elsewhere (NODE_PATH covers only `require`; SH2's first deploy).

FROM node:22-slim AS builder
RUN corepack enable
WORKDIR /repo

COPY . .
RUN CI=true pnpm install --filter @uma-platform/api... --frozen-lockfile
RUN pnpm --filter @uma-platform/api... run build

FROM node:22-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /repo
COPY --from=builder /repo ./
WORKDIR /repo/apps/api
EXPOSE 8080
CMD ["node", "dist/main.js"]
