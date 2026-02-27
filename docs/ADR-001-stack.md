# ADR-001: Stack Selection

## Status: Accepted

## Context

We are building an internal CRM to replace HighLevel for a small team. The system must support multi-tenancy, RBAC, a REST API with OpenAPI spec, an event bus, a workflow engine, SMS/email channel integrations, and eventual n8n integration. PostgreSQL is the assumed database. TypeScript is strongly preferred throughout. The project is iterative with no hard deadline — correctness, security, and maintainability outweigh velocity.

Core domain models already decided: Account, User, Role, Permission, Contact, Company, Pipeline, Stage, Opportunity, Conversation, Message, ChannelIdentity, Task, Note, ActivityEvent, WorkflowDefinition, Trigger, Action, Condition, Delay, Job, JobRun.

---

## Decisions

### 1. Backend Framework: NestJS

- **Rationale:** NestJS is the most complete TypeScript-first backend framework for this scope. Its module/provider/decorator system maps cleanly onto domain modules (contacts, pipelines, workflows, etc.). Built-in support for guards (RBAC), interceptors, pipes, and decorators reduces boilerplate for security-critical features. First-class OpenAPI generation via `@nestjs/swagger`. Strong plugin ecosystem for BullMQ, Prisma, passport/auth strategies, and event emitters. The opinionated structure means a team can onboard without debating conventions.
- **Runner-up: Fastify** — Faster raw throughput and lighter weight, but requires assembling all patterns yourself. No built-in DI, RBAC, or module system. Good for microservices or simple APIs; overkill overhead for a rich CRM domain.

---

### 2. Frontend Framework: Next.js (App Router)

- **Rationale:** Next.js App Router gives us React Server Components for fast initial loads, excellent TypeScript support, file-based routing, and a huge ecosystem. Server Actions simplify form/mutation flows without a dedicated BFF. Vercel or self-hosted Docker deployment works equally well. The community size means more off-the-shelf UI components (shadcn/ui, Radix) that integrate cleanly.
- **Runner-up: SvelteKit** — Leaner bundle and simpler mental model, but smaller component ecosystem and fewer CRM-adjacent UI libraries. Remix was a close second for its progressive enhancement and loader/action model, but Next.js App Router has largely converged on those ideas.

---

### 3. ORM / DB Layer: Prisma

- **Rationale:** Prisma's schema-first approach produces readable, auditable migrations — critical for a complex 20+ model domain with multi-tenancy row-level isolation. The generated type-safe client eliminates a class of runtime errors. `prisma migrate` provides clean, version-controlled migration history. Prisma Client Extensions support row-level security hooks for tenant isolation. Excellent NestJS integration via `@prisma/client` and community `nestjs-prisma` module.
- **Runner-up: Drizzle** — Better raw query control and lighter runtime; query builder style feels more natural for complex joins. However, its migration tooling (`drizzle-kit`) is less mature for large schemas and the type inference, while impressive, requires more manual schema maintenance. A worthy re-evaluation once the schema stabilises.

---

### 4. Event Bus / Job Queue: BullMQ (Redis)

- **Rationale:** BullMQ is the standard for NestJS job queues (`@nestjs/bull`) and handles workflow job scheduling, delayed actions, retries, and concurrency control out of the box. Redis is a near-zero-ops dependency that we'd want for caching anyway. BullMQ's named queues map cleanly to our Job/JobRun model. Bull Board gives a live dashboard for free.
- **Runner-up: pg-boss** — Attractive because it eliminates the Redis dependency (Postgres-only). Good for simpler queues. However, it lacks BullMQ's feature richness (rate limiting, sandboxed workers, repeatable jobs) needed for a workflow engine. NATS was over-engineered for our scale and team size.

---

### 5. Auth: Better Auth

- **Rationale:** Better Auth is a modern, self-hosted TypeScript auth library with first-class support for multi-tenancy (organisations/teams plugin), RBAC, session management, and OAuth providers — all without shipping user data to a third party. It runs entirely within our NestJS app against our PostgreSQL database, keeping the data model unified. Actively maintained with a clean plugin API.
- **Runner-up: Clerk** — Best DX and pre-built UI components, but SaaS-only (user data lives on Clerk's servers), which is a non-starter for a security-first internal tool. Auth.js (NextAuth) is frontend-coupled and awkward to wire into a separate NestJS API. Custom JWT is always an option but needless maintenance burden when Better Auth exists.

---

### 6. Monorepo Tooling: Turborepo

- **Rationale:** Turborepo with pnpm workspaces gives us fast, cached builds and a clear `apps/` + `packages/` structure without the complexity of Nx. The `turbo.json` pipeline config is minimal to learn. We get remote caching (Vercel or self-hosted) for free. Shared packages (`packages/types`, `packages/db`, `packages/ui`) stay in sync across `apps/api` and `apps/web` without ceremony.
- **Runner-up: Nx** — More powerful for large orgs (affected-only runs, generators, enforced boundaries), but the learning curve and config overhead is disproportionate for a small team. Plain pnpm workspaces alone lack build caching, making CI slow as the repo grows.

---

### 7. API Style: REST + OpenAPI

- **Rationale:** The requirements explicitly call for an OpenAPI spec, and REST maps naturally to our resource-heavy domain (contacts, pipelines, opportunities). NestJS + `@nestjs/swagger` auto-generates a live OpenAPI spec from decorators with minimal effort. This spec becomes the contract for the frontend, n8n integration, and any future mobile client. REST is also the most universally understood style for external integrations (SMS/email webhooks, n8n HTTP nodes).
- **Runner-up: tRPC** — Excellent type-safety for a TypeScript monorepo where client and server are tightly coupled. However, it produces no OpenAPI spec, complicates n8n/webhook integration, and requires the frontend to always be TypeScript-aware. We can add a tRPC layer internally later if needed without abandoning the REST contract.

---

### 8. Containerization / Local Dev: Docker Compose

**Recommended `docker-compose.yml` services:**

```
services:
  postgres:   image: postgres:16-alpine     (port 5432)
  redis:      image: redis:7-alpine         (port 6379)
  api:        build: apps/api               (port 3000, hot-reload via tsx watch)
  web:        build: apps/web               (port 3001, Next.js dev server)
  bull-board: image: bullmq/bull-board      (port 3002, queue dashboard)
  mailpit:    image: axllent/mailpit        (port 1025 SMTP / 8025 UI — local email testing)
```

- Single `docker compose up` spins the full stack for any developer.
- Production: multi-stage Dockerfiles for `api` and `web`; deploy to any OCI-compatible host (Fly.io, Railway, self-hosted K8s, VPS).
- `.env.example` committed; `.env` gitignored. Secrets via environment variables only.

---

## Resulting Architecture Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Client                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS
                    ┌───────────▼──────────┐
                    │   Next.js (App Router) │  apps/web
                    │   RSC + Server Actions │
                    └───────────┬───────────┘
                                │ REST/HTTP (fetch)
                    ┌───────────▼───────────┐
                    │    NestJS API Server   │  apps/api  :3000
                    │  REST + OpenAPI spec   │
                    │  Guards (RBAC/Auth)    │
                    │  BullMQ producers      │
                    └──┬──────────┬──────────┘
                       │          │
           ┌───────────▼──┐  ┌───▼────────────────┐
           │  PostgreSQL  │  │       Redis          │
           │  (Prisma)    │  │  (BullMQ queues)     │
           │  Multi-tenant│  └───────┬──────────────┘
           │  row-level   │          │
           └──────────────┘  ┌───────▼──────────────┐
                             │   BullMQ Workers       │
                             │  (Workflow engine,     │
                             │   email/SMS jobs,      │
                             │   event processing)    │
                             └────────────────────────┘

   External:
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │  Twilio/SMS  │   │  SendGrid /  │   │     n8n      │
   │  (webhook →  │   │  Resend email│   │  (REST API   │
   │   NestJS)    │   │  (via worker)│   │   + webhooks)│
   └──────────────┘   └──────────────┘   └──────────────┘

   Monorepo (Turborepo + pnpm):
   ├── apps/
   │   ├── api/        (NestJS)
   │   └── web/        (Next.js)
   └── packages/
       ├── db/         (Prisma schema + client)
       ├── types/      (shared TypeScript types)
       └── ui/         (shared React components / shadcn)
```

---

## Next Steps

The backend agent should scaffold in this order:

1. **Monorepo scaffold** — `pnpm init`, Turborepo config, `apps/api`, `apps/web`, `packages/db`, `packages/types`
2. **Database foundation** — Prisma schema with all 20 core models, multi-tenant `accountId` foreign keys, RLS policies, initial migration
3. **NestJS bootstrap** — App module, ConfigModule (env validation via Zod), PrismaModule, global exception filter, request logger
4. **Auth module** — Better Auth integration: session handling, JWT extraction guard, current-user decorator
5. **RBAC module** — Role/Permission guard wired to NestJS `@UseGuards`, seeded default roles
6. **OpenAPI setup** — `@nestjs/swagger` wired, serving `/api/docs`, auto-schema from DTOs
7. **BullMQ setup** — Redis connection, base job queue module, dead-letter handling
8. **First domain slice** — Contacts CRUD (full vertical: migration → service → controller → OpenAPI → frontend page)
