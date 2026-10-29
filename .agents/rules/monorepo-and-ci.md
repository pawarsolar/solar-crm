# Monorepo Architecture & CI/CD Integrity Rules for Agents

## 1. Monorepo Structure & Workspaces
- This repository is an npm monorepo with workspaces:
  - Root: Orchestrator scripts in `scripts/`, global devDependencies.
  - Backend: `apps/api` (NestJS 10, Supabase, Express).
  - Frontend: `apps/web` (React 18, Vite 5, Tailwind CSS).
- When installing packages, always target the specific workspace:
  ```bash
  npm install <package> --workspace=apps/api
  npm install <package> --workspace=apps/web
  ```

## 2. Zero-Failure CI Requirement
- Every push to `main` or pull request triggers GitHub Actions (`.github/workflows/ci.yml`).
- Agents must **NEVER** push code that fails CI:
  1. `npm run lint` must pass with 0 errors across all workspaces (`tsc --noEmit`).
  2. `npm run test` must pass 100% of unit tests (both Jest in API and Vitest in Web).
  3. `npm run build` must succeed locally before pushing.

## 3. Node.js 20 LTS Strict Version Lock
- The repository is locked to Node.js 20 LTS (`20.18.0`) via `.node-version` and `package.json` engines.
- Do NOT upgrade Node to experimental versions (e.g. Node 24) on Render or Netlify, as memory management and native WebSocket handling differ.

## 4. Build Tooling in Dependencies
- Because Render runs `npm install` under `NODE_ENV=production`, core compilation tools (`@nestjs/cli`, `@nestjs/schematics`, `typescript`, `ts-node`, `tsconfig-paths`, `ws`) **MUST remain in `dependencies`** in `apps/api/package.json` (not `devDependencies`).
- Do NOT move build tools back to `devDependencies`, or Render builds will fail with `sh: 1: nest: not found`.

## 5. Low-Memory Compilation Profile (Preventing OOM Status 134)
- Render free-tier instances have a hard **512 MB RAM** limit.
- API builds must use direct TypeScript compilation via `apps/api/scripts/build.cjs` under `--max-old-space-size=350`.
- In `apps/api/tsconfig.build.json`:
  - `declaration` must remain `false`.
  - `sourceMap` must remain `false`.
  - `incremental` must remain `false`.
- This ensures peak memory remains under 150 MB and prevents V8 heap exhaustion.
