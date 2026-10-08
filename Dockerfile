FROM node:24-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@10.26.0

FROM base AS builder
# Copy package definitions and lockfile for workspace resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @fa/shared build
RUN pnpm --filter @fa/db generate
RUN pnpm --filter @fa/db build
RUN pnpm --filter @fa/api build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
USER nestjs
EXPOSE 4000
ENV PORT=4000
CMD ["node", "apps/api/dist/main.js"]
