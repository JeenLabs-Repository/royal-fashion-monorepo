---
last_mapped_commit: fe47bdb2ba2acfe064c13870f8c614217f805928
last_mapped_at: 2026-10-08
---
# Testing Patterns

**Analysis Date:** 2026-10-08

## Test Framework

**Runner:**
- Jest `^29.7.0` (`apps/backend/package.json`)
- Transform: `@swc/jest` with TypeScript + decorators (`apps/backend/jest.config.js`)
- Config: `apps/backend/jest.config.js`
- Env loader: `loadEnv("test", process.cwd())` from `@medusajs/utils` at config load time
- Setup: `apps/backend/integration-tests/setup.js` (clears MikroORM `MetadataStorage`)

**Assertion Library:**
- Jest built-in `expect` / `describe` / `it` (via `@types/jest`)

**Medusa test helpers (installed, not yet used in-repo):**
- `@medusajs/test-utils` `2.21.2`
- `medusaIntegrationTestRunner` — full app HTTP/integration suites (`apps/backend/node_modules/@medusajs/test-utils/dist/medusa-test-runner.d.ts`)
- `moduleIntegrationTestRunner` — isolated module service suites (`.../module-test-runner.d.ts`)
- Also exports: `TestDatabaseUtils`, `JestUtils`, `MockEventBusService`, `init-modules` helpers

**Run Commands:**

```bash

# From repo root — Turbo `test` task (packages that define `test`)

pnpm run test

# Backend unit tests (TEST_TYPE=unit)

cd apps/backend && pnpm run test:unit

# Backend HTTP integration tests

cd apps/backend && pnpm run test:integration:http

# Backend module integration tests

cd apps/backend && pnpm run test:integration:modules

# Single file / name filter (keep TEST_TYPE via the script)

cd apps/backend && pnpm run test:unit -- src/modules/foo/__tests__/service.unit.spec.ts
cd apps/backend && pnpm run test:unit -- -t "returns the cart"
```

**Notes:**
- Scripts set `NODE_OPTIONS=--experimental-vm-modules`, `--runInBand`, `--forceExit`
- Unit script uses `--silent`; integration scripts use `--silent=false`
- Storefront (`apps/storefront/package.json`) has **no `test` script** and no Jest/Vitest/Playwright config in-app
- Integration and unit suites need a reachable PostgreSQL when using Medusa runners

## Test File Organization

**Location:**
- **Unit:** co-located under source as `**/src/**/__tests__/**/*.unit.spec.[jt]s`
- **Module integration:** `**/src/modules/*/__tests__/**/*.[jt]s`
- **HTTP integration:** `apps/backend/integration-tests/http/*.spec.[jt]s`
- Jest selects the suite exclusively via `process.env.TEST_TYPE` in `apps/backend/jest.config.js`

**Naming:**
- Unit files: `*.unit.spec.ts` (required by unit `testMatch`)
- HTTP files: `*.spec.ts` under `integration-tests/http/`
- Module integration: any `*.ts`/`*.js` under that module’s `__tests__/` folder

**Structure:**

```text
apps/backend/
├── jest.config.js
├── integration-tests/
│   ├── setup.js                 # always loaded via setupFiles
│   └── http/
│       └── <feature>.spec.ts    # TEST_TYPE=integration:http (none present yet)
└── src/
    ├── modules/<name>/
    │   └── __tests__/
    │       └── *.ts             # TEST_TYPE=integration:modules (none present yet)
    └── **/__tests__/
        └── *.unit.spec.ts       # TEST_TYPE=unit (none present yet)
```

**Current state:** Only `apps/backend/integration-tests/setup.js` exists. **No `*.spec.ts` / `*.unit.spec.ts` suites are checked in.** Scaffold new tests into the paths above so Jest `testMatch` picks them up.

## Test Structure

**Suite Organization:**

HTTP integration (prescribed pattern using `@medusajs/test-utils`):

```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer, utils }) => {
    describe("GET /store/custom", () => {
      it("returns 200", async () => {
        const response = await api.get("/store/custom")
        expect(response.status).toEqual(200)
      })
    })
  },
})
```

Module integration:

```typescript
import { moduleIntegrationTestRunner } from "@medusajs/test-utils"

moduleIntegrationTestRunner({
  moduleName: "blog",
  resolve: "./src/modules/blog",
  testSuite: ({ service }) => {
    describe("BlogModuleService", () => {
      it("lists posts", async () => {
        const posts = await service.listPosts()
        expect(Array.isArray(posts)).toBe(true)
      })
    })
  },
})
```

Unit (plain Jest against pure helpers — fits search helpers under `apps/backend/src/search/helpers/`):

```typescript
import { toOptionValues } from "../../helpers/option-values"

describe("toOptionValues", () => {
  it("maps option rows to facet strings", () => {
    expect(toOptionValues([])).toEqual([])
  })
})
```

**Patterns:**
- Setup: global `setupFiles` → `integration-tests/setup.js` clears `MetadataStorage` before suites
- Teardown: Medusa runners own DB create/teardown via `dbUtils` on `MedusaSuiteOptions`; prefer runner lifecycle over manual DB drops
- Assertion: Jest `expect`; for HTTP, assert `status` and body shape; for workflows, use `utils.waitWorkflowExecutions()` when async workflow side effects matter
- Always run with the matching `TEST_TYPE` script so `testMatch` includes your files

## Mocking

**Framework:**
- Jest mocks (`jest.mock`, `jest.fn`) for unit tests
- `MockEventBusService` from `@medusajs/test-utils` for event-bus isolation in module/app tests

**Patterns:**

```typescript
import { MockEventBusService } from "@medusajs/test-utils"

// Prefer injecting Medusa test doubles via moduleIntegrationTestRunner
// `injectedDependencies` rather than mocking framework internals ad hoc.
```

**What to Mock:**
- External side effects in unit tests (HTTP, third-party SDKs)
- Event bus when testing modules that emit events (`MockEventBusService`)
- Container registrations only through runner `injectedDependencies` / hooks when required

**What NOT to Mock:**
- Real PostgreSQL for `integration:http` and `integration:modules` — these runners expect a live DB
- Core Medusa module wiring in HTTP tests — use `medusaIntegrationTestRunner` so routes/workflows resolve normally
- Do not mock away Zod validation you intend to assert (422 / invalid body cases)

## Fixtures and Factories

**Test Data:**
- No dedicated `fixtures/` or factory package in this repo yet
- Prefer creating entities through Medusa workflows/API in HTTP tests (mirrors production paths used in `apps/backend/src/migration-scripts/initial-data-seed.ts` and `apps/backend/src/scripts/seed-demo-products.ts`)
- For deterministic demo data patterns, reuse the seed script’s approach (deterministic handles / PRNG) only when seeding a test DB — do not import production seed side effects into unit tests lightly

**Location:**
- Colocate small fixtures next to the suite under `__tests__/` or `integration-tests/http/`
- Shared helpers can live under `apps/backend/integration-tests/` once suites exist

## Coverage

**Requirements:** None enforced — no `coverageThreshold`, no coverage script in `apps/backend/package.json` / root `package.json`, Jest config has no `collectCoverage*` settings

**View Coverage:**

```bash
cd apps/backend && TEST_TYPE=unit NODE_OPTIONS=--experimental-vm-modules npx jest --coverage --runInBand --forceExit
```

(Use the same `TEST_TYPE` you intend to measure; default config does not collect coverage.)

**Storefront:** `apps/storefront/tsconfig.json` excludes `coverage` / `jest-coverage` directories, but no coverage tooling is configured.

## Test Types

**Unit Tests:**
- Scope: pure functions and isolated logic (`apps/backend/src/search/helpers/*`, future workflow step pure transforms)
- Approach: Jest + `@swc/jest`, file name `*.unit.spec.ts` under `__tests__/`
- Command: `pnpm run test:unit` from `apps/backend`

**Integration Tests:**
- **HTTP:** exercise store/admin routes with `medusaIntegrationTestRunner` + `api` client; files in `apps/backend/integration-tests/http/`
- **Modules:** exercise custom module services with `moduleIntegrationTestRunner`; files in `apps/backend/src/modules/<name>/__tests__/`
- Commands: `pnpm run test:integration:http` / `pnpm run test:integration:modules`

**E2E Tests:**
- Not used in this monorepo (no Playwright/Cypress config under `apps/`)
- Storefront has no automated UI test suite — manual / future addition only

## Common Patterns

**Async Testing:**

```typescript
it("creates a cart via API", async () => {
  const response = await api.post("/store/carts", { region_id: regionId })
  expect(response.status).toEqual(200)
  expect(response.data.cart.id).toBeDefined()
})
```

**Waiting on workflows:**

```typescript
it("finishes workflow side effects", async () => {
  await api.post("/store/carts", { /* ... */ })
  await utils.waitWorkflowExecutions()
  // assert DB / subsequent GET
})
```

**Error Testing:**

```typescript
it("rejects missing publishable key behavior at the edge", async () => {
  // Prefer asserting HTTP status/body from `api` rather than catching thrown Errors
  const response = await api.get("/store/products").catch((e) => e.response)
  expect(response.status).toBeGreaterThanOrEqual(400)
})
```

For unit helpers that throw `MedusaError`:

```typescript
import { MedusaError } from "@medusajs/framework/utils"

it("throws NOT_FOUND when prerequisite missing", async () => {
  await expect(runSeedWithoutChannel()).rejects.toThrow(MedusaError)
})
```

**Adding tests checklist:**
1. Pick suite type → place file in the matching glob from `apps/backend/jest.config.js`
2. Use `@medusajs/test-utils` runners for anything touching DB/modules/HTTP
3. Run the corresponding `pnpm run test:*` script (do not rely on bare `jest` without `TEST_TYPE`)
4. Keep storefront untested until a runner is intentionally added — do not assume Turbo `test` covers Next.js

---

*Testing analysis: 2026-10-08*
