# Deployment, Routing & Infrastructure Rules for Agents

## 1. Hosting Platform Architecture
- **Backend**: Hosted on Render as a Web Service (`solar-crm-06uk`, URL: `https://solar-crm-06uk.onrender.com`).
  - Start command: `npm start` (or `npm run dev:api`).
  - Port binding: Must listen on `0.0.0.0` with `process.env.PORT`.
- **Frontend**: Hosted on Netlify as a static PWA (`pawarsolar-crm`, URL: `https://pawarsolar-crm.netlify.app`).
  - Base directory: `/` (repo root).
  - Package directory: `apps/web`.
  - Publish directory: `dist`.

## 2. Zero-CORS Edge Proxy Routing
- The frontend client must **ALWAYS** target `VITE_API_URL=/api`.
- Netlify edge proxy (configured in `netlify.toml` and `apps/web/netlify.toml`) redirects all `/api/*` requests directly to `https://solar-crm-06uk.onrender.com/api/:splat` with `status = 200` and `force = true`.
- **NEVER** hardcode the Render direct URL in client API calls. Using `/api` avoids CORS preflight requests and works seamlessly across preview branches and production.

## 3. WebSocket Compatibility on Node 20
- When using `@supabase/supabase-js` on Node.js 20 LTS:
  - `globalThis.WebSocket` must be polyfilled using the `ws` package.
  - `createClient()` must explicitly pass `realtime: { transport: WebSocket as any }`.
  - This prevents runtime crashes with `Error: Node.js detected but native WebSocket not found`.

## 4. Render Free-Tier Anti-Sleep Policy
- Render free instances spin down after 15 minutes of inactivity.
- Keep-alive monitoring is maintained via:
  1. `.github/workflows/keep-alive.yml`: Automated GitHub Actions cron pinging `/api/health` every 10 minutes.
  2. External uptime monitors (e.g. UptimeRobot or BetterStack) targeting `https://solar-crm-06uk.onrender.com/api/health`.
- The `/api/health` endpoint must remain lightweight and fast (<10ms response time).

## 5. Supabase Schema Resilience
- The backend features an automatic in-memory fallback engine in `apps/api/src/db/supabase.service.ts`.
- If PostgreSQL tables (`leads`, `profiles`) are pending migration, the service logs a schema health alert and serves requests safely without throwing 500/502 errors.
