# Test Plan — Contacts Module

> **Module:** `ContactsModule` (`apps/api/src/contacts/`)  
> **Status:** Draft  
> **Last updated:** 2026-02-27

---

## Overview

The Contacts module is the core data entity of the CRM. It must be thoroughly tested because:
- It is the most-used module by end users
- It carries sensitive PII (name, email, phone)
- Multi-tenant isolation is critical — a user must never see another account's contacts
- It feeds downstream features (pipelines, campaigns, automations)

---

## Data Model (assumed)

```typescript
type Contact = {
  id: string;           // cuid/uuid
  accountId: string;    // tenant FK — non-nullable
  email: string;        // unique per account
  firstName: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
};
```

---

## 1. Unit Tests — `ContactsService`

File: `src/contacts/contacts.service.spec.ts`

### Setup
```typescript
const mockPrisma = mockDeep<PrismaClient>();
const service = new ContactsService(mockPrisma);
```

---

### 1.1 `create(dto, accountId)`

| Test ID | Description | Expected |
|---------|-------------|----------|
| U-C-01 | Creates contact with valid data | `prisma.contact.create` called with correct payload including `accountId` |
| U-C-02 | Throws `ConflictException` if email already exists in account | Exception thrown; no DB write |
| U-C-03 | Strips fields not in DTO (whitelist) | `create` not called with extra fields |
| U-C-04 | `accountId` is always injected from auth context, not from body | `create` called with service-provided `accountId` regardless of body |
| U-C-05 | Returns the created contact shape | Matches `ContactResponseDto` |

```typescript
it('U-C-01: creates contact with valid payload', async () => {
  mockPrisma.contact.findFirst.mockResolvedValue(null); // no duplicate
  mockPrisma.contact.create.mockResolvedValue(mockContact);

  const result = await service.create(createDto, 'account-A');

  expect(mockPrisma.contact.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ accountId: 'account-A', email: createDto.email }),
  });
  expect(result).toMatchObject({ id: mockContact.id });
});
```

---

### 1.2 `findAll(query, accountId)`

| Test ID | Description | Expected |
|---------|-------------|----------|
| U-FA-01 | Returns paginated list scoped to `accountId` | `findMany` called with `where: { accountId }` |
| U-FA-02 | Default pagination: page 1, limit 20 | Query includes `take: 20, skip: 0` |
| U-FA-03 | Custom page/limit respected | `take` and `skip` calculated correctly |
| U-FA-04 | Search query filters by name/email | `where` includes `OR` clause on `firstName`, `lastName`, `email` |
| U-FA-05 | Returns total count alongside results | Returns `{ data: [], total: N, page, limit }` |
| U-FA-06 | Empty account returns empty array | `data: []`, `total: 0` |
| U-FA-07 | Tags filter applied when provided | `where` includes `{ tags: { hasSome: [...] } }` |

---

### 1.3 `findOne(id, accountId)`

| Test ID | Description | Expected |
|---------|-------------|----------|
| U-FO-01 | Returns contact when `id` and `accountId` match | Contact object returned |
| U-FO-02 | Throws `NotFoundException` when contact doesn't exist | `NotFoundException` |
| U-FO-03 | Throws `NotFoundException` when contact belongs to different account | `NotFoundException` (not 403 — don't leak existence) |
| U-FO-04 | Always queries with `{ id, accountId }` compound where | Prisma called with both fields |

---

### 1.4 `update(id, dto, accountId)`

| Test ID | Description | Expected |
|---------|-------------|----------|
| U-U-01 | Updates allowed fields | `prisma.contact.update` called with correct data |
| U-U-02 | Throws `NotFoundException` if contact not in account | Exception thrown |
| U-U-03 | Email update checks for duplicate within account | `ConflictException` if new email taken |
| U-U-04 | Partial update — only provided fields change | `update` called only with provided keys |
| U-U-05 | `accountId` cannot be changed via update | `accountId` never in the `data` payload |
| U-U-06 | Returns updated contact | Matches updated DTO shape |

---

### 1.5 `remove(id, accountId)`

| Test ID | Description | Expected |
|---------|-------------|----------|
| U-D-01 | Deletes contact scoped to account | `prisma.contact.delete` called with `{ id, accountId }` |
| U-D-02 | Throws `NotFoundException` if contact doesn't exist in account | Exception thrown |
| U-D-03 | Returns confirmation / deleted contact | Consistent response shape |

---

## 2. Integration Tests — `ContactsController` via Supertest

File: `src/contacts/contacts.integration-spec.ts`

### Setup
```typescript
let app: INestApplication;
let tokenA: string;
let tokenB: string;
let accountAId: string;
let accountBId: string;

beforeAll(async () => {
  app = await createTestApp(ContactsModule);
  // Seed two accounts + users
  ({ tokenA, accountAId, tokenB, accountBId } = await seedTenantFixtures(app));
});

afterEach(async () => {
  await prisma.contact.deleteMany({ where: { accountId: { in: [accountAId, accountBId] } } });
});
```

---

### 2.1 `POST /contacts` — Create

| Test ID | Scenario | Status | Body |
|---------|----------|--------|------|
| I-C-01 | Valid payload + auth → created | 201 | Contact object |
| I-C-02 | Missing `email` | 400 | Validation error |
| I-C-03 | Missing `firstName` | 400 | Validation error |
| I-C-04 | Duplicate email in same account | 409 | Conflict error |
| I-C-05 | Same email in different account → allowed | 201 | Contact object |
| I-C-06 | No auth token | 401 | Unauthorized |
| I-C-07 | Invalid email format | 400 | Validation error |
| I-C-08 | Extra unknown fields stripped (not 400) | 201 | Contact without extra fields |

---

### 2.2 `GET /contacts` — List

| Test ID | Scenario | Status | Body |
|---------|----------|--------|------|
| I-L-01 | Auth user gets own contacts | 200 | `{ data: [...], total, page, limit }` |
| I-L-02 | Contacts from other account not included | 200 | `data` does not contain account-B contacts |
| I-L-03 | No auth | 401 | Unauthorized |
| I-L-04 | `?search=John` filters correctly | 200 | Filtered results |
| I-L-05 | `?page=2&limit=5` paginates | 200 | Correct slice |
| I-L-06 | `?page=9999` returns empty data, not error | 200 | `data: []` |
| I-L-07 | `?tags=vip,lead` filters by tags | 200 | Only tagged contacts |

---

### 2.3 `GET /contacts/:id` — Get One

| Test ID | Scenario | Status |
|---------|----------|--------|
| I-G-01 | Own contact | 200 |
| I-G-02 | Other account's contact ID | 404 |
| I-G-03 | Non-existent ID | 404 |
| I-G-04 | No auth | 401 |
| I-G-05 | Malformed UUID | 400 |

---

### 2.4 `PATCH /contacts/:id` — Update

| Test ID | Scenario | Status |
|---------|----------|--------|
| I-P-01 | Valid partial update | 200 |
| I-P-02 | Update contact from other account | 404 |
| I-P-03 | Change email to one already taken in same account | 409 |
| I-P-04 | Change email to one used in other account → allowed | 200 |
| I-P-05 | Empty body (no fields) | 200 (no-op) or 400 if at least one field required |
| I-P-06 | No auth | 401 |

---

### 2.5 `DELETE /contacts/:id` — Delete

| Test ID | Scenario | Status |
|---------|----------|--------|
| I-D-01 | Delete own contact | 200 or 204 |
| I-D-02 | Delete contact from other account | 404 |
| I-D-03 | Delete already-deleted contact | 404 |
| I-D-04 | No auth | 401 |

---

### 2.6 Tenant Isolation — Cross-cutting

| Test ID | Scenario |
|---------|----------|
| I-T-01 | Account-A list never contains account-B contacts |
| I-T-02 | Account-A cannot `GET` account-B contact by ID |
| I-T-03 | Account-A cannot `PATCH` account-B contact |
| I-T-04 | Account-A cannot `DELETE` account-B contact |
| I-T-05 | Contacts created under account-A have `accountId = account-A` in DB |

---

## 3. E2E Tests — Playwright

File: `apps/web/e2e/contacts.spec.ts`

All tests use the `ContactsPage` POM and run against a seeded environment.

### 3.1 Contacts List

| Test ID | Steps | Expected |
|---------|-------|----------|
| E-L-01 | Sign in → navigate to `/contacts` | Page loads, table renders |
| E-L-02 | Contacts page shows seeded contacts | Contact names visible in table |
| E-L-03 | Pagination controls appear when > 20 contacts | Pagination rendered |
| E-L-04 | Clicking page 2 loads next set | Different contacts shown |

### 3.2 Create Contact Form

| Test ID | Steps | Expected |
|---------|-------|----------|
| E-CR-01 | Click "New Contact" → form opens | Modal/form visible |
| E-CR-02 | Submit empty form | Validation errors inline |
| E-CR-03 | Submit with invalid email | Email error shown |
| E-CR-04 | Fill all required fields → submit | Contact appears in list, success toast |
| E-CR-05 | Duplicate email → submit | Error message shown |

### 3.3 Search & Filter

| Test ID | Steps | Expected |
|---------|-------|----------|
| E-S-01 | Type in search box | List filters in real-time (debounced) |
| E-S-02 | Search for name that exists | Matching contact shown |
| E-S-03 | Search for name that doesn't exist | Empty state shown |
| E-S-04 | Clear search | Full list restored |
| E-S-05 | Filter by tag | Only tagged contacts shown |

### 3.4 Edit & Delete

| Test ID | Steps | Expected |
|---------|-------|----------|
| E-ED-01 | Click contact row → detail view opens | Contact data displayed |
| E-ED-02 | Edit first name → save | Updated name shown |
| E-ED-03 | Delete contact → confirm dialog → confirm | Contact removed from list |
| E-ED-04 | Delete contact → confirm dialog → cancel | Contact still in list |

---

## 4. Edge Cases Summary

| Edge Case | Layer | Test IDs |
|-----------|-------|----------|
| Duplicate email within account | Unit + Integration | U-C-02, I-C-04 |
| Duplicate email across accounts (allowed) | Integration | I-C-05, I-P-04 |
| Missing required fields | Integration + E2E | I-C-02, I-C-03, E-CR-02 |
| Wrong `accountId` / tenant isolation | Unit + Integration | U-FO-03, I-T-01 to I-T-05 |
| Pagination edge: out-of-range page | Integration | I-L-06 |
| Empty search results | E2E | E-S-03 |
| Malformed UUID param | Integration | I-G-05 |
| No auth token | Integration | I-C-06, I-L-03, etc. |

---

## 5. Acceptance Criteria Checklist

Use this checklist before marking the Contacts module **done**. Every item must be checked by a developer or reviewer.

### Code Quality
- [ ] All unit tests pass (`pnpm test` — no skips without documented reason)
- [ ] Integration tests pass against test DB
- [ ] E2E happy paths pass in Chromium
- [ ] Coverage ≥ 70% for `contacts/` directory

### Correctness
- [ ] Create, read, update, delete all function correctly
- [ ] Email uniqueness enforced per account (not globally)
- [ ] Pagination returns correct `total`, `page`, `limit`, `data`
- [ ] Search filters by name and email
- [ ] Tag filtering works

### Security & Isolation
- [ ] All endpoints require auth (401 without token tested)
- [ ] No contact from another account is ever returned (I-T-01 to I-T-05 pass)
- [ ] `accountId` is always sourced from auth session, never from request body
- [ ] No PII leaked in error messages

### API Contract
- [ ] OpenAPI spec updated and matches actual behavior
- [ ] Response shapes match `ContactResponseDto`
- [ ] Error responses follow standard error envelope

### Infrastructure
- [ ] DB migration reviewed (no destructive changes)
- [ ] No hardcoded secrets or test credentials in source
- [ ] `.env.example` updated if new env vars introduced

### Downstream
- [ ] Parity matrix updated (HighLevel feature parity status)
- [ ] Any hooks/events for downstream modules (pipelines, automations) are tested

**Sign-off:**  
| Role | Name | Date |
|------|------|------|
| Developer | | |
| Reviewer | | |
| QA | | |
