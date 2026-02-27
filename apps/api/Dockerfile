FROM node:20-alpine
RUN npm install -g pnpm turbo

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @crm/db prisma:generate
RUN pnpm --filter @crm/api build && ls -la apps/api/dist/ || (echo "ERROR: nest build did not produce dist/" && exit 1)

ENV NODE_ENV=production
EXPOSE 3000
WORKDIR /app/apps/api
CMD ["node", "dist/main"]
