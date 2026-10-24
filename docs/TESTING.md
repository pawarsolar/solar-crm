# Testing Strategy & Acceptance Matrix - Solar EPC CRM

**Status: PARTIALLY IMPLEMENTED.** Three Jest unit suites (30 tests, all passing) cover the highest-risk
security logic. The HTTP smoke tests below were re-confirmed against a live instance on 2026-10-20.
RLS isolation, e2e impersonation, and the deletion-approval integration test still need an applied
schema (see §2). See [`AUDIT.md`](./AUDIT.md) §7 for the fix order and `MEMORY.md` for completion %.

Run the suite:

```bash
npm --workspace=apps/api test          # 30 passing (jest, rootDir apps/api/src, .spec.ts)
npm --workspace=apps/api test:cov      # coverage
```

## 1. Test Matrix

| Area | Scope | Test Type | Runner | Success Criteria | Status |
|---|---|---|---|---|---|
| Auth & RBAC | Feature gate resolution order (`user → role → org`) | Unit | Jest | Override wins; role default used when no override | **DONE** — `common/guards/feature.guard.spec.ts` |
| Auth & RBAC | Fail-closed policy when DB is unreachable | Unit | Jest | Baseline stays open; non-baseline denied | **DONE** — same file |
| Auth & RBAC | `super_admin` bypass; impersonation does not bypass | Unit | Jest | Admin passes; impersonated non-admin still 403 | **DONE** — same file |
| Auth negatives | Demo-token backdoor gating | Unit | Jest | Rejected unless `ENABLE_DEMO_AUTH=true` **and** `NODE_ENV!=production`; unknown role rejected | **DONE** — `common/guards/jwt-auth.guard.spec.ts` |
| Auth negatives | Deactivated profile rejection | Unit | Jest | `is_active:false` → 401 | **DONE** — same file |
| Impersonation | `_impersonatedBy` marker surfacing | Unit | Jest | `request.user.impersonator` populated / null | **DONE** — same file |
| Leads | Ownership scoping (`assertVisible`) | Unit | Jest | Owner/creator/teammate allowed; admins all; telecalling grant all-pool; cross-org → 404 | **DONE** — `modules/leads/leads.service.spec.ts` |
| Leads | `visibilityFilter` query building | Unit | Jest | `null` for admins/telecalling; `owner_id.eq` OR `created_by.eq` (+`team_id`) otherwise | **DONE** — same file |
| Auth & RBAC | Login throttle | Smoke | pwsh/REST | 11th rapid `POST /auth/login` → 429 | **WRITTEN (config)** — `@Throttle({limit:10,ttl:60000})`; needs a fast DB path to automate |
| Uploads / DTOs | Import size + extension allow-list | Smoke | pwsh/REST | `.txt`/non-spreadsheet rejected; >10 MB rejected | **DONE (smoke)** |
| Uploads / DTOs | Survey + deletion-request validation | Smoke | pwsh/REST | Missing/invalid fields → 400 with field messages | **DONE (smoke)** |
| Auth | Sample-template downloads require auth | Smoke | pwsh/REST | Unauth → 401; with bearer → 200 | **DONE (smoke)** |
| RLS isolation | Cross-org / cross-owner reads | Integration (pg) | Jest | Org A cannot read org B; INSERT/UPDATE `WITH CHECK` enforced | **BLOCKED** — no applied schema (see §2) |
| Deletions | Two-phase approval workflow | Integration | Jest | Request opens; admin approval sets `deleted_at`, row retained | **BLOCKED** — needs live DB |
| Impersonation | `impersonate` → real session → `switch-back` | E2E | Supertest | Non-super-admin 403; bad uuid 400; switch-back outside a child session 400 | **PARTIAL (smoke)** |
| Bulk Import | Formula injection, category splitting | Integration | Jest | Formulas stripped; rows partitioned per split rules | **NOT WRITTEN** |
| Quotation | Blended GST (8.9%) & PM Surya Ghar slabs | Unit | Jest | 1-2 kW: 30k/kW; 3 kW: 78k; 4 kW+: capped 78k | **NOT WRITTEN** |
| Offline PWA | IndexedDB sync on reconnect | Component | Vitest | Queued offline lead flushes on `online` | **NOT WRITTEN** |
| Responsive | Viewport layout | Visual | Playwright | Pass at 360 / 768 / 1280 px | **NOT WRITTEN** |

## 2. Blockers before the remaining tests can pass
1. Test DB: no `supabase/config.toml`, and the configured cloud project (`xkbititevicweaadwcio`) has **no schema applied** — RLS isolation and deletion-approval tests cannot run.
2. A CI workflow (`.github/workflows`) is still absent; the suite currently runs only locally.

## 3. Commands
```bash
npm --workspace=apps/api test          # backend unit (wired, 30 passing)
npm --workspace=apps/api test:cov      # backend coverage
npm --workspace=apps/api test:e2e      # e2e API suite (config present, no specs yet)
npm --workspace=apps/web run test      # frontend component tests (not wired)
```
