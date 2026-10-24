# Memory — Solar EPC CRM

## Goal / Stack
- **Goal:** Production-grade, mobile-first PWA and lean API for Solar EPC businesses (Super Admin, Sales Admin, Telecaller, Sales Exec, Surveyor, Accounts) managing pipeline, site surveys, PM Surya Ghar compliant quotations, payment milestones, and role-governed KPIs.
- **Stack:**
  - **Backend:** NestJS 10 (TypeScript, class-validator, helmet, compression, rate-limiting, exceljs streaming, pdfmake, plain parameterized SQL via pg/Supabase service client, memory bounded to <256MB).
  - **Database & Auth:** Supabase PostgreSQL with Row Level Security (RLS), Supabase Auth, Storage (signed URLs).
  - **Frontend:** React 18 + Vite PWA (TypeScript, Tailwind CSS, TanStack Query, React Hook Form + Zod, Recharts, IDB-Keyval offline queue, Workbox).

## Decisions
| Date | Decision | Why |
|---|---|---|
| 2026-10-20 | PDF via `pdfmake` instead of Puppeteer | Headless Chromium consumes 300MB+ RAM; pdfmake runs in-memory stream under 15MB. |
| 2026-10-20 | ExcelJS streaming mode for CSV/Excel | Prevents memory spikes when importing or exporting up to 10k rows. |
| 2026-10-20 | Offline-first sync with IndexedDB | Telecallers and field surveyors work with unreliable 4G connectivity; mutations queue locally. |
| 2026-10-20 | 3-tier Feature Flag resolution | `user override → role default → org default` enforced in NestJS guard, Postgres RLS, and frontend UI. |
| 2026-10-20 | Two-step lead deletion approval | Sales roles submit `deletion_requests`; only admins approve soft-delete (`deleted_at`). Hard delete restricted to `super_admin`. |
| 2026-10-20 | Demo auth behind `ENABLE_DEMO_AUTH` + `NODE_ENV!=production` | Keeps the offline demo usable without shipping a production authentication backdoor. |
| 2026-10-20 | `telecalling` modelled as a grantable feature flag | Lets the Super Admin authorise e.g. a `sales_exec` to work the call pool without granting the whole role. |
| 2026-10-20 | Child login = real Supabase session + `_impersonatedBy` in `app_metadata` | RLS and audit trails behave exactly as the impersonated user; return path is server-minted, not client-trusted. |
| 2026-10-20 | Tenant isolation is enforced at the DB, not only in app code | The API's connection is privileged (service role / table owner), so RLS alone was inert. Added `set_tenant_context()` + `FORCE ROW LEVEL SECURITY`, and every raw-SQL read goes through `withTenant()`. |
| 2026-10-20 | `tax_subsidy_config` / `lead_stage_history` / `lead_activities` scoped specially | They have no `org_id` column; the first two are reference/append-only tables, the latter two join through their parent lead via `lead_in_tenant()`. |

## Status
- **Verified 2026-10-20 (repo audit, remediation pass, and runtime smoke tests):** plan ≈ 75% complete.
  - ✅ **Builds:** `npm run build:api` ✅ (`nest build` clean), `npm run build:web` ✅ (`tsc` + `vite build`; SW precaches 28 entries).
  - ✅ **Runtime (smoke-tested on a fresh instance):** all routes mapped; `SupabaseService` is now a single global singleton (was 10+ instances); per-role feature sets resolve correctly (`super_admin` all true, `accounts` payments/export on + leads/quotation off, `installer` installation on, `telecaller` telecalling on); `impersonate` returns 403 for non-super-admin and 400 for a bad `user_id`; `switch-back` returns 400 outside a child session; non-demo emails are rejected.
  - ✅ **Security backdoors closed:** `demo-token-*` and the password-ignoring login branch are gated behind `ENABLE_DEMO_AUTH` (never active when `NODE_ENV=production`); non-demo credentials now go through real Supabase Auth. `FeatureGuard` no longer leaks across orgs and fails closed for non-baseline features.
  - ✅ **DB-only services:** `leads.service`/`users.service` no longer keep in-memory shadow stores. Real `23505`→409, real `deletion_requests` + `deleted_at` soft delete, `lead_stage_history` written on every stage change/followup/assignment, no hard `profiles.delete()` (deactivation instead), Supabase Admin API provisioning with invite.
  - ✅ **Child login (impersonation):** `POST /auth/impersonate` + `POST /auth/switch-back`, `_impersonatedBy` surfaced on every request, highlighted **"Back to Super Admin"** banner in `AppLayout` and the sidebar, admin Users tab Ctrl + per-user feature-override drawer.
  - ✅ **Feature Access Control:** `GET /features/matrix` (roles × features + per-user overrides), `PUT /features/grants`, `POST /features/grants/bulk`; Admin UI saves a whole edited matrix at once. New `telecalling` flag joins the registry (15 keys × 7 roles).
  - ✅ **RLS + schema:** migration now defines policies for 17 tenant tables (previously 18 of 20 had **zero** policies = deny-all), `service_tickets` table, safer `security definer` `get_auth_org_id()`/`get_auth_role()` with a `profiles` fallback, `feature_grants.updated_at/updated_by`.
  - 🔴 **Backend data layer still NOT applied to the configured project:** `xkbititevicweaadwcio` has no tables and the pooler URL fails, so DB-backed endpoints return errors/empties. Migration + seed must be run against a real project (or a local instance) before anything data-backed can be verified. `node scripts/check-rls-columns.mjs` statically validates the migration (currently PASS) in the meantime.
  - 🔴 **Full per-role feature/settings matrix, security findings and fix order: `docs/AUDIT.md`** (2026-10-20 deep audit).
  - ✅ **Unit tests:** `npm --workspace=apps/api test` ✅ — **40/40 passing** across 6 suites (`feature.guard.spec.ts`, `jwt-auth.guard.spec.ts`, `leads.service.spec.ts`, `supabase.service.spec.ts` tenant-session contract, `installations.service.spec.ts` cross-org 404, `feature-registry.spec.ts` governance invariant). HTTP smoke tests re-confirmed: sample template 401 unauth / 200 with token; survey + deletion-request DTO validation 400 with field messages.
  - ✅ **Tenant isolation (defence-in-depth):** `FORCE ROW LEVEL SECURITY` on all 20 tenant tables, `set_tenant_context(org, role)` + `SupabaseService.withTenant()` so the privileged pg Pool is held to the same policies as PostgREST, `tenant_org_matches()`/`lead_in_tenant()` helpers, and a seed-only `app.bypass_rls` escape hatch. **Fixed a migration-breaking bug:** `lead_stage_history`, `lead_activities` and `tax_subsidy_config` were given `org_id` policies but have no `org_id` column (the migration would have failed); they are now scoped through their parent lead / as a reference table.
  - ✅ **Feature flags now all wired:** added `installations`, `service-tickets`, `subsidy`, `whatsapp` and `GET /reports/summary` modules so `installation`, `service_tickets`, `subsidy`, `whatsapp`, `reports` are actually enforced (previously the admin matrix toggled 5 flags that gated nothing). `scripts/check-feature-coverage.mjs` + a Jest invariant keep this honest.
  - ✅ **Route-mapping gaps closed:** `DELETE /leads/:id` and `POST /leads/:id/approve-delete` now carry `@RequireFeature('leads')`; direct lead delete restricted to `super_admin` (sales must use the request→approve flow); deletion-request creation restricted to sales-side roles.
  - ✅ **S13/S18/S22 closed:** import preview capped at 10 MB and restricted to `.xlsx/.xls/.csv`; sample-template downloads now require `JwtAuthGuard`; `POST /auth/login` throttled to 10/min.
  - ✅ **PWA icons are real** — `scripts/generate-icons.mjs` emits 192 px (3.1 KB), 512 px maskable (9.2 KB) and 180 px apple-touch (2.9 KB) PNGs (were 70-byte 1×1 px).
  - ⚠️ **Still open:** `installer`/`accounts` dashboards & settings surfaces; documents UI; survey form UI; CI workflow.

## Next 3 steps
1. **Apply the schema + seed** to a real Supabase project (or add `supabase/config.toml` and run a local stack). The migration now passes `scripts/check-rls-columns.mjs`; then execute the per-role grant matrix in `docs/AUDIT.md` §4b/§4c and add live RLS-isolation ITs.
2. **Build the new UI surfaces** for the modules just added (`installations`, `service-tickets`, `subsidy`, `whatsapp`) plus role dashboards for `installer`/`accounts`, the documents page, and the survey form.
3. **Add CI** (`.github/workflows`): `build:api`, `build:web`, `test`, `check-rls-columns.mjs`, `check-feature-coverage.mjs`.

## Known issues
- Subsidies are subject to MNRE updates; editable in `tax_subsidy_config` table.
- DB-backed endpoints cannot be end-to-end verified until the migration/seed are applied to an accessible project.
- `FeatureGuard` falls back to baseline (`leads`, `kpi_dashboard`) when the database is unreachable, so offline the guard cannot enforce non-baseline revocations.
- `docs/API.md` still documents an unimplemented `GET /dashboard/funnel`.

## Open questions
- Direct DISCOM net-metering portal integration per state (MSEDCL, BESCOM, UPPCL).
