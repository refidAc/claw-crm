# Roadmap

> Phase-based build plan for the internal CRM.
> No fixed deadline — ship iteratively, validate, move on.
> Updated: 2026-02-27

---

## Phase 0 — Foundation ← **CURRENT**

**Goal:** Working monorepo. You can run the app, hit the DB, and sign in.

### Deliverables
- [ ] Turborepo monorepo scaffolded (`apps/web`, `apps/api`, `packages/db`, `packages/ui`)
- [ ] NestJS API with basic health endpoint
- [ ] Next.js frontend shell (app router, layout, nav)
- [ ] PostgreSQL + Prisma: initial schema, migrations workflow established
- [ ] Redis connected; BullMQ wired with a test queue
- [ ] Better Auth integrated: sign in, sign out, session
- [ ] RBAC middleware on API (admin / user / viewer roles)
- [ ] CI: lint, typecheck, test on PR
- [ ] `.env` strategy documented; secrets not in repo
- [ ] Local dev: single `pnpm dev` command spins everything up

### Exit criteria
A team member can clone the repo, run `pnpm dev`, sign in, and see the dashboard shell. API returns 200 on `/health`. No features yet — just the runway.

---

## Phase 1 — Core CRM

**Goal:** Replace the basic daily contact + pipeline workflow. HL can be turned off for these tasks.

### Deliverables
- [ ] Contact CRUD, search, filter, tags
- [ ] Activity timeline on contact (event bus writes to DB)
- [ ] Company CRUD + contact linking
- [ ] Pipeline CRUD (multiple pipelines, ordered stages)
- [ ] Opportunity CRUD (create, edit, close as won/lost/abandoned)
- [ ] Kanban board (drag-drop, optimistic UI)
- [ ] Internal event bus: `contact.created`, `contact.updated`, `tag.added`, `tag.removed`, `opportunity.stage_changed`, `opportunity.closed`

### Exit criteria
The team can manage their full contact list and pipeline in the new CRM without touching HL. Data is in PostgreSQL. Events are flowing through BullMQ.

---

## Phase 2 — Conversations & Messaging

**Goal:** Replace HL's conversation inbox for SMS and Email. All replies go through our system.

### Deliverables
- [ ] Twilio: inbound SMS webhook → conversation thread
- [ ] Twilio: outbound SMS from conversation thread
- [ ] SendGrid: inbound email parse → conversation thread
- [ ] SendGrid: outbound email from conversation thread
- [ ] Unified inbox UI (list view + thread view)
- [ ] Conversation assignment to users
- [ ] Conversation open/closed status
- [ ] Message templates / snippets with variable substitution
- [ ] Unsubscribe flag on contact + enforced on outbound email
- [ ] Event: `message.received`, `message.sent`

### Exit criteria
Team can handle all inbound/outbound SMS and email from the new CRM. HL conversations no longer needed.

---

## Phase 3 — Workflow Engine

**Goal:** Replace HL automations. Trigger → action sequences run reliably in the background.

### Deliverables
- [ ] Workflow data model: trigger, action nodes, edges, status
- [ ] Visual workflow builder UI (node-based canvas)
- [ ] Trigger types: `contact.created`, `tag.added`, `stage.changed`, `message.received`, `form.submitted` (webhook)
- [ ] Action types: send SMS, send email, add tag, remove tag, move to stage, delay, fire outbound webhook
- [ ] Delay action: BullMQ delayed job, survives restarts
- [ ] Conditional branching (if/else nodes)
- [ ] Workflow activation / deactivation
- [ ] Workflow run log: per-contact execution history, step-level pass/fail
- [ ] Replay failed runs from the log

### Exit criteria
All existing HL automations have been recreated in the workflow builder and are running live. HL workflow module no longer in use.

---

## Phase 4 — Reporting & Dashboards

**Goal:** Visibility into what's happening. No more checking HL reports.

### Deliverables
- [ ] Home dashboard: contacts total, pipeline value by stage, open conversations, recent activity feed
- [ ] Pipeline report: value and count per stage, per pipeline, filterable by user and date
- [ ] Contact growth chart (by week/month)
- [ ] Conversation volume (by channel, by user)
- [ ] Workflow run analytics (success rate, most triggered, slowest)
- [ ] Date range selector across all reports

### Exit criteria
Key metrics are visible in the new CRM. No one needs to log into HL for reporting.

---

## Phase 5 — n8n Integration

**Goal:** Extend workflow capabilities via n8n for complex integrations the built-in engine doesn't cover.

### Deliverables
- [ ] Outbound webhook action fires to n8n trigger endpoint
- [ ] Inbound webhook ingest endpoint (`/ingest/webhook`) accepts n8n POST
- [ ] Documented trigger/action catalog for n8n ↔ CRM
- [ ] At least two live n8n workflows connected (e.g., Slack notification on won deal, Airtable sync)
- [ ] API key scoped for n8n integration

### Exit criteria
n8n can trigger actions in the CRM and the CRM can trigger n8n workflows. No manual bridging required.

---

## Phase 6 — HL Data Migration

**Goal:** Move all historical data from HighLevel to our CRM. Final cutover.

### Deliverables
- [ ] HL API ETL script: contacts, companies, pipelines, opportunities, conversations (where accessible)
- [ ] Dry-run mode with validation report (duplicates, missing fields, failed mappings)
- [ ] Conflict resolution strategy (documented + configurable: skip, overwrite, merge)
- [ ] Post-migration validation: row counts match, spot-check sample records
- [ ] HL subscription cancelled
- [ ] Team trained, HL bookmarks removed

### Exit criteria
All data is in the new CRM. HL is cancelled. Done.

---

## Post-Roadmap (Unscheduled)

These exist in the backlog but have no phase assignment yet:

- Calendar & Appointment Booking (Phase 7?)
- Broadcast SMS / Email Campaigns
- Facebook & Instagram Conversations
- Customer-facing portal
- Mobile app (PWA or native)
