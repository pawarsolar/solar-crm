# GEMINI.md — Agent System Directives for Solar EPC CRM

This document defines core behavioral constraints, development conventions, and operational workflows for Gemini and Antigravity agents in this workspace.

---

## Workspace Architecture Quick Map

| Path | Purpose | Key Frameworks |
| :--- | :--- | :--- |
| `apps/api` | Backend REST API & Auth | NestJS 10, Supabase, Express, TypeScript |
| `apps/web` | Frontend Local-First PWA | React 18, Vite 5, Tailwind CSS, Lucide |
| `scripts/` | Monorepo Build Orchestrators | Node.js (CommonJS) |
| `supabase/` | Database Migrations & Seeds | PostgreSQL SQL |
| `.agents/rules/` | Domain-Specific Agent Rule Sets | Markdown |

---

## Mandatory Operational Rules

### 1. Protection of Secrets
- Never commit actual `.env` files or credentials.
- Maintain [`.env.local.example`](file:///e:/solar_crm/.env.local.example) and [`.env.production.example`](file:///e:/solar_crm/.env.production.example).
- Ensure `.gitignore` ignores all live environment files.

### 2. CI/CD Quality Gate
- Before committing any changes, run and verify:
  1. `npm run lint` &rarr; 0 errors
  2. `npm run test` &rarr; All 40+ unit tests pass
  3. `npm run build` &rarr; All 21 JavaScript chunks pass the 300 kB budget check

### 3. Render Memory Safe Build Protocol
- Keep compiler memory within 350 MB on Render.
- Keep `@nestjs/cli`, `typescript`, `ts-node`, `tsconfig-paths`, and `ws` in `dependencies` in `apps/api/package.json`.
- Keep Node.js pinned to 20 LTS via `.node-version`.

### 4. Zero-CORS Edge Routing
- Always keep `VITE_API_URL=/api`. Netlify edge proxy forwards all requests to Render seamlessly.

---

## Detailed Rules Directory
- [Security & Secrets Policy](file:///e:/solar_crm/.agents/rules/security-and-secrets.md)
- [Monorepo & CI/CD Standards](file:///e:/solar_crm/.agents/rules/monorepo-and-ci.md)
- [Deployment & Routing Guidelines](file:///e:/solar_crm/.agents/rules/deployment-and-routing.md)
