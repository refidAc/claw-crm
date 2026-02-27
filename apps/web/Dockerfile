FROM node:20-alpine
RUN npm install -g pnpm turbo

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @crm/web build

ENV NODE_ENV=production
EXPOSE 3001
WORKDIR /app/apps/web
CMD ["node_modules/.bin/next", "start", "-p", "3001"]
