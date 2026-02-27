FROM node:20-alpine AS base
RUN npm install -g pnpm turbo

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @crm/db prisma:generate
RUN pnpm --filter @crm/api build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main"]
