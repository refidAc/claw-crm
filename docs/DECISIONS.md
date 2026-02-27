# Decision Log

> Key architectural and product decisions. New decisions append to the bottom.
> Format: ADR-NNN | Date | Status | Decision → Rationale → Consequences
> Updated: 2026-02-27

---

## ADR-001 — Tech Stack Selection

**Date:** 2026-02 (project kickoff)
**Status:** ✅ Accepted

### Decision
Monorepo stack:
- **Backend:** NestJS (TypeScript, modular, DI, guards for RBAC)
- **Frontend:** Next.js 14+ (App Router, RSC where beneficial, client components for interactivity)
- **ORM / DB:** Prisma + PostgreSQL
- **Queue / Jobs:** BullMQ + Redis
- **Auth:** Better Auth (self-hosted)
- **Monorepo:** Turborepo with pnpm workspaces

### Rationale
- NestJS gives us structure (modules, guards, pipes) that scales better than raw Express as complexity grows
- Next.js App Router handles both static and dynamic UI; RSC reduces client JS bundle
- Prisma: type-safe queries, migration workflow, excellent DX for a small team
- BullMQ: Redis-backed, reliable delayed jobs critical for Workflow Engine delays and retries
- Better Auth: self-hosted, no vendor lock-in, no per-seat cost, full control over session/token storage
- Turborepo: shared `packages/db`, `packages/ui` without duplicating code across apps

### Consequences
- Team must be comfortable with TypeScript throughout (no escape hatches)
- Redis is a required infrastructure dependency (not optional)
- Better Auth requires more initial config than Clerk but pays off in control
- Prisma migrations must be run deliberately — no auto-migrate in production

---

## ADR-002 — No HL Data Migration in MVP

**Date:** 2026-02 (project kickoff)
**Status:** ✅ Accepted

### Decision
Historical data migration from HighLevel is explicitly out of scope for the MVP. The team will use the new CRM for new data going forward. Migration happens in Phase 6, after the system is proven stable.

### Rationale
- HL's API has rate limits and incomplete data export for some modules
- Migration is a distraction that delays the core build
- Running both systems in parallel (new data in new CRM, historical in HL) is acceptable short-term
- A migration script written later against a stable schema is lower risk than one written early

### Consequences
- Team may need to reference HL for historical contact/conversation data during the transition period
- Phase 6 migration effort is non-trivial — budget time accordingly when we get there
- Schema decisions made now must not break obvious migration assumptions (e.g., keep `external_id` fields nullable on Contact/Opportunity for HL IDs)

---

## ADR-003 — Internal Use Only (No Multi-Tenancy / White-Label in MVP)

**Date:** 2026-02 (project kickoff)
**Status:** ✅ Accepted

### Decision
The CRM is built as a single-tenant system for one internal team. No sub-accounts, no agency features, no white-labeling in the MVP or near-term roadmap.

### Rationale
- Multi-tenancy adds significant complexity to every layer: auth, data isolation, billing, UI
- The team is small; one workspace is all that's needed
- HL's sub-account model exists for agencies managing many clients — not our use case
- Building single-tenant first keeps the schema simple and lets us move fast

### Consequences
- All data is scoped to one organization — no `organizationId` foreign key everywhere (simplification)
- If multi-tenancy is needed in the future, it's a significant refactor (data isolation, RLS or schema-per-tenant)
- This decision should be revisited before onboarding any external clients or partners

---

## ADR-004 — Event Bus Over Direct Function Calls for Workflow Engine

**Date:** 2026-02 (project kickoff)
**Status:** ✅ Accepted

### Decision
The Workflow Engine listens to domain events published to BullMQ (e.g., `contact.created`, `tag.added`, `opportunity.stage_changed`) rather than being called directly from service methods.

### Rationale
- Decouples the workflow engine from every other module — services don't need to know about workflows
- Events are durable: if the workflow worker is down, jobs queue and process when it recovers
- Easier to add new triggers later without modifying existing service code
- Enables future integrations (n8n, webhooks) to tap the same event stream
- BullMQ's retry + dead-letter queue gives us reliability without custom retry logic

### Consequences
- All significant mutations must publish an event (discipline required — can't forget)
- Slight latency between action and workflow execution (milliseconds to seconds, acceptable)
- Event schema must be stable — changes to event shape are breaking changes for active workflows
- Need an event schema registry (even just a TypeScript interface file) to keep consumers in sync
- Debugging requires checking both the triggering service logs AND the workflow worker logs

---

## ADR-005 — Better Auth Over Clerk

**Date:** 2026-02 (project kickoff)
**Status:** ✅ Accepted

### Decision
Use Better Auth (self-hosted) for authentication instead of Clerk or Auth0.

### Rationale
- **Self-hosted:** Auth data stays in our PostgreSQL database — no third-party sees our user list
- **No per-seat cost:** Clerk pricing scales with users; we don't want that dependency
- **Security-first:** For a CRM handling contact/communication data, keeping auth internal reduces attack surface
- **Flexibility:** Better Auth supports custom session logic, TOTP, and plugin extensions without hitting provider limits
- **TypeScript-native:** Clean integration with NestJS via guards

### Consequences
- We own the auth infrastructure — no SLA from a vendor; we must ensure uptime
- Password reset, email verification, and 2FA flows are our responsibility to implement and maintain
- Initial setup is more involved than dropping in a Clerk SDK
- Must keep Better Auth and its dependencies updated (security patches are our job)

---

## ADR-006 — Soft Delete for Contacts and Opportunities

**Date:** 2026-02
**Status:** ✅ Accepted

### Decision
Contacts, Companies, and Opportunities use soft-delete (`deletedAt` timestamp) rather than hard-delete as the default. Hard-delete is available to admins only via explicit action.

### Rationale
- Prevents accidental data loss — a misclick doesn't destroy a contact's entire history
- Activity timeline and conversation threads remain intact even if a contact is "deleted"
- Supports future undo/restore features without schema changes
- Audit trail preservation

### Consequences
- All queries must filter `WHERE deletedAt IS NULL` by default (Prisma middleware or default scope)
- Storage grows over time — periodic admin-initiated hard-delete or archival job may be needed eventually
- "Deleted" contacts must not receive outbound messages — soft-delete status must be checked before sending

---

## Template for New Decisions

```
## ADR-NNN — Short Title

**Date:** YYYY-MM
**Status:** 🔄 Proposed | ✅ Accepted | ❌ Rejected | ⚠️ Superseded by ADR-NNN

### Decision
[What we decided, stated clearly and specifically]

### Rationale
[Why — the forces and constraints that led here]

### Consequences
[What becomes easier, harder, or different as a result]
```
