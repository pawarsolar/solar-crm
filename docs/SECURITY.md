# Security Standards & Compliance Checklist - Solar EPC CRM

**Status: NOT compliant. This document previously reported 14/14 "passed"; that was inaccurate.**
Full evidence, severity ratings and remediation order: see [`AUDIT.md`](./AUDIT.md).

Legend: PASS = verified in code | PARTIAL = implemented but with a bypass/bug | FAIL = not implemented or defeated | BLOCKED = cannot be verified until the DB schema is applied.

| # | Requirement | Status | Reality |
|---|---|---|---|
| 1 | Server-side service role key isolation | PATHAL | Service-role client exists only server-side (good), but `apps/api/.env` holds a live key and `POST /auth/login` hands out tokens with no password check, so the key boundary is moot. |
| 2 | RLS on every table | **FAIL** | RLS is *enabled* on 20 tables but policies exist for only 2 (`leads`, `audit_log`; 6 policies total). 18 tables have none. `leads` "admin" checks read `org_id`/`role` from client-controllable JWT `app_metadata`; `leads_insert_policy` checks only `org_id`. |
| 3 | Server-side role & feature guards | **FAIL** | `JwtAuthGuard` accepts `Bearer demo-token-<role>` for any role incl. `super_admin`; `FeatureGuard` fails **open** on any DB error; `surveys`/`deletion-requests` bodies are untyped. |
| 4 | Parameterized SQL & validation pipes | PARTIAL | `ValidationPipe({whitelist, forbidNonWhitelisted})` is global and `pg` queries are parameterized, but several routes use `@Body() body: any` / inline object types, so nothing is validated there. |
| 5 | Helmet & strict CORS | PASS | `helmet()` global; CORS allow-list from `CORS_ORIGIN`. |
| 6 | Rate limiting (auth 5/min) | **FAIL** | Only a global 100 req/min bucket exists; no `@Throttle` override on `auth/login` or `public/reports`. |
| 7 | Excel/CSV formula-injection sanitization | PASS | `sanitizeCellValue()` prefixes `= + - @` on preview and commit. |
| 8 | Private storage & short signed URLs | **FAIL** | No documents module, no bucket config, no signed URLs. `quotations.pdf_path` is never written. |
| 9 | Expiring report share tokens | PARTIAL | HMAC-SHA256 token + expiry implemented, but the emitted `shareUrl` (`/public/reports/<token>`) has no SPA route, so shares are unusable end-to-end. |
| 10 | PII protection & log redaction | **FAIL** | Masking exists in public report output, but `AuditInterceptor` stores the **raw request body** (name/phone/email/notes) in `audit_log.meta`; the exception filter leaks messages outside production. |
| 11 | Immutable audit logging | **FAIL** | `audit_log` has insert+select policies only (good), but stage changes/follow-ups/assignments no longer write history, `audit_log.ip` is `inet` while `'::1'` is written (silent failures), and `profiles` rows are hard-deleted with no tombstone. |
| 12 | Short-lived JWT & session revoke | **FAIL** | `demo-token-*` never expires and needs no user; role changes only take effect after the user re-authenticates; no deactivation revocation path. |
| 13 | CSP & anti-XSS | PARTIAL | Helmet defaults only; no explicit CSP; React escapes output. |
| 14 | DPDP Act 2023 (consent + soft delete) | **FAIL** | No consent checkbox in the capture form (`consent_recorded` defaults true); `DELETE /leads/:id` removes the record from the in-memory store instead of setting `deleted_at`; `DELETE /users/:id` hard-deletes profiles. |
