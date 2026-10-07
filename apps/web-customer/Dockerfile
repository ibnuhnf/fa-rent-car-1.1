FROM node:24-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@10.26.0

FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @fa/shared build
RUN pnpm --filter @fa/ui build
RUN pnpm --filter @fa/web-customer build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web-customer/.next/standalone ./
COPY --from=builder /app/apps/web-customer/.next/static ./apps/web-customer/.next/static
COPY --from=builder /app/apps/web-customer/public ./apps/web-customer/public
USER nextjs
EXPOSE 3002
ENV PORT=3002
CMD ["node", "apps/web-customer/server.js"]
