
# AGENTS.md — Rules & Guidelines for AI Assistants

This repository contains **Solar EPC CRM**, a production-grade enterprise monorepo combining a NestJS backend (`apps/api`) and a React/Vite PWA frontend (`apps/web`).

All AI coding assistants (Antigravity, Gemini, Copilot, etc.) working on this repository **MUST STRICTLY ADHERE** to the rules below.

---

## 1. Secrets & Environment Safety (Non-Negotiable)
- **NEVER COMMIT CREDENTIALS**: Do not commit, stage, or push any `.env`, `.env.local`, `.env.production`, `.env.development`, or private key files.
- **TEMPLATE MAINTENANCE**: Whenever an environment variable is introduced or modified, update all three template files:
  - [`.env.example`](file:///e:/solar_crm/.env.example) — Global reference
  - [`.env.local.example`](file:///e:/solar_crm/.env.local.example) — Local developer reference
  - [`.env.production.example`](file:///e:/solar_crm/.env.production.example) — Render & Netlify deployment reference
- **GITIGNORE INTEGRITY**: Ensure `.gitignore` continuously blocks all `.env*` files with:
  ```gitignore
  **/.env
  **/.env.*
  !**/.env.example
  !**/.env.local.example
  !**/.env.production.example
  ```

---

## 2. CI/CD & Build Integrity Rules
- **ZERO CI FAILURES**: Every commit must pass all GitHub Actions CI checks (`.github/workflows/ci.yml`).
- **PRE-COMMIT VALIDATION**: Run these three commands locally and ensure they exit with code 0 before pushing:
  ```bash
  npm run lint    # Global TypeScript typechecking (tsc --noEmit)
  npm run test    # Full test suite (Jest in API + Vitest in Web)
  npm run build   # Monorepo build orchestrator
  ```
- **NODE.JS VERSION LOCK**: The repository is pinned to **Node.js 20 LTS** (`20.18.0`) via [`.node-version`](file:///e:/solar_crm/.node-version) and `package.json` engines. Do NOT switch to Node 24 on Render or Netlify.

---

## 3. Render Memory Protection (Preventing Heap OOM Status 134)
- Render free-tier instances have a hard **512 MB RAM** limit.
- **NEVER** pass `--max-old-space-size=4096` to the backend on Render.
- In [`scripts/build-root.cjs`](file:///e:/solar_crm/scripts/build-root.cjs) and [`apps/api/scripts/build.cjs`](file:///e:/solar_crm/apps/api/scripts/build.cjs), the memory ceiling for Render is capped at `--max-old-space-size=350`.
- In [`apps/api/tsconfig.build.json`](file:///e:/solar_crm/apps/api/tsconfig.build.json), `declaration`, `sourceMap`, and `incremental` must remain `false` to keep compilation memory below 150 MB.
- Build tools (`@nestjs/cli`, `@nestjs/schematics`, `typescript`, `ts-node`, `tsconfig-paths`, `ws`) must remain in `dependencies` in [`apps/api/package.json`](file:///e:/solar_crm/apps/api/package.json) so they are installed in production builds (`NODE_ENV=production`).

---

## 4. Supabase & WebSocket Rules
- Node.js 20 LTS does not enable native `globalThis.WebSocket` by default.
- Always preserve the `ws` polyfill in [`apps/api/src/main.ts`](file:///e:/solar_crm/apps/api/src/main.ts) and [`apps/api/src/db/supabase.service.ts`](file:///e:/solar_crm/apps/api/src/db/supabase.service.ts).
- Pass `realtime: { transport: WebSocket as any }` inside `createClient()`.
- Do NOT expose `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` to `apps/web`. The frontend only receives `VITE_SUPABASE_ANON_KEY`.

---

## 5. Routing & Cross-Origin Architecture
- The frontend client must use `VITE_API_URL=/api`.
- Netlify CDN edge redirects `/api/*` to Render (`https://solar-crm-06uk.onrender.com/api/:splat`) with status 200.
- Do NOT hardcode direct Render URLs in frontend API service calls.

---

## 6. Detailed Rule References
- [Security & Secrets](file:///e:/solar_crm/.agents/rules/security-and-secrets.md)
- [Monorepo & CI/CD](file:///e:/solar_crm/.agents/rules/monorepo-and-ci.md)
- [Deployment & Routing](file:///e:/solar_crm/.agents/rules/deployment-and-routing.md)
