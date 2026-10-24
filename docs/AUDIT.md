# Full Code Audit - Solar EPC CRM
Date: 2026-10-20 | Auditor: automated deep code audit (read-only, no code changed by this audit)
Scope: `apps/api` (NestJS), `apps/web` (React PWA), `supabase/migrations` + `seed.sql`, `docs/*`, live runtime smoke test on `:3000`, live REST probe of the configured Supabase project.

> **Headline:** the app *builds and boots*, but it is running as a **demo, not a CRM**. The backends that do "work" (leads, users) do so from **hardcoded in-memory arrays**, and matching data is **deleted from the real DB by the same services**. The database schema was never applied to the configured Supabase project, and the auth layer accepts any password for the seeded emails plus a never-expiring `demo-token-<role>`.

---

## 1. Severity summary

| # | Finding | Severity | Evidence |
|---|---|---|---|
| S1 | In-memory shadow store in `leads` + `users` services: fabricated leads/users returned as real data; writes `splice()` records out of memory and **hard-delete `profiles` rows** in the DB | **Critical** | `leads.service.ts` L13-107, L229-257; `users.service.ts` L11-21, L128-140 |
| S2 | `POST /auth/login` ignores the password for the 7 seeded emails (verified live: wrong password -> 200 + `super_admin` token) | **Critical** | `auth.service.ts` L11-50 |
| S3 | `Bearer demo-token-<role>` accepted by `JwtAuthGuard` for **every role incl. super_admin**, format is guessable, never expires, works in any `NODE_ENV` | **Critical** | `jwt-auth.guard.ts` L24-35 |
| S4 | Client role switcher ("Active Role" dropdown in the sidebar) mints a new demo token for any role in one click | **Critical** | `Sidebar.tsx` L77-98, `AuthContext.tsx` L64-76 |
| S5 | Real DB path is worse: any authenticated user is implied to be admins, because RLS "admin" checks read `org_id`/`role` from **client-controllable JWT app_metadata**; `leads_insert_policy` only checks `org_id` | **High** | migration L352-391 |
| S6 | `FeatureGuard` fails **open**: any grant-lookup error returns `true` -> all features enabled | **High** | `feature.guard.ts` L82-84 |
| S7 | RLS **enabled** on all 20 tables but policies exist for only 2 (`leads`, `audit_log`) -> effectively deny-all for direct/anon access; no isolation for the other 18 | **High** | migration L330-397 (6 `create policy` statements total) |
| S8 | `updateStage` / `logFollowup` no longer write `lead_stage_history`, and `assign` no longer writes `owner_id` / activity rows | **High** | `leads.service.ts` L173-239 |
| S9 | `check-then-act` duplicate-phone guard: no unique-violation (`23505`) mapping anywhere; a real duplicate insert surfaces as HTTP 500 | **High** | `leads.service.ts` L139-145 (memory check only) |
| S10 | `AuditInterceptor` writes the **raw request body** to `audit_log.meta` (customer name/phone/email/notes, payments) and uses `ip inet` -> `'::1'` fails, so audit rows may silently not be written at all | **High** | `audit.interceptor.ts` L36-49; migration L282 |
| S11 | Excel export leaks the **full org dataset to every user who holds the `export_excel` flag** (no role/ownership scope), opens with `window.open` (no `Authorization` header) -> button 401s; PDF export equal | **High** | `exports.service.ts` L24-45; `DashboardPage.tsx` L52-57 |
| S12 | Hard delete of `profiles` (`DELETE /users/:id`) with no soft-delete/`is_active` path; `auth.users` row is orphaned; also deletes team/survey/quotation/payment/installation links via FK `on delete set null` | **High** | `users.service.ts` L128-140 |
| S13 | No upload limits/type allow-list on `FileInterceptor('file')` (spec: <=10 MB, `.xlsx/.csv` only) -> whole file buffered in RAM | **Medium** | `import.controller.ts` L27-31 |
| S14 | `POST /surveys` and `POST /deletion-requests` accept `@Body() body: any` / inline types -> `ValidationPipe` cannot sanitize; deletion `entity` not restricted to the caller's records | **Medium** | `surveys.controller.ts` L13-20; `deletion-requests.controller.ts` L11-20 |
| S15 | Payment/survey/quote stage transitions are unvalidated relative to the 17-stage pipeline, never log history, and are not idempotent | **Medium** | `payments.service.ts` L40-48; `surveys.service.ts` L50-56; `quotations.service.ts` L100-105 |
| S16 | Quote "sequential" number is `Math.random()` (collisions -> `number unique` -> 500); GST/subsidy duplicated as hardcoded constants instead of `tax_subsidy_config`; `price_book` never queried | **Medium** | `quotations.service.ts` L37-59 |
| S17 | No ownership/assignment check on single-lead endpoints: any `leads`-enabled user can read/update/reassign any lead in the org | **Medium** | `leads.service.ts` L109-190; `leads.controller.ts` |
| S18 | Unauthenticated sample template endpoints (`GET /leads/import/sample-xlsx`, `sample-csv`) | **Low** | `import.controller.ts` L50-64 |
| S19 | `features: {}` for real (non-demo) logins and no refresh path -> non-super_admin staff see an almost empty UI; `GET /features` matrix is readable by every role | **Medium** | `auth.service.ts` L90-100; `features.controller.ts` L13-17 |
| S20 | Role/UI gaps: `installer` + `accounts` roles exist in DB/DTO but **nowhere in the app**; no role-based client routing, no dedicated role dashboards | **Medium** | grep `@Roles(`; `routes.tsx`; `Sidebar.tsx` |
| S21 | All 4 PWA raster icons are 70-byte 1x1 PNGs; install/splash broken | **Medium** | `apps/web/public/*.png` |
| S22 | No redaction of PII in logs; `AllExceptionsFilter` leaks driver messages when `NODE_ENV != production` (dev servers do); login has no `@Throttle` override (only global 100/min) | **Medium** | `all-exceptions.filter.ts` L40-47; `app.module.ts` L20-25; `auth.controller.ts` |
| S23 | Zero tests, no CI, no `hooks/` for auto stage-history/`updated_at`, no `supabase/config.toml`; spec migration defines **no `users` table** yet the UI exposes one and there is no `/users` health check that matches it | **Medium** | repo-wide |
| S24 | Docs overstate the implementation (`SECURITY.md` 14/14 pass, `SEED.md` promises 30 surveys/15 installation milestones, `API.md` documents `GET /dashboard/funnel` which does not exist) | **Medium** | `docs/*` vs code |

---

## 2. Runtime / live verification (performed this audit)

- `npm install` ok (1133 pkgs after clearing a stale workspace symlink), `npm run build:api` ok, `npm run build:web` ok (two TS blockers fixed earlier this session: `&gt;` in JSX, missing `vite-env.d.ts`).
- API on `:3000` maps 24 routes; unauthenticated `GET /api/leads` -> 401.
- `POST /api/auth/login` `{email: admin@kyrossolar.com, password: totally-wrong-password}` -> **200**, `token: demo-token-super_admin`, `features: {}`.
- `GET /api/features` with that token -> `{"features":[],"grants":[]}`; `GET /api/dashboard/summary` -> all-zero KPIs; `GET /api/leads` -> `total: 0`.
- `GET /api/exports/pipeline.xlsx` without header -> 401, with demo token -> 200 (6.4 KB).
- Supabase project `xkbititevicweaadwcio`: REST responds (`apikey` valid) but `public.features` is missing (`PGRST205`); the pooler connection string fails (`tenant/user ... not found`). **Schema and seed were never applied to any database.**

---

## 3. Feature gaps vs. the original spec

| Spec area | Status | Notes |
|---|---|---|
| Leads CRUD + 17-stage pipeline | **Demo-grade** | CRUD/stage/search run off `memoryLeads`; UI stage chips expose only 10 of 18 stages (`LeadDetailPage` has 18 incl. `LOST`); no stage-transition rules |
| Bulk import (Excel/CSV, splitting, dedupe, formula sanitization) | **Partial** | Sanitization + commit exist and hit the DB, but the UI sends `splits: []`; single "target rep" only; no round-robin/percent split; dedupe only via DB unique error surfacing as 500 |
| Follow-ups / call logs | **Partial** | `POST /leads/:id/followup` + Followups UI exist now, but the handler writes only to memory + best-effort DB, is not DTO-validated, and never logs to `lead_stage_history` |
| Site survey | **Backend-only** | No survey form UI at all; survey tab is read-only; API takes `body: any`; no surveyor-assignment check; no photo upload (`documents` module absent) |
| Calculators (subsidy/GST/ROI) | **Partial** | Works client- and server-side, but all rates are duplicated constants; `price_book` and `tax_subsidy_config` are seeded but **never read**; no admin editor for either |
| Quotation + PDF | **Partial** | PDF generated in-memory (never stored, no signed URL, `pdf_path` always null); non-sequential number; no version/expiry logic; no acceptance/rejection flow |
| Payments | **Partial** | Recording works via DB; no accounts-only gate; no receipts/ledger; outstanding computed from latest quote only |
| Installation tracking | **Missing** | Table + seed exist, no API, no UI, no milestone statuses |
| Documents / storage | **Missing** | Table exists; no upload, no signed URLs, no private bucket config |
| Dashboards / KPIs | **Partial** | Summary/team work via pg; `GET /dashboard/funnel` (documented) missing; no date filters; Recharts dashboard is lazy-loaded |
| Exports / share | **Partial** | Excel/PDF endpoints work with a token; UI buttons broken (no header); share link deliberately broken (`/public/reports/:token` is an API route, not an SPA route) |
| Service tickets (AMC) | **Missing** | Flag registered, no table/API/UI (pipeline uses `AMC/SERVICE` stage as a workaround) |
| WhatsApp automation | **Missing** | Flag registered; only a `wa.me` deep link on the lead page |
| Users / teams admin | **Demo-grade** | New `users` module + Staff tab exist, but users are fabricated in memory; no `auth.users` creation; no teams CRUD; no per-user feature overrides in the UI (flag supports `scope: 'user'` server-side) |
| Testing (spec §12) | **Missing** | 0 tests of any kind, no RLS-isolation or RBAC tests |

---

## 4. Per-role feature & settings matrix

### 4a. What the code actually grants today

Sources: `supabase/seed.sql` §5 (shipped matrix), spec list in `docs/FEATURES.md` §1, and which flags any endpoint actually enforces.

| Feature key | super_admin | sales_admin | telecaller | sales_exec | surveyor | installer | accounts | Enforced where |
|---|---|---|---|---|---|---|---|---|
| `leads` | seed Y | seed Y | seed Y | seed Y | seed Y | **none** | **none** | `/leads*` (GET/POST/PATCH/DELETE, followup) |
| `bulk_import` | Y | Y | - | - | - | none | none | `/leads/import/preview|commit` |
| `export_excel` | Y | Y | - | - | - | none | none | `/exports/pipeline.xlsx` |
| `export_pdf` | Y | Y | - | - | - | none | none | `/exports/pipeline.pdf` |
| `quotation` | Y | Y | - | Y | - | none | none | `/quotations*` |
| `payments` | Y | Y | - | **Y** | - | none | **none** | `/payments*` |
| `survey` | Y | - | - | **Y** | Y | none | none | `/surveys*` |
| `installation` | Y | - | - | - | - | none | none | `/installations*` |
| `subsidy` | Y | - | - | - | - | none | none | `/subsidy/*` |
| `reports` | Y | Y | - | - | - | none | none | `/reports/summary` |
| `report_share` | Y | - | - | - | - | none | none | `/reports/share` |
| `kpi_dashboard` | Y | Y | Y | Y | - | none | none | `/dashboard/*` |
| `service_tickets` | **none** | none | none | none | none | none | none | `/service-tickets*` |
| `whatsapp` | **none** | none | none | none | none | none | none | `/whatsapp/*` |

Reading of the table:
- **Flags with zero enforcement** (`installation`, `subsidy`, `reports`, `service_tickets`, `whatsapp`): they are UI/settings toggles only. Granting or revoking them changes nothing server-side.
- **Missing seed rows** mean `JwtAuthGuard`-verified users get `resolveFeatureFlag` -> `false` for those roles (correct-ish denial) but the rows the admin matrix renders as "off" for `installer`/`accounts`/`surveyor` often correspond to flags that aren't enforced at all.
- The admin matrix UI (`AdminPage` -> Feature Permissions Matrix) can *write* any `(role, feature_key)` pair for the 7 roles, but `installer`/`accounts` do not exist anywhere else in the product, so those toggles are inert.

### 4b. Recommended target matrix (add / remove), with the reason

Legend: **Y** keep/grant, **-** keep off, **ADD** = row missing today, **DEL** = exists today but should be removed.

| Feature | super_admin | sales_admin | telecaller | sales_exec | surveyor | installer | accounts | Change action |
|---|---|---|---|---|---|---|---|---|
| `leads` | Y | Y | Y | Y | Y (read-only, own assigned) | **- (DEL from any future grant)** | **- (DEL)** | Keep as-is; add server-side scoping so surveyor/telecaller only see assigned leads |
| `bulk_import` | Y | Y | - | - | - | - | - | As-is |
| `export_excel` | Y | Y | - | - | - | - | Y | **ADD `accounts`** (finance reconciliation), keep sales_exec off |
| `export_pdf` | Y | Y | - | - | - | - | Y | **ADD `accounts`** |
| `quotation` | Y | Y | - | Y | - | - | - | As-is; add **`reports`+`report_share` should not imply quotation** |
| `payments` | Y | Y | - | **DEL (remove from sales_exec)** | - | - | **ADD `accounts`** | Remove sales_exec (sales reps must not mark money received); add accounts + keep sales_admin for overrides |
| `survey` | Y | Y | - | Y | Y | - | - | **ADD `sales_admin`** (dispatch/QA), keep sales_exec for rescheduling only |
| `installation` | Y | Y | - | - | - | **ADD `installer`** | - | Wire to a real installations API + UI, then grant installer |
| `subsidy` | Y | - | - | - | - | - | **ADD `accounts`** (view-only) | Keep as config for super_admin; accounts view-only |
| `reports` | Y | Y | - | - | - | - | **ADD `accounts`** | Finance needs P&L/pipeline value |
| `report_share` | Y | - | - | - | - | - | - | **DEL from any other role** (currently only super_admin) |
| `kpi_dashboard` | Y | Y | Y | Y | **ADD** | **ADD** | **ADD** | Grant scoped `my` dashboard to surveyor/installer/accounts |
| `service_tickets` | Y | Y | - | - | - | **ADD `installer`** | - | Currently no seed row anywhere; create table + API first |
| `whatsapp` | Y | Y | Y | Y | - | - | Y | **ADD rows for super_admin (master), sales_admin, telecaller, sales_exec, accounts (payment reminders)**; gated by an actual provider module |
| **(new) `user_admin`** | Y | - (view-only today) | - | - | - | - | - | Split "view staff" from "provision/role-change" and enforce it as a flag instead of only `@Roles` |
| **(new) `deletion_approve`** | Y | Y | - | - | - | - | - | Today implied by `@Roles('super_admin','sales_admin')` |

Per-role narrative:

- **super_admin** - all 14 flags + `user_admin` + `deletion_approve`. Remove nothing. Needs: settings surfaces for `price_book`, `tax_subsidy_config`, `features` (already), and an **audit log viewer** (no UI exists).
- **sales_admin** - add `survey`, `installation` (dispatch visibility), `service_tickets`; keep everything else. Remove nothing. Needs: team/target CRUD, import split-rule UI, deletion approvals (exists).
- **telecaller** - `leads` (assigned only) + `kpi_dashboard(my)` + **add `whatsapp`**. Remove `export_*`, `payments`, `quotation` (already off). Needs: call-log write + next-followup (exists), and a **client-side route guard** so `/quotation`, `/payments`, `/import`, `/admin` are not reachable by URL.
- **sales_exec** - **remove `payments`** (money handled by accounts/sales_admin). Keep `leads`, `quotation`, `survey`, `kpi_dashboard`. Add `whatsapp`. Needs: quotation edit/version (single create only today).
- **surveyor** - keep `leads` (read-only, assigned) + `survey`; **add `kpi_dashboard(my)`**; add a survey form UI + photo upload (`documents`); must NOT have `payments`/`quotation`/`export_*`. Today a surveyor's sidebar renders Dashboard+Leads+Follow-ups only, and the survey write path has **no UI**, so the role is unusable in practice.
- **installer** - currently **zero grants, zero UI, zero API**. Add a real installer surface first, then `installation` (CRUD milestones), `service_tickets`, `kpi_dashboard(my)`, and read-only `leads` limited to assigned installation leads. Remove nothing.
- **accounts** - currently **zero grants, zero UI, zero API**. Add `payments` (record + verify), `export_excel`, `export_pdf`, `reports`, `kpi_dashboard(my)`, `subsidy` (view). Explicitly **no** `leads` create, no `quotation` create, no `bulk_import`. Needs a dedicated payments/ledger page (today `/payments` is a sales-style form) and GST/subsidy settings visibility.

### 4c. Settings each role should see (and where it should live)

| Setting surface | super_admin | sales_admin | telecaller | sales_exec | surveyor | installer | accounts |
|---|---|---|---|---|---|---|---|
| Feature permission matrix (`/features/grants`) | manage | view | - | - | - | - | - |
| Staff & roles (`/users`, `/teams`) | manage | view | - | - | - | - | - |
| Deletion approvals | approve | approve | request | request | request | - | - |
| Price book (`price_book`) | manage | view | - | view (read-only at quote time) | - | - | view |
| Subsidy/GST config (`tax_subsidy_config`) | manage | view | - | view | - | - | view |
| Sales targets (`targets`) | manage | manage | view own | view own | - | - | view |
| Notification/WhatsApp templates | manage | manage | use | use | - | - | use |
| Audit log | view | view | - | - | - | - | - |
| Profile/preferences (own) | all | all | all | all | all | all | all |

**Gap:** none of the settings surfaces above except the feature matrix, deletion approvals and a static price-book card exist. `price_book` and `tax_subsidy_config` are seed-only; there is no `/settings` route for anyone.

---

## 5. Functional gaps (code-level)

1. **Leads** (`leads.service.ts`)
   - `findAll` / `create` / `updateStage` / `logFollowup` / `assign` / `softDelete` all read/write `memoryLeads` (module-scope, 3 fabricated Pune/Mumbai/Nashik leads) and treat the DB as an optional mirror inside silent `try/catch`.
   - IDs are `lead-${Date.now()}` (not UUIDs) so DB inserts fail silently and the record lives only in process memory.
   - `softDelete` **removes the object from the in-memory array** and never sets `deleted_at`; `requestDelete` returns a canned message and never inserts a `deletion_requests` row.
   - `logFollowup` writes `lead_activities` but never `lead_stage_history`; there is no DTO/validation (`body: {...}`).
   - `findAll` ignores `owner_id`, `cursor`, `limit` and the `view` scoping that `dashboard.service` implements via raw SQL.
2. **Users** (`users.service.ts`) - mirrored `memoryUsers` (7 fabricated profiles), `createUser` never creates `auth.users` and uses a non-UUID id, `deleteUser` **hard-deletes** `profiles` and splices memory, `findAll` returns the fabricated list whenever the DB is empty or errors.
3. **Import** - no size/type limits; commit is untyped (`body: any`); split rules ignored (`splits: []` from UI); per-row insert loop (10k rows = 10k round-trips) with no transaction/batch; `import_batches.rules` stores `{}` when the UI omits it.
4. **Surveys/payments/quotations** - stage side effects (`SURVEY_DONE`, `BOOKED`, `QUOTATION_SENT`) are unconditional, unsanctioned and unlogged; `surveys` has no `data`/DTO validation; `payments` has no accounts-only path; quotations use hardcoded subsidy/GST constants and a random quote number.
5. **Documents/installations/service tickets** - tables exist (documents, installations) but no modules; service tickets have no table at all.
6. **Exports** - loads the entire org pipeline into memory (spec: stream, respect filters); PDF limited to 50 rows; no filter params; no role scoping.
7. **Reports/share** - `shareUrl` is an API path; the SPA has no `/public/reports/:token` route, and `GET /public/reports/:token` is HTTP-200-less (public controller has no `@UseGuards` but sits behind the global `api` prefix) - the copied "share link" is always broken.
8. **PWA** - 1x1 px icons; `icon.svg` is fine as a favicon only; no install prompt; service worker precaches 28 entries.

## 6. Security gaps (code-level, ordered)

1. Password-ignoring demo login (S2) and two independent guessable-token backdoors (S3, S4).
2. In-memory stores masquerading as the system of record (S1) with **destructive DB writes** (`profiles.delete()`, memory `splice`).
3. RLS: 18 of 20 tables have **no policies**; `leads` "admin" access and `audit_log` visibility trust `request.jwt.claims.app_metadata`, which in this architecture is set by the same service used for all API traffic; `leads_insert_policy` only checks org; `leads_update_policy` does not widen `WITH CHECK`; no `FORCE ROW LEVEL SECURITY`; no audit policy for update/delete (good) but `audit_insert_policy` is `check (true)`.
4. `FeatureGuard` fails open on any exception (S6).
5. PII: audit `meta` holds raw bodies; `audit_log.ip` is `inet` while the interceptor writes `'::1'` and `'127.0.0.1'` (inserts can fail silently); `AllExceptionsFilter` leaks driver text outside production; no log redaction.
6. Rate limiting: only the global 100/min bucket; login/`public/reports` have no tighter override; no per-user or per-IP auth lockout.
7. Upload: no MIME/extension/size validation; ExcelJS parses arbitrary buffers (zip-bomb surface).
8. User admin: hard delete of staff; role changes take effect only after re-login (JWT claim staleness); `PATCH /users/:id/status` accepts an untyped body field.
9. No CSRF concern for the JSON API (Bearer only) but `credentials: true` CORS is enabled with an allow-list - acceptable, though cookies are never used.
10. Secrets: `apps/api/.env` contains a real service-role key; the demo password `KyrosPass@123` is the client default in `AuthContext.login`.

## 7. Recommended fix order

1. **Delete the backdoors** - remove `demo-token-*` from `JwtAuthGuard`, remove the password bypass from `auth.service`, remove the sidebar role switcher (or gate all three behind `NODE_ENV=development` **and** an explicit `ENABLE_DEMO_AUTH` flag).
2. **Delete the in-memory stores** - make `leads`/`users` services DB-only, swallow nothing, map Postgres `23505` -> 409, and write real `deletion_requests` / `deleted_at` flows.
3. **Apply the schema** to the Supabase project (migration + seed) and add `supabase/config.toml`; then write the missing RLS policies for all 20 tables (profile/team scoping, `WITH CHECK`, `FORCE ROW LEVEL SECURITY`, and a `security definer` helper instead of client claims).
4. **Restore the audit trail** - stage history on every transition, `updated_at` trigger, audit `meta` redaction, `ip::text` or `'0.0.0.0'` fallback.
5. **Wire the flags to endpoints** (`installation`, `subsidy`, `reports`, `whatsapp`, `service_tickets`) or remove them from the registry so the admin matrix does not lie.
6. **Build the missing role surfaces** (installer, accounts, surveyor form, documents, installations, service tickets, settings/price-book/subsidy editors), then apply section 4b.
7. **UI fixes** - auth-aware download links (or short-lived download tokens), SPA share route, full 17-stage chips, complete PWA icons.
8. **Tests + CI** - RLS isolation, RBAC per §4b, auth-negative tests, import limits, pipeline transition rules.

### 7b. Remediation status (updated 2026-10-20)

| Step | State | Notes |
|---|---|---|
| 1. Delete the backdoors | ✅ **Done** | `demo-token-*` and the password-ignoring login branch are gated behind `ENABLE_DEMO_AUTH=true` **and** `NODE_ENV!=production`, with a server-side identity allow-list; sidebar role switcher replaced by the child-login panel. |
| 2. Delete the in-memory stores | ✅ **Done** | `leads`/`users` are DB-only; `23505` → 409; real `deletion_requests` + `deleted_at` soft delete; `lead_stage_history` written on transitions; no hard `profiles.delete()`. |
| 3. Apply the schema + RLS | ⚠️ **Migration & seed written, statically validated, NOT applied** | 20 tenant tables have `_select/_insert/_update/_delete` policies + **`FORCE ROW LEVEL SECURITY`**, `set_tenant_context()`, `tenant_org_matches()`/`lead_in_tenant()` helpers, `service_tickets` added, `security definer` resolvers with a `profiles` fallback. `scripts/check-rls-columns.mjs` **PASS**. No reachable Supabase project / `config.toml` yet, so nothing is verified live. |
| 4. Restore the audit trail | ✅ **Done** | Deep PII redaction in the audit interceptor, `inet`-safe IP normalisation, `impersonated_by` recorded, real stage history. |
| 5. Wire the flags to endpoints | ✅ **Done** | `installations`, `service-tickets`, `subsidy`, `whatsapp` modules + `GET /reports/summary` added, so all 15 registry keys now gate something. `telecalling` is enforced in `LeadsService` (row-visibility widening, not a route gate). Guarded by `scripts/check-feature-coverage.mjs` + `feature-registry.spec.ts`. |
| 6. Build the missing role surfaces | 🟡 **Partial** | Admin (users + feature matrix + per-user overrides) done; installer/accounts dashboards, documents/installations/service-ticket UI, survey form UI still open. |
| 7. UI fixes | ✅ **Mostly done** | Auth-aware `downloadFile()` used by dashboard/import/leads; real PWA icons (192/512 maskable/180 px). Share route + 17-stage chips to re-check. |
| 8. Tests + CI | 🟡 **Partial** | 6 Jest suites / **40 tests passing** (incl. tenant-session contract, cross-org 404, feature-registry + role-matrix governance); 3 static checkers (`check-rls-columns`, `check-feature-coverage`, `check-role-matrix`) all PASS; HTTP smoke tests for DTO validation, upload limits, template auth, impersonation, guard ordering. RLS isolation against a live DB still blocked on step 3; no CI workflow. |


## 8. Doc corrections applied

`docs/SECURITY.md`, `docs/SEED.md`, `docs/TESTING.md` and `docs/API.md` were corrected to stop claiming levels of completion the code does not have (see `MEMORY.md` "Known issues").
