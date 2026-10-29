# Security & Secrets Management Rules for Agents

## 1. Absolute Prohibition of Secrets in Git
- **NEVER** commit, stage, or push any `.env`, `.env.local`, `.env.production`, `.env.development`, or private key/token file.
- All live credentials (Supabase Service Role Keys, Database passwords, JWT Secrets, API tokens) must strictly reside in environment variables.
- When adding new environment variables, agents must **ALWAYS** update `.env.example`, `.env.local.example`, and `.env.production.example` with sanitized placeholders.

## 2. Separation of Client and Server Credentials
- **Browser/Client (`apps/web`)**:
  - Only variables prefixed with `VITE_` are exposed to the browser.
  - The browser must **ONLY** receive the Supabase Anonymous (`anon`) publishable key.
  - **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` in `apps/web` or any client-side file.
- **Backend API (`apps/api`)**:
  - Handles `SUPABASE_SERVICE_ROLE_KEY` and direct PostgreSQL connection pool (`DATABASE_URL`).
  - Strict input validation with `class-validator` and `ValidationPipe` on all incoming requests.

## 3. Demo Mode Security Gate
- Demo authentication bypass (`ENABLE_DEMO_AUTH=true`) is only permitted in `development`.
- In production (`NODE_ENV=production`), `ENABLE_DEMO_AUTH` must default to `false` and require authentic Supabase Auth password verification.

## 4. Verification Check Before Git Operations
- Before running `git commit` or `git push`, the agent must verify:
  1. `git status` does not show any untracked or modified `.env` or credentials files.
  2. `.gitignore` retains the exclusion `**/.env` and `**/.env.*`.
