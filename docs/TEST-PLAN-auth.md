# Test Plan — Auth Module

> **Module:** `AuthModule` (Better Auth + NestJS guards)  
> **Status:** Draft  
> **Last updated:** 2026-02-27

---

## Overview

Auth is the security foundation of the entire platform. Failures here affect every module. Test coverage must be thorough, covering:

- Password hashing and verification
- Session/token lifecycle (issue, validate, expire)
- RBAC enforcement (admin vs member)
- Multi-tenant isolation (users cannot cross account boundaries)
- E2E flows: sign in, dashboard redirect, sign out

---

## Auth Architecture (assumed)

- **Better Auth** handles session management (cookie-based sessions or JWT — confirm in implementation)
- NestJS `AuthGuard` / custom guards enforce authentication on protected routes
- Role guard (`RolesGuard`) enforces RBAC per route
- Every user belongs to exactly one `Account` (tenant)
- Roles per account membership: `admin`, `member`

---

## 1. Unit Tests

File: `src/auth/auth.service.spec.ts`, `src/auth/guards/*.spec.ts`

---

### 1.1 Password Hashing

| Test ID | Description | Expected |
|---------|-------------|----------|
| U-PW-01 | `hashPassword(plain)` returns bcrypt hash (not plain text) | Result starts with `$2b$` |
| U-PW-02 | `hashPassword` is non-deterministic — two calls produce different hashes | `hash1 !== hash2` |
| U-PW-03 | `verifyPassword(plain, hash)` returns `true` for correct password | `true` |
| U-PW-04 | `verifyPassword(wrong, hash)` returns `false` | `false` |
| U-PW-05 | `verifyPassword(plain, tamperedHash)` returns `false` | `false` |
| U-PW-06 | Empty string password hashes (don't crash) — and verify rejects at DTO layer | DTO validation catches it |

```typescript
describe('password hashing', () => {
  it('U-PW-01: hash is not plain text', async () => {
    const hash = await hashPassword('mypassword');
    expect(hash).not.toBe('mypassword');
    expect(hash).toMatch(/^\$2b\$/);
  });

  it('U-PW-03: correct password verifies', async () => {
    const hash = await hashPassword('correct');
    expect(await verifyPassword('correct', hash)).toBe(true);
  });

  it('U-PW-04: wrong password rejected', async () => {
    const hash = await hashPassword('correct');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});
```

---

### 1.2 JWT / Session Validation

> Adjust based on whether Better Auth uses JWT or opaque sessions.

| Test ID | Description | Expected |
|---------|-------------|----------|
| U-JWT-01 | Valid token passes `validateToken()` | Returns decoded payload |
| U-JWT-02 | Expired token rejected | Throws `UnauthorizedException` or returns null |
| U-JWT-03 | Token signed with wrong secret rejected | Throws or returns null |
| U-JWT-04 | Tampered payload (valid signature but modified claim) rejected | Throws |
| U-JWT-05 | Token without required claims (`sub`, `accountId`, `role`) rejected | Throws |
| U-JWT-06 | Token payload contains `accountId` — used for tenant scoping | Decoded payload includes `accountId` |

---

### 1.3 Auth Guard (`JwtAuthGuard` / `SessionGuard`)

| Test ID | Description | Expected |
|---------|-------------|----------|
| U-AG-01 | `canActivate` returns `true` for valid token/session | `true` |
| U-AG-02 | `canActivate` returns `false` / throws for missing token | `false` or `UnauthorizedException` |
| U-AG-03 | `canActivate` returns `false` for expired token | `false` or `UnauthorizedException` |
| U-AG-04 | Guard extracts `accountId` and attaches to `request.user` | `request.user.accountId` set |

---

### 1.4 Roles Guard (`RolesGuard`)

| Test ID | Description | Expected |
|---------|-------------|----------|
| U-RG-01 | Admin user on admin-only route → allowed | `canActivate` returns `true` |
| U-RG-02 | Member user on admin-only route → denied | `ForbiddenException` |
| U-RG-03 | Route with no `@Roles()` decorator → accessible to any authenticated user | `true` |
| U-RG-04 | Unauthenticated request on `@Roles(admin)` route | `UnauthorizedException` (auth guard fires first) |
| U-RG-05 | `member` user on member-allowed route | `true` |

---

### 1.5 Session Expiry

| Test ID | Description | Expected |
|---------|-------------|----------|
| U-SE-01 | Session created with TTL expires after TTL | `validateSession` returns null after TTL |
| U-SE-02 | Active session within TTL is valid | Returns session data |
| U-SE-03 | Sign-out invalidates session immediately | Session lookup returns null after sign-out |

---

## 2. Integration Tests — Auth Endpoints via Supertest

File: `src/auth/auth.integration-spec.ts`

### Setup
```typescript
let app: INestApplication;
let seededUser: { email: string; password: string; accountId: string };
let adminUser: { email: string; password: string; accountId: string };

beforeAll(async () => {
  app = await createTestApp(AuthModule);
  seededUser = await seedUser(app, { role: 'member' });
  adminUser = await seedUser(app, { role: 'admin' });
});
```

---

### 2.1 `POST /auth/signin`

| Test ID | Scenario | Status | Body |
|---------|----------|--------|------|
| I-SI-01 | Valid email + password | 200 | Session token / cookie set |
| I-SI-02 | Wrong password | 401 | Error message |
| I-SI-03 | Non-existent email | 401 | Error message (same as wrong pw — no user enumeration) |
| I-SI-04 | Missing email field | 400 | Validation error |
| I-SI-05 | Missing password field | 400 | Validation error |
| I-SI-06 | Empty string password | 400 | Validation error |
| I-SI-07 | Correct credentials → response includes `accountId` in session/token | Session contains `accountId` |
| I-SI-08 | Brute force — 10 rapid failed attempts (if rate limiting implemented) | 429 on excess |

```typescript
it('I-SI-01: valid credentials return session', async () => {
  const res = await request(app.getHttpServer())
    .post('/auth/signin')
    .send({ email: seededUser.email, password: seededUser.password })
    .expect(200);

  // Adjust assertion based on cookie vs token response
  expect(res.body.token ?? res.headers['set-cookie']).toBeTruthy();
});

it('I-SI-03: unknown email returns 401 (no user enumeration)', async () => {
  const res = await request(app.getHttpServer())
    .post('/auth/signin')
    .send({ email: 'nobody@example.com', password: 'whatever' })
    .expect(401);

  // Error message should NOT say "user not found"
  expect(res.body.message).not.toMatch(/not found/i);
});
```

---

### 2.2 `POST /auth/signout`

| Test ID | Scenario | Status |
|---------|----------|--------|
| I-SO-01 | Sign out with valid session | 200 or 204 |
| I-SO-02 | After sign out, previous token/session returns 401 on protected route | 401 |
| I-SO-03 | Sign out without auth (already signed out) | 401 or 200 (graceful) |

---

### 2.3 Protected Route Enforcement

| Test ID | Scenario | Status |
|---------|----------|--------|
| I-PR-01 | Access protected route with valid token | 200 |
| I-PR-02 | Access protected route with no token | 401 |
| I-PR-03 | Access protected route with expired token | 401 |
| I-PR-04 | Access protected route with malformed token | 401 |
| I-PR-05 | Access protected route with token from different environment (wrong secret) | 401 |

---

### 2.4 RBAC — Role-Based Access

| Test ID | Scenario | Status |
|---------|----------|--------|
| I-RBAC-01 | Admin accesses `GET /admin/*` route | 200 |
| I-RBAC-02 | Member accesses `GET /admin/*` route | 403 |
| I-RBAC-03 | Admin accesses member-only route | 200 (admin ≥ member) |
| I-RBAC-04 | Unauthenticated accesses admin route | 401 |
| I-RBAC-05 | Member accesses own profile endpoint | 200 |
| I-RBAC-06 | Member attempts to promote another user to admin | 403 |

```typescript
it('I-RBAC-02: member cannot access admin route', async () => {
  const memberToken = await getAuthToken(app, seededUser);

  await request(app.getHttpServer())
    .get('/admin/users')
    .set('Authorization', `Bearer ${memberToken}`)
    .expect(403);
});
```

---

### 2.5 Multi-Tenant Auth Isolation

This is the most critical section. A token scoped to account A must never grant access to account B's data.

| Test ID | Scenario | Status |
|---------|----------|--------|
| I-MT-01 | User from account A requests `GET /contacts` → only gets account A contacts | 200, filtered |
| I-MT-02 | User from account A requests contact by ID that belongs to account B | 404 |
| I-MT-03 | User from account A cannot sign in as account B user (different credentials) | 401 |
| I-MT-04 | Token payload `accountId` cannot be overridden via request header/body | System ignores user-supplied `accountId` |
| I-MT-05 | Admin of account A cannot access account B's admin routes | 403 or 404 |
| I-MT-06 | Creating a resource always uses `accountId` from token, not request body | DB record has correct `accountId` |

```typescript
it('I-MT-04: accountId from body is ignored — uses token value', async () => {
  const tokenA = await getAuthToken(app, userA);

  const res = await request(app.getHttpServer())
    .post('/contacts')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ ...validContact, accountId: accountBId }) // attempt injection
    .expect(201);

  // Contact should be stored under account A, not B
  const contact = await prisma.contact.findUnique({ where: { id: res.body.id } });
  expect(contact.accountId).toBe(accountAId);
  expect(contact.accountId).not.toBe(accountBId);
});
```

---

## 3. E2E Tests — Playwright

File: `apps/web/e2e/auth.spec.ts`

---

### 3.1 Sign In Flow

| Test ID | Steps | Expected |
|---------|-------|----------|
| E-SI-01 | Navigate to `/` (unauthenticated) | Redirected to `/login` |
| E-SI-02 | Submit login form with valid credentials | Redirected to `/dashboard` |
| E-SI-03 | Dashboard shows user's name / account name | Personalized content visible |
| E-SI-04 | Submit login form with wrong password | Error message shown, stays on `/login` |
| E-SI-05 | Submit login form with empty fields | Inline validation errors |
| E-SI-06 | Browser back after login does not re-show login form | Stays on dashboard |

```typescript
test('E-SI-02: valid credentials → dashboard redirect', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(testUser.email);
  await page.getByLabel('Password').fill(testUser.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText(testUser.name)).toBeVisible();
});
```

---

### 3.2 Authenticated Navigation

| Test ID | Steps | Expected |
|---------|-------|----------|
| E-AN-01 | Authenticated user navigates to `/contacts` | Page loads (no redirect to login) |
| E-AN-02 | Navigate directly to `/login` when already authenticated | Redirected to `/dashboard` |
| E-AN-03 | Access `/admin` as member | Redirected or shown 403 page |
| E-AN-04 | Access `/admin` as admin | Loads correctly |

---

### 3.3 Sign Out Flow

| Test ID | Steps | Expected |
|---------|-------|----------|
| E-SO-01 | Click sign out button | Redirected to `/login` |
| E-SO-02 | After sign out, navigate to `/dashboard` directly | Redirected to `/login` |
| E-SO-03 | After sign out, back button doesn't restore session | `/login` shown, not cached dashboard |

```typescript
test('E-SO-02: session cleared after sign out', async ({ page }) => {
  await signIn(page, testUser);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/login');

  // Try to navigate back to protected page
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});
```

---

### 3.4 Session Persistence

| Test ID | Steps | Expected |
|---------|-------|----------|
| E-SP-01 | Sign in → close tab → reopen → navigate to `/dashboard` | Still authenticated (if remember-me / persistent session) |
| E-SP-02 | Session expires (mocked) → user navigated to login | Login page shown with expiry message |

---

## 4. Edge Cases Summary

| Edge Case | Layer | Test IDs |
|-----------|-------|----------|
| User enumeration via sign-in response | Integration | I-SI-03 |
| Expired token on protected route | Unit + Integration | U-JWT-02, I-PR-03 |
| Tampered JWT | Unit + Integration | U-JWT-04, I-PR-05 |
| Cross-account resource access | Integration | I-MT-01 to I-MT-06 |
| Member accessing admin route | Unit + Integration | U-RG-02, I-RBAC-02 |
| `accountId` injection via request body | Integration | I-MT-04 |
| Rapid failed logins (rate limiting) | Integration | I-SI-08 |
| Session after sign-out | Integration + E2E | I-SO-02, E-SO-02 |

---

## 5. Acceptance Criteria Checklist

### Code Quality
- [ ] All unit tests pass
- [ ] Integration tests pass against test DB
- [ ] E2E auth flow passes in Chromium
- [ ] Coverage ≥ 80% for `auth/` directory (higher bar — security-critical)

### Authentication
- [ ] Passwords are never stored in plain text (bcrypt hash verified)
- [ ] Hashing is non-deterministic (salt verified)
- [ ] Sign-in returns valid session/token
- [ ] Sign-out invalidates session immediately
- [ ] Expired sessions/tokens rejected with 401
- [ ] Malformed tokens rejected with 401

### Authorization (RBAC)
- [ ] Admin-only routes return 403 for members (not 404)
- [ ] Unauthenticated requests return 401 (not 403)
- [ ] Role hierarchy is correct (admin ≥ member)

### Multi-Tenant Isolation
- [ ] `accountId` always sourced from token, never from request body
- [ ] Cross-account resource access returns 404 (not 403 — don't leak existence)
- [ ] No data from another tenant ever returned to authenticated user

### Security Hygiene
- [ ] No user enumeration in auth error messages
- [ ] No stack traces in production error responses
- [ ] Auth secrets only in env vars — never hardcoded
- [ ] Rate limiting on sign-in endpoint (document if deferred)
- [ ] HTTPS enforced in production (document enforcement point)

### E2E
- [ ] Sign-in redirects to dashboard
- [ ] Sign-out clears session and redirects to login
- [ ] Protected routes redirect unauthenticated users to login
- [ ] Auth errors show user-friendly messages

**Sign-off:**  
| Role | Name | Date |
|------|------|------|
| Developer | | |
| Reviewer | | |
| QA | | |
