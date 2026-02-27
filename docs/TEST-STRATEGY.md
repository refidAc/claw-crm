# Test Strategy — CRM Platform

> **Scope:** Internal HighLevel replacement CRM  
> **Stack:** NestJS · Next.js · Prisma · PostgreSQL · Redis/BullMQ · Better Auth · Turborepo  
> **Testing tools:** Jest (unit/integration) · Supertest (API) · Playwright (E2E)

---

## 1. Philosophy

Quality is not a phase. It is continuous.

- Tests are written **alongside** the feature, not after.
- A feature is not "done" until it passes its acceptance checklist.
- Tests must be **deterministic** — flaky tests are treated as bugs.
- Every layer of the stack has a designated testing tool. Don't reach for the wrong one.
- **Multi-tenancy is a first-class concern.** Every test that touches data must prove it respects account boundaries.

---

## 2. Testing Pyramid

```
        /‾‾‾‾‾‾‾‾‾‾‾‾\
       /   E2E (10%)   \       Playwright — full user flows
      /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
     / Integration (30%) \     Supertest — HTTP layer, DB round-trips
    /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
   /    Unit Tests (60%)   \   Jest — services, utilities, guards
  /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
```

| Layer       | What lives here                                           | Speed    | Scope          |
|-------------|-----------------------------------------------------------|----------|----------------|
| Unit        | Services, guards, pipes, utilities, validation logic      | Fast     | Single class   |
| Integration | Controllers via HTTP, DB reads/writes with test DB        | Medium   | Module/API     |
| E2E         | Full browser flows: login → action → verify result        | Slow     | Full stack     |

---

## 3. What Gets Tested at Each Layer

### Unit (Jest)
- Service methods with mocked Prisma client
- Auth guards (canActivate logic)
- Password hashing / comparison helpers
- JWT encode/decode/expiry helpers
- BullMQ job processors with mocked queue
- Pagination utilities, filter-builder functions
- DTOs and class-validator constraints (run `validate()` directly)

### Integration (Jest + Supertest)
- Every controller endpoint — happy path and common error paths
- Database round-trips against a real test PostgreSQL instance (separate DB)
- Middleware, interceptors, exception filters applied to real HTTP calls
- Multi-tenant isolation: requests with wrong `accountId` should return 403/404
- Auth flows: sign-in returns token, protected routes reject missing/invalid tokens
- Queue enqueueing (assert jobs were enqueued; don't necessarily run the worker)

### E2E (Playwright)
- Critical user journeys only — sign in, key CRUD flows, navigation
- Runs against a fully booted dev/staging environment with seeded data
- Cross-browser: Chromium (required), Firefox and WebKit (nice-to-have, CI gating optional)
- Accessibility smoke checks (Playwright's `getByRole` forces accessible markup)

---

## 4. Coverage Targets

| Layer       | Target  | Minimum gate (CI blocks merge below) |
|-------------|---------|--------------------------------------|
| Unit        | 80%     | 70%                                  |
| Integration | Key paths covered (not % based) | All `POST`, `GET`, `PATCH`, `DELETE` on each resource |
| E2E         | Happy path per module | Sign-in + one core flow per module |

Coverage is measured with Jest's built-in `--coverage` flag (Istanbul). Reports are written to `/coverage/` and uploaded as CI artifacts.

---

## 5. Running Tests Locally

### Prerequisites
```bash
# Copy environment
cp apps/api/.env.example apps/api/.env.test

# Ensure test DB is running (separate from dev DB)
docker-compose -f docker-compose.test.yml up -d postgres-test redis-test

# Push schema to test DB
DATABASE_URL=<test-db-url> pnpm prisma db push --force-reset
```

### Commands (from repo root)
```bash
# All unit + integration tests
pnpm test

# Watch mode (during development)
pnpm test:watch

# Coverage report
pnpm test:cov

# Single package
pnpm --filter @crm/api test

# E2E (requires running app)
pnpm --filter @crm/web e2e

# E2E headed (debug)
pnpm --filter @crm/web e2e:debug
```

### Turborepo pipeline (turbo.json)
```json
{
  "pipeline": {
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "e2e": {
      "dependsOn": ["build"],
      "cache": false
    }
  }
}
```

---

## 6. CI Configuration

### GitHub Actions (example)
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: crm_test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-retries 5
      redis:
        image: redis:7-alpine
        options: --health-cmd "redis-cli ping" --health-interval 5s

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test:cov
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/crm_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: ci-test-secret-not-real
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium
      - run: pnpm --filter @crm/web e2e
        env:
          BASE_URL: http://localhost:3000
          # ... other vars
```

---

## 7. Jest Configuration

### API (NestJS) — `apps/api/jest.config.ts`
```typescript
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.module.ts', '!**/main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@crm/(.*)$': '<rootDir>/../../packages/$1/src',
  },
};

export default config;
```

### Separation of unit vs integration
- Unit tests: `*.spec.ts` — Prisma mocked with `jest-mock-extended`
- Integration tests: `*.integration-spec.ts` — use real DB via `@nestjs/testing` + Supertest

Run them separately:
```bash
# Unit only
jest --testPathPattern="\.spec\.ts$" --testPathIgnorePatterns="integration"

# Integration only  
jest --testPathPattern="integration-spec"
```

---

## 8. Playwright Configuration

### `apps/web/playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Optional — gate separately
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: process.env.CI ? undefined : {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
```

### Page Object Model pattern
All Playwright tests use POM classes under `e2e/pages/`. Never inline selectors in test bodies.

```typescript
// e2e/pages/contacts.page.ts
export class ContactsPage {
  constructor(private page: Page) {}

  async goto() { await this.page.goto('/contacts'); }
  async search(query: string) {
    await this.page.getByPlaceholder('Search contacts').fill(query);
  }
  // ...
}
```

---

## 9. Supertest Patterns

### Base integration test setup
```typescript
// test/helpers/app.helper.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';

export async function createTestApp(module: any): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule(module).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.init();
  return app;
}

export { request };
```

### Authenticated request helper
```typescript
export async function getAuthToken(app: INestApplication, creds: {
  email: string; password: string;
}): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/signin')
    .send(creds)
    .expect(200);
  return res.body.token;
}
```

---

## 10. Multi-Tenancy Testing Approach

### Core principle
**Tenant isolation must be verified in every integration test that reads or writes data.**

### Fixture accounts
Two fixture tenant accounts are seeded before integration/E2E tests run:

| Account      | Purpose                          |
|--------------|----------------------------------|
| `account-A`  | Primary test tenant              |
| `account-B`  | Isolation probe tenant           |

Fixtures live in `test/fixtures/tenants.ts` and are seeded via a `beforeAll` block that runs Prisma's `createMany` in the test DB.

### Isolation test pattern
Every resource test includes at minimum:

```typescript
it('should not return account-B data to account-A user', async () => {
  // Seed a contact under account-B
  await prisma.contact.create({ data: { ...contactData, accountId: accountB.id } });

  // Request as account-A user
  const res = await request(app.getHttpServer())
    .get('/contacts')
    .set('Authorization', `Bearer ${tokenA}`)
    .expect(200);

  const ids = res.body.data.map((c: any) => c.id);
  expect(ids).not.toContain(contactFromB.id);
});
```

### Service-level isolation
Unit tests verify that service methods always scope queries by `accountId`:

```typescript
it('findAll should always filter by accountId', async () => {
  await service.findAll({ accountId: 'account-A' });
  expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: expect.objectContaining({ accountId: 'account-A' }) })
  );
});
```

---

## 11. Secrets & Environment in Tests

### Rules
1. **Never commit real secrets.** Tests use fake/stub values only.
2. `.env.test` is committed (it's safe — test values only). Real `.env` is gitignored.
3. CI injects real-ish values (strong random secrets) via GitHub Actions secrets.
4. Tests that need an API key get it from `process.env.X` with a clear error if missing.

### `.env.test` (committed, safe values)
```env
DATABASE_URL=postgresql://postgres:test@localhost:5432/crm_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-jwt-secret-do-not-use-in-prod
BETTER_AUTH_SECRET=test-auth-secret-do-not-use-in-prod
NODE_ENV=test
```

### Env validation in tests
If a test requires an env var, assert it at the top of the describe block:
```typescript
beforeAll(() => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET missing in test env');
});
```

---

## 12. Test Data Lifecycle

- **Unit tests:** All data is mocked — no DB involved.
- **Integration tests:** DB is reset between test suites using `prisma.$transaction` rollback or `beforeEach` truncation.
- **E2E tests:** A dedicated seed script (`pnpm db:seed:e2e`) populates known data before the suite; the suite should not depend on test execution order.

### Cleanup pattern (integration)
```typescript
afterEach(async () => {
  await prisma.contact.deleteMany({ where: { accountId: { in: [accountA.id, accountB.id] } } });
});
```

---

*Last updated: 2026-02-27 | Owner: QA Agent*
