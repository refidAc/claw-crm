# HL Parity Matrix

> Tracks feature parity between HighLevel and our internal CRM.
> Updated: 2026-02-27

| Feature | HL Module | Our Status | Notes |
|---|---|---|---|
| **CONTACTS & COMPANIES** | | | |
| Contact CRUD (create, read, update, delete) | Contacts | 📋 Backlog | Core P0 — Phase 1 |
| Contact search & filtering | Contacts | 📋 Backlog | Full-text + tag/field filters |
| Contact tags | Contacts | 📋 Backlog | Flat tag system, no hierarchy needed |
| Custom fields on contacts | Contacts | 📋 Backlog | Key/value, typed fields |
| Contact activity timeline | Contacts | 📋 Backlog | Unified event log per contact |
| Contact import/export (CSV) | Contacts | 📋 Backlog | P1 — needed for HL migration later |
| Bulk actions (tag, delete, assign) | Contacts | 📋 Backlog | P1 |
| Contact deduplication | Contacts | 📋 Backlog | P2 — fuzzy match on email/phone |
| Company CRUD | Companies | 📋 Backlog | Core P0 — Phase 1 |
| Company ↔ Contact linking | Companies | 📋 Backlog | Many-to-many |
| Company custom fields | Companies | 📋 Backlog | P1 |
| **PIPELINES & OPPORTUNITIES** | | | |
| Pipeline CRUD | Pipelines | 📋 Backlog | Multiple named pipelines |
| Pipeline stages CRUD | Pipelines | 📋 Backlog | Ordered, renameable |
| Kanban board (drag-drop) | Pipelines | 📋 Backlog | Core P0 — Phase 1 |
| Opportunity CRUD | Opportunities | 📋 Backlog | Core P0 |
| Move opportunity between stages | Opportunities | 📋 Backlog | Core P0 |
| Opportunity value / close date | Opportunities | 📋 Backlog | P0 |
| Won/Lost/Abandoned status | Opportunities | 📋 Backlog | P0 |
| Opportunity notes | Opportunities | 📋 Backlog | P1 |
| Opportunity source tracking | Opportunities | 📋 Backlog | P2 |
| **CONVERSATIONS** | | | |
| Unified inbox (all channels) | Conversations | 📋 Backlog | Core P0 — Phase 2 |
| SMS (Twilio) inbound/outbound | Conversations | 📋 Backlog | P0 — Phase 2 |
| Email (SendGrid) inbound/outbound | Conversations | 📋 Backlog | P0 — Phase 2 |
| Facebook Messenger | Conversations | ❌ Not Planned (MVP) | Post-MVP |
| Instagram DMs | Conversations | ❌ Not Planned (MVP) | Post-MVP |
| Google My Business chat | Conversations | ❌ Not Planned (MVP) | Post-MVP |
| Live Chat widget | Conversations | ❌ Not Planned (MVP) | Post-MVP |
| Conversation assignment to user | Conversations | 📋 Backlog | P1 |
| Conversation status (open/closed) | Conversations | 📋 Backlog | P0 |
| Message templates / snippets | Conversations | 📋 Backlog | P1 |
| AI reply suggestions | Conversations | ❌ Not Planned (MVP) | Future |
| **WORKFLOWS / AUTOMATIONS** | | | |
| Workflow builder UI | Workflows | 📋 Backlog | Core P0 — Phase 3 |
| Triggers (contact created, tag added, stage moved, form submitted, etc.) | Workflows | 📋 Backlog | P0 |
| Actions (send SMS, send email, add tag, move stage, webhook, wait/delay) | Workflows | 📋 Backlog | P0 |
| Delay/wait steps | Workflows | 📋 Backlog | P0 — BullMQ delayed jobs |
| Conditional branching (if/else) | Workflows | 📋 Backlog | P1 |
| Workflow activation/deactivation | Workflows | 📋 Backlog | P0 |
| Workflow run history / logs | Workflows | 📋 Backlog | P1 |
| Workflow templates | Workflows | 📋 Backlog | P2 |
| **CALENDARS & APPOINTMENTS** | | | |
| Calendar CRUD | Calendars | 📋 Backlog | P1 — Phase 4+ |
| Appointment booking | Calendars | 📋 Backlog | P1 |
| Availability/slot management | Calendars | 📋 Backlog | P1 |
| Round-robin assignment | Calendars | 📋 Backlog | P2 |
| Google Calendar sync | Calendars | 📋 Backlog | P2 |
| Public booking page | Calendars | 📋 Backlog | P2 |
| **FORMS & SURVEYS** | | | |
| Form builder | Forms | ❌ Not Planned (MVP) | Use Typeform/external for now |
| Survey builder | Surveys | ❌ Not Planned (MVP) | Post-MVP |
| Form embed code | Forms | ❌ Not Planned (MVP) | Post-MVP |
| Form → contact/opportunity trigger | Forms | 📋 Backlog | P2 — via webhook ingest |
| **FUNNELS & WEBSITES** | | | |
| Page/funnel builder | Funnels | ❌ Not Planned (MVP) | Not in scope |
| Custom domains | Funnels | ❌ Not Planned (MVP) | Not in scope |
| A/B testing | Funnels | ❌ Not Planned (MVP) | Not in scope |
| **EMAIL MARKETING / CAMPAIGNS** | | | |
| Email campaign builder | Campaigns | ❌ Not Planned (MVP) | Use SendGrid campaigns directly |
| Campaign scheduling | Campaigns | ❌ Not Planned (MVP) | Post-MVP |
| Broadcast SMS | Campaigns | ❌ Not Planned (MVP) | Post-MVP |
| Email template library | Campaigns | 📋 Backlog | P2 — basic templates |
| Unsubscribe / list management | Campaigns | 📋 Backlog | P1 — required for compliance |
| **REPUTATION MANAGEMENT** | | | |
| Review request automation | Reputation | ❌ Not Planned (MVP) | Post-MVP |
| GMB review monitoring | Reputation | ❌ Not Planned (MVP) | Not in scope |
| Review response templates | Reputation | ❌ Not Planned (MVP) | Not in scope |
| **REPORTING & DASHBOARDS** | | | |
| Home dashboard (key metrics) | Reporting | 📋 Backlog | P1 — Phase 4 |
| Pipeline value / stage report | Reporting | 📋 Backlog | P1 |
| Contact growth over time | Reporting | 📋 Backlog | P1 |
| Conversation volume report | Reporting | 📋 Backlog | P2 |
| Workflow run analytics | Reporting | 📋 Backlog | P2 |
| Custom report builder | Reporting | ❌ Not Planned (MVP) | Future |
| **PAYMENTS** | | | |
| Invoicing | Payments | ❌ Not Planned (MVP) | Not in scope |
| Stripe integration | Payments | ❌ Not Planned (MVP) | Post-MVP |
| Payment links | Payments | ❌ Not Planned (MVP) | Post-MVP |
| Order management | Payments | ❌ Not Planned (MVP) | Not in scope |
| **MEMBERSHIPS / COURSES** | | | |
| Course builder | Memberships | ❌ Not Planned (MVP) | Not in scope |
| Membership gating | Memberships | ❌ Not Planned (MVP) | Not in scope |
| Progress tracking | Memberships | ❌ Not Planned (MVP) | Not in scope |
| **SOCIAL PLANNER** | | | |
| Social post scheduling | Social | ❌ Not Planned (MVP) | Not in scope |
| Social account connections | Social | ❌ Not Planned (MVP) | Not in scope |
| Content calendar | Social | ❌ Not Planned (MVP) | Not in scope |
| **SUB-ACCOUNTS / AGENCY** | | | |
| Sub-account (location) management | Agency | ❌ Not Planned (MVP) | Internal use only — single tenant |
| White-labeling | Agency | ❌ Not Planned (MVP) | Not in scope |
| Agency-level reporting | Agency | ❌ Not Planned (MVP) | Not in scope |
| User roles per sub-account | Agency | ❌ Not Planned (MVP) | Single account, internal RBAC only |
| **AUTH & PLATFORM** | | | |
| Sign in / sign out | Auth | 📋 Backlog | P0 — Phase 0 |
| Session management | Auth | 📋 Backlog | P0 — Phase 0 |
| RBAC (admin, user, viewer) | Auth | 📋 Backlog | P0 — Phase 0 |
| Password reset | Auth | 📋 Backlog | P0 |
| 2FA / MFA | Auth | 📋 Backlog | P1 |
| API key management | Auth | 📋 Backlog | P2 |
| Audit log | Auth | 📋 Backlog | P2 |

---

**Status legend:**
- ✅ Done
- 🔨 In Progress
- 📋 Backlog
- ❌ Not Planned (MVP)
