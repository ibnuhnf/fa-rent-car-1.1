FROM node:24-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@10.26.0

FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @fa/shared build
RUN pnpm --filter @fa/ui build
RUN pnpm --filter @fa/web-admin build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web-admin/.next/standalone ./
COPY --from=builder /app/apps/web-admin/.next/static ./apps/web-admin/.next/static
COPY --from=builder /app/apps/web-admin/public ./apps/web-admin/public
USER nextjs
EXPOSE 3001
ENV PORT=3001
CMD ["node", "apps/web-admin/server.js"]
