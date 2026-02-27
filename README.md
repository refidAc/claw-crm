# CRM — HighLevel Replacement

A modern, multi-tenant CRM built as a Turborepo monorepo.

## Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | NestJS (TypeScript) |
| Frontend | Next.js 15 App Router (TypeScript) |
| ORM | Prisma + PostgreSQL |
| Queue | BullMQ (Redis) |
| Auth | JWT (Better Auth ready) |
| API Docs | Swagger at `/api/docs` |
| Local dev | Docker Compose |

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

## Setup

```bash
# 1. Clone and install
git clone <repo>
cd crm
pnpm install

# 2. Copy env
cp .env.example .env
# Edit .env with your secrets

# 3. Start infrastructure
docker compose up -d postgres redis mailpit

# 4. Run DB migrations
pnpm db:migrate

# 5. Generate Prisma client
pnpm db:generate

# 6. Start dev servers
pnpm dev
```

## Running with Docker (full stack)

```bash
docker compose up --build
```

Services:
- **API**: http://localhost:3000
- **Web**: http://localhost:3001
- **Swagger**: http://localhost:3000/api/docs
- **Mailpit**: http://localhost:8025

## Project Structure

```
crm/
├── apps/
│   ├── api/          NestJS REST API
│   └── web/          Next.js App Router frontend
├── packages/
│   ├── db/           Prisma schema + PrismaClient export
│   ├── types/        Shared enums and utility types
│   └── ui/           Shared React component library (shadcn/ui pattern)
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## API Endpoints

### Auth (public)
- `POST /auth/signup` — create account + owner user
- `POST /auth/signin` — get JWT token

### Contacts (auth required)
- `GET    /contacts` — list with search & pagination
- `POST   /contacts` — create contact
- `GET    /contacts/:id` — get with related data
- `PUT    /contacts/:id` — update
- `DELETE /contacts/:id` — soft delete

### Pipelines
- `GET/POST /pipelines`
- `GET/PUT/DELETE /pipelines/:id`
- `POST /pipelines/:id/stages`
- `DELETE /pipelines/:id/stages/:stageId`

### Opportunities
- `GET/POST /opportunities`
- `GET/PUT/DELETE /opportunities/:id`
- `PUT /opportunities/:id/stage/:stageId` — move stage

### Conversations
- `GET/POST /conversations`
- `GET /conversations/:id`
- `POST /conversations/:id/messages`
- `POST /conversations/:id/close`

### System
- `GET /health` — health check (DB ping)

## Data Model

22 Prisma models covering: Account, User, Session, Role, Permission, Contact, Company, Pipeline, Stage, Opportunity, Conversation, Message, ChannelIdentity, Task, Note, ActivityEvent, WorkflowDefinition, Trigger, Action, Condition, Delay, Job, JobRun.

## First Sign-Up

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"accountName":"Acme Corp","email":"owner@acme.com","name":"Jane Doe","password":"password123"}'
```

Copy the `accessToken` from the response and use it as `Authorization: Bearer <token>`.

## License

Private / Proprietary
