# Release Checklist — Feature Slice Template

> **Usage:** Copy this checklist for each feature slice before merging to `main` or marking a milestone done.  
> Fill in the Feature and Date, then work through every item. Nothing ships with unchecked boxes unless explicitly waived with a documented reason.

---

## Feature Slice: `___________________`
**PR / Branch:** `___________________`  
**Developer:** `___________________`  
**Reviewer:** `___________________`  
**Date:** `___________________`  

---

## 🧪 Tests

### Unit Tests
- [ ] All unit tests pass (`pnpm test` — zero failures, zero unexpected skips)
- [ ] New service methods have corresponding unit tests
- [ ] Edge cases covered: invalid input, not-found, boundary values
- [ ] Mocks are realistic — Prisma mock reflects actual DB behavior

### Integration Tests
- [ ] All integration tests pass against test database
- [ ] Happy path tested for every new endpoint (GET, POST, PATCH, DELETE)
- [ ] Error paths tested: 400 (validation), 401 (unauth), 403 (forbidden), 404 (not found), 409 (conflict)
- [ ] Multi-tenant isolation verified: cross-account request returns 404 or 403 as appropriate
- [ ] Auth enforcement verified: protected endpoints return 401 without token

### E2E Tests
- [ ] E2E happy path passes in Chromium
- [ ] Critical user journey covered (create → view → edit → delete if applicable)
- [ ] No Playwright test uses `page.waitForTimeout()` as a stability crutch

### Coverage
- [ ] Overall coverage did not drop below threshold (70% unit minimum)
- [ ] New code in `src/` is covered — review coverage report artifact

---

## 📋 API Contract

- [ ] OpenAPI spec (`openapi.yaml` or Swagger decorator annotations) updated
- [ ] All new endpoints documented with request/response shapes
- [ ] All new DTOs annotated with `@ApiProperty()`
- [ ] Response shapes match `*ResponseDto` classes — no raw Prisma objects returned
- [ ] Error responses follow the standard error envelope `{ statusCode, message, error }`
- [ ] Breaking API changes documented and versioning strategy applied if needed

---

## 🗄️ Database

- [ ] Migration file generated (`prisma migrate dev --name <feature>`)
- [ ] Migration reviewed — no destructive changes (column drops, renames, type changes) without explicit approval
- [ ] Migration is reversible OR rollback plan documented
- [ ] New indexes added for query patterns introduced (especially on `accountId` + FK columns)
- [ ] `prisma.schema` changes are minimal and intentional
- [ ] Seeder updated if new required reference data was added

---

## 🔐 Security

- [ ] No hardcoded secrets, API keys, or passwords anywhere in the diff
- [ ] All new endpoints require auth (unless explicitly public — document why)
- [ ] `accountId` is always sourced from the auth session/token — never from request body or query params
- [ ] New admin-only routes decorated with `@Roles('admin')` and tested
- [ ] User input is validated via class-validator DTOs before reaching service layer
- [ ] No raw SQL queries with unescaped user input (use Prisma parameterized queries)
- [ ] Sensitive fields (passwords, tokens) never included in API responses
- [ ] No stack traces exposed in error responses (production mode)

---

## 🏗️ Multi-Tenant Isolation

- [ ] Every DB query that returns data is scoped by `accountId`
- [ ] Cross-account access test written and passing (account A cannot access account B's data)
- [ ] `accountId` injected at the service layer from auth context — not trust any user-supplied value
- [ ] Bulk operations (e.g., `deleteMany`) include `accountId` in where clause
- [ ] Background jobs (BullMQ) carry `accountId` in job payload and respect it

---

## ⚙️ Environment & Config

- [ ] `.env.example` updated if any new environment variables were added
- [ ] New env vars have sensible defaults or clear documentation in `.env.example`
- [ ] New env vars are validated at startup (use `@nestjs/config` schema validation)
- [ ] Feature flags (if used) documented and default state confirmed

---

## 🔄 Background Jobs (if applicable)

- [ ] New BullMQ jobs have unit tests for the processor
- [ ] Job payload includes `accountId` for tenant scoping
- [ ] Job failure handling tested (what happens on retry exhaustion?)
- [ ] Dead-letter / failure queue handling documented
- [ ] Job is idempotent (safe to re-run on retry)

---

## 📊 Observability

- [ ] New service methods include structured logging for key operations
- [ ] Errors are logged with sufficient context (accountId, resource id — no PII)
- [ ] Long-running operations have timeout handling
- [ ] New background jobs emit appropriate log events (started, completed, failed)

---

## 📝 Documentation & Parity

- [ ] Parity matrix updated (`docs/PARITY-MATRIX.md`) with HighLevel feature comparison
- [ ] Any deviations from HighLevel behavior documented (intentional vs deferred)
- [ ] Feature-specific README or module doc updated if architecture decisions were made
- [ ] ADR (Architecture Decision Record) written if a significant architectural choice was made

---

## 🚀 Deployment Readiness

- [ ] Code passes linting (`pnpm lint` — no errors)
- [ ] Code passes TypeScript type check (`pnpm typecheck` — no errors)
- [ ] Build succeeds (`pnpm build`)
- [ ] No `console.log` debug statements left in production code
- [ ] No `TODO` or `FIXME` comments merged without a tracked issue
- [ ] Dependencies added to `package.json` are intentional and audited
- [ ] No unused imports or dead code

---

## ✅ Sign-Off

All items above must be checked OR have a documented waiver below.

**Waivers (item + reason):**
```
Example: I-SI-08 (rate limiting) — Deferred to security hardening sprint, tracked in issue #42
```

_List any waivers here:_


---

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | | | |
| Reviewer | | | |
| QA (if applicable) | | | |

---

## 📎 Appendix — Quick Reference

### Run full test suite
```bash
pnpm test:cov          # Unit + integration with coverage
pnpm --filter @crm/web e2e  # E2E
```

### Check for hardcoded secrets
```bash
git diff main --name-only | xargs grep -nE "(password|secret|api_key|token)\s*=\s*['\"][^'\"]{8,}" || echo "Clean"
```

### Verify tenant isolation (manual smoke test)
1. Create resource as User A
2. Sign in as User B (different account)
3. Attempt to access User A's resource by ID → expect 404
4. List resources as User B → confirm User A's resource not present

### Migration safety check
```bash
# Review what the migration will do
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
```
