# Backlog

> Prioritized feature list for the internal CRM.
> Format: P0 = MVP blocker | P1 = important | P2 = nice to have | P3 = future
> Updated: 2026-02-27

---

## P0 — MVP Blockers

---

## [P0] Auth: Sign In & Session Management
- **Module:** Auth
- **Acceptance criteria:**
  - User can sign in with email + password
  - Session persists across page refreshes (JWT or session cookie via Better Auth)
  - Session expires after configurable idle timeout
  - Sign out invalidates session server-side
  - Failed login attempts are rate-limited (5 attempts → 15 min lockout)
- **Dependencies:** Better Auth configured, PostgreSQL users table, Redis for session store
- **Estimated complexity:** M

---

## [P0] Auth: Role-Based Access Control (RBAC)
- **Module:** Auth
- **Acceptance criteria:**
  - Three roles defined: `admin`, `user`, `viewer`
  - Admin can manage users and all data
  - User can create/edit contacts, opportunities, conversations
  - Viewer has read-only access
  - Role is checked server-side on every protected API endpoint
  - Unauthorized access returns 403, not a redirect loop
- **Dependencies:** Auth: Sign In & Session
- **Estimated complexity:** M

---

## [P0] Contacts: CRUD
- **Module:** Contacts
- **Acceptance criteria:**
  - Create contact with: first name, last name, email, phone, tags, notes, assigned user
  - View contact detail page with all fields
  - Edit any field inline or via form
  - Soft-delete contact (archived, not destroyed)
  - Hard-delete available to admin only
  - All contact mutations emit an event to the event bus
- **Dependencies:** Auth RBAC, Prisma schema: Contact model
- **Estimated complexity:** M

---

## [P0] Contacts: Search & Filter
- **Module:** Contacts
- **Acceptance criteria:**
  - Full-text search across name, email, phone
  - Filter by: tag(s), assigned user, creation date range, company
  - Filters are combinable (AND logic)
  - Search results update without full page reload
  - Pagination or infinite scroll (≥50 contacts visible per page)
- **Dependencies:** Contacts CRUD, PostgreSQL full-text index or pg_trgm
- **Estimated complexity:** M

---

## [P0] Contacts: Tags
- **Module:** Contacts
- **Acceptance criteria:**
  - Add one or more tags to a contact
  - Remove tags from a contact
  - Tags are free-form strings, auto-complete from existing tags
  - Tag changes are recorded in the activity timeline
  - Filter contacts by tag (see Search & Filter)
- **Dependencies:** Contacts CRUD
- **Estimated complexity:** S

---

## [P0] Companies: CRUD
- **Module:** Companies
- **Acceptance criteria:**
  - Create company with: name, website, phone, address, industry, notes
  - View company detail page
  - Edit any field
  - Soft-delete company
  - Company deletion does not delete linked contacts — just removes the link
- **Dependencies:** Prisma schema: Company model
- **Estimated complexity:** M

---

## [P0] Companies: Link to Contacts
- **Module:** Companies
- **Acceptance criteria:**
  - Assign a contact to a company (many contacts → one company, primary)
  - Contact can belong to multiple companies (secondary)
  - Company detail page shows all linked contacts
  - Contact detail shows their company with a clickable link
  - Linking/unlinking is logged in activity timeline
- **Dependencies:** Companies CRUD, Contacts CRUD
- **Estimated complexity:** S

---

## [P0] Pipelines: CRUD Stages
- **Module:** Pipelines
- **Acceptance criteria:**
  - Create a named pipeline
  - Add, rename, reorder, and delete stages within a pipeline
  - At least one pipeline must exist before creating opportunities
  - Deleting a stage prompts to move existing opportunities to another stage
  - Multiple pipelines supported
- **Dependencies:** Prisma schema: Pipeline, Stage models
- **Estimated complexity:** M

---

## [P0] Pipelines: Drag-Drop Kanban Board
- **Module:** Pipelines
- **Acceptance criteria:**
  - Kanban view renders all stages as columns
  - Opportunity cards show: contact name, value, assigned user, days in stage
  - Drag a card between columns → stage updates immediately (optimistic UI)
  - Server confirms update; rolls back card on failure
  - Board is filterable by assigned user and pipeline
- **Dependencies:** Pipelines CRUD, Opportunities CRUD
- **Estimated complexity:** L

---

## [P0] Opportunities: Create, Move Stages, Close
- **Module:** Opportunities
- **Acceptance criteria:**
  - Create opportunity linked to a contact, assigned to a pipeline+stage
  - Fields: title, value ($), expected close date, assigned user, notes
  - Move opportunity to any stage in the same pipeline
  - Mark opportunity as Won, Lost, or Abandoned (with optional reason)
  - Closed opportunities are hidden from the Kanban by default (toggle to show)
  - All stage moves are recorded in the activity timeline
- **Dependencies:** Pipelines CRUD, Contacts CRUD
- **Estimated complexity:** M

---

## [P0] Activity Timeline on Contact
- **Module:** Contacts
- **Acceptance criteria:**
  - Contact detail page shows a chronological event log
  - Timeline events include: contact created, field updated, tag added/removed, opportunity stage moved, message sent/received, workflow triggered
  - Each event shows: timestamp, actor (user or system), description
  - Timeline is read-only; no editing of past events
  - Events are appended via the event bus, not direct DB writes from UI
- **Dependencies:** Contacts CRUD, event bus setup
- **Estimated complexity:** M

---

## [P0] Conversations: Unified Inbox
- **Module:** Conversations
- **Acceptance criteria:**
  - Single inbox view listing all conversations across SMS and Email
  - Each row shows: contact name, channel icon, last message preview, timestamp, unread count
  - Click a conversation to open the thread view
  - Conversations can be marked open or closed
  - Unread badge on nav icon
- **Dependencies:** Twilio inbound webhook, SendGrid inbound parse, Contact model
- **Estimated complexity:** L

---

## [P0] Conversations: Reply via SMS & Email
- **Module:** Conversations
- **Acceptance criteria:**
  - User can type and send a reply in the thread view
  - SMS replies sent via Twilio API; message logged in DB
  - Email replies sent via SendGrid API; message logged in DB
  - Sent messages appear immediately in the thread (optimistic UI)
  - Delivery failures surface as an error state on the message
  - From/sender identity is configurable per channel in settings
- **Dependencies:** Unified Inbox, Twilio integration, SendGrid integration
- **Estimated complexity:** L

---

## [P0] Workflow Builder: Trigger Config, Action Sequence, Save/Activate
- **Module:** Workflows
- **Acceptance criteria:**
  - Visual builder: add a trigger, chain one or more actions
  - Triggers available at launch: contact created, tag added, stage changed, form webhook received
  - Actions available at launch: send SMS, send email, add tag, remove tag, move to stage, delay (wait X minutes/hours/days), fire webhook
  - Workflow can be saved as draft or activated
  - Activated workflows respond to live events via the event bus
  - Workflow runs are logged (contact ID, trigger event, actions executed, success/fail per step)
- **Dependencies:** Event bus (BullMQ), Conversations SMS/Email, Contacts Tags, Opportunities Stages
- **Estimated complexity:** XL

---

## P1 — Important

---

## [P1] Password Reset Flow
- **Module:** Auth
- **Acceptance criteria:**
  - User can request a reset email from the login page
  - Reset link is time-limited (1 hour)
  - Link is single-use; invalidated after use
  - New password must meet minimum requirements (8+ chars, mixed)
- **Dependencies:** Auth Sign In, SendGrid email
- **Estimated complexity:** S

---

## [P1] Two-Factor Authentication (2FA)
- **Module:** Auth
- **Acceptance criteria:**
  - Users can enable TOTP-based 2FA (Google Authenticator, Authy)
  - Admin can require 2FA for all users
  - Recovery codes generated on setup (downloadable once)
- **Dependencies:** Auth Sign In, Better Auth TOTP plugin
- **Estimated complexity:** M

---

## [P1] Contact Import via CSV
- **Module:** Contacts
- **Acceptance criteria:**
  - Upload a CSV with mapped columns (name, email, phone, tags, company)
  - Preview import before confirming
  - Duplicate detection on email/phone — skip or merge options
  - Import runs as a background job; user notified when complete
  - Error report shows which rows failed and why
- **Dependencies:** Contacts CRUD, BullMQ job queue
- **Estimated complexity:** L

---

## [P1] Conversation Assignment
- **Module:** Conversations
- **Acceptance criteria:**
  - Assign a conversation to a specific user
  - Inbox filterable by "my conversations"
  - Assignee change is logged in the conversation thread
- **Dependencies:** Unified Inbox, User/RBAC model
- **Estimated complexity:** S

---

## [P1] Message Templates / Snippets
- **Module:** Conversations
- **Acceptance criteria:**
  - Create, edit, delete message templates (SMS and Email variants)
  - Templates support basic variables: `{{first_name}}`, `{{last_name}}`, `{{company}}`
  - Accessible from the compose area via `/` shortcut or dropdown
- **Dependencies:** Conversations Reply
- **Estimated complexity:** M

---

## [P1] Workflow Conditional Branching
- **Module:** Workflows
- **Acceptance criteria:**
  - Add an If/Else node in the workflow builder
  - Conditions: field equals, tag present, stage is, value greater than
  - Each branch can have its own action sequence
  - Conditions evaluated at runtime against the contact's current state
- **Dependencies:** Workflow Builder P0
- **Estimated complexity:** L

---

## [P1] Workflow Run History & Logs
- **Module:** Workflows
- **Acceptance criteria:**
  - View all runs for a given workflow (paginated)
  - Each run shows: contact, trigger timestamp, each action + pass/fail + error message
  - Can re-trigger a failed run (replay) from the log entry
  - Admin can view logs for any workflow; users see only their assigned
- **Dependencies:** Workflow Builder P0
- **Estimated complexity:** M

---

## [P1] Dashboard: Key Metrics Home Screen
- **Module:** Reporting
- **Acceptance criteria:**
  - Shows at a glance: total contacts, open opportunities by pipeline, open conversations, recent activity
  - Metrics update on page load (no live push needed at P1)
  - Date range selector (today, 7d, 30d, custom)
- **Dependencies:** Contacts, Opportunities, Conversations all complete
- **Estimated complexity:** M

---

## [P1] Pipeline Value & Stage Report
- **Module:** Reporting
- **Acceptance criteria:**
  - Table/bar chart showing total opportunity value per stage
  - Filterable by pipeline, date range, assigned user
  - Shows count + total $ value
- **Dependencies:** Opportunities, Dashboard
- **Estimated complexity:** M

---

## [P1] Unsubscribe / Email List Management
- **Module:** Contacts / Conversations
- **Acceptance criteria:**
  - Contact can be marked as unsubscribed from email
  - Unsubscribed contacts are excluded from outbound emails automatically
  - Unsubscribe link in outbound emails toggles this flag via webhook
  - Unsubscribe status visible on contact detail
- **Dependencies:** Contacts CRUD, SendGrid integration
- **Estimated complexity:** S

---

## P2 — Nice to Have

---

## [P2] Contact Deduplication
- **Module:** Contacts
- **Acceptance criteria:**
  - System detects potential duplicates on email or phone match
  - Admin review screen to merge or dismiss suggested duplicates
  - Merge combines activity timelines, tags, and linked opportunities
- **Dependencies:** Contacts CRUD
- **Estimated complexity:** L

---

## [P2] Company Custom Fields
- **Module:** Companies
- **Acceptance criteria:**
  - Admin can define custom fields (text, number, date, select) for companies
  - Fields appear on company detail/edit form
  - Custom fields searchable/filterable
- **Dependencies:** Companies CRUD
- **Estimated complexity:** M

---

## [P2] Opportunity Source Tracking
- **Module:** Opportunities
- **Acceptance criteria:**
  - Optional `source` field on opportunity (dropdown: manual, form, workflow, import, API)
  - Source shown in pipeline card and detail
  - Filterable in pipeline report
- **Dependencies:** Opportunities CRUD
- **Estimated complexity:** S

---

## [P2] Form Webhook Ingest (Trigger)
- **Module:** Workflows / Contacts
- **Acceptance criteria:**
  - Webhook endpoint `/ingest/form` accepts JSON payload
  - Maps payload fields to contact fields (configurable mapping)
  - Creates or updates a contact; fires `form.submitted` event
  - Workflow can trigger on `form.submitted`
- **Dependencies:** Contacts CRUD, Workflow Builder
- **Estimated complexity:** M

---

## [P2] Email Template Library
- **Module:** Conversations / Workflows
- **Acceptance criteria:**
  - Pre-built templates for common scenarios (follow-up, intro, reminder)
  - Clone and customize templates
  - Used in both manual sends and workflow actions
- **Dependencies:** Message Templates, Workflow Builder
- **Estimated complexity:** M

---

## [P2] API Key Management
- **Module:** Auth / Platform
- **Acceptance criteria:**
  - Admin can generate named API keys with scoped permissions
  - Keys can be revoked
  - API requests authenticated via `Authorization: Bearer <key>`
- **Dependencies:** Auth RBAC
- **Estimated complexity:** M

---

## [P2] Audit Log
- **Module:** Auth / Platform
- **Acceptance criteria:**
  - Immutable log of security-relevant actions: login, logout, user created, role changed, API key issued/revoked, bulk delete
  - Viewable by admin only
  - Exportable as CSV
- **Dependencies:** Auth RBAC
- **Estimated complexity:** M

---

## P3 — Future

---

## [P3] Calendar & Appointment Booking
- **Module:** Calendars
- **Acceptance criteria:** Full booking flow, availability config, Google Calendar sync, public booking page
- **Dependencies:** Contacts, Notifications
- **Estimated complexity:** XL

---

## [P3] n8n Integration
- **Module:** Workflows / Platform
- **Acceptance criteria:** Outbound webhook triggers to n8n; n8n can POST back to ingest endpoint; documented trigger/action catalog
- **Dependencies:** Event bus, Webhook ingest
- **Estimated complexity:** M

---

## [P3] HL Data Migration
- **Module:** Platform
- **Acceptance criteria:** ETL script to pull contacts, companies, pipelines, opportunities from HL API; dry-run mode; conflict resolution; post-migration validation report
- **Dependencies:** All P0/P1 complete, HL API credentials
- **Estimated complexity:** XL

---

## [P3] Facebook & Instagram Conversations
- **Module:** Conversations
- **Acceptance criteria:** FB Messenger and IG DMs in unified inbox; requires Meta app approval
- **Dependencies:** Unified Inbox, Meta Developer account
- **Estimated complexity:** L

---

## [P3] Broadcast SMS / Email Campaigns
- **Module:** Campaigns
- **Acceptance criteria:** Select a contact segment, compose message, schedule send, delivery stats (sent, opened, failed)
- **Dependencies:** Conversations, Unsubscribe management, BullMQ
- **Estimated complexity:** XL

---

## [P3] Reporting: Custom Report Builder
- **Module:** Reporting
- **Acceptance criteria:** Drag-and-drop metric selection, filter builder, chart type selection, save/share reports
- **Dependencies:** All data modules complete
- **Estimated complexity:** XL
