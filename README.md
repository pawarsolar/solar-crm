# Solar EPC CRM (Local-first, Mobile-first PWA)

A production-grade, local-first and mobile-first PWA CRM built for Solar EPC contractors (Kyros Solar Solutions) to manage lead inquiries, field site surveys, PM Surya Ghar compliant solar quotations, milestone payments, and executive dashboards with a target page load under 2 seconds.

---

## 1. Technology Stack

- **Backend:** NestJS 10 (TypeScript, class-validator, Helmet, Gzip compression, rate limiting, ExcelJS streaming, PDFMake, plain SQL via pooled connection / Supabase service client, memory bounded to `--max-old-space-size=256`).
- **Database & Auth:** Supabase PostgreSQL with Row Level Security (RLS), Supabase Auth, Private Storage (signed URLs).
- **Frontend:** React 18 + Vite PWA (TypeScript, Tailwind CSS, TanStack Query, React Hook Form + Zod, Recharts, IDB-Keyval offline queue, Workbox).

---

## 2. Key Modules & Capabilities

1. **Role-Based Access Control (RBAC) & Feature Flags:**
   - 6 Pre-configured roles: `super_admin`, `sales_admin`, `telecaller`, `sales_exec`, `surveyor`, `installer` / `accounts`.
   - Hierarchical 3-tier feature resolution: `user override → role default → org default` enforced in API guards (`@RequireFeature`), Postgres RLS policies, and PWA UI gates.
2. **Pipeline & Deduplication:**
   - 17-stage solar lifecycle from `NEW` to `COMMISSIONED` and `AMC/SERVICE`.
   - Phone deduplication per organization (`unique(org_id, phone)`).
   - Immutable audit trail in `lead_stage_history`.
3. **Two-Phase Soft Deletion Approval Workflow:**
   - Sales personnel cannot hard-delete. They submit a `deletion_request` with justification; admins approve to trigger soft-delete (`deleted_at`). Hard delete is restricted exclusively to `super_admin`.
4. **Bulk Import & Category Splitting Engine:**
   - Streaming Excel (.xlsx) and CSV reader using `exceljs`.
   - Automatic anti-formula injection sanitizer (stripping `=`, `+`, `-`, `@`).
   - Rule-based lead distribution across geography, system size, or round-robin split.
5. **Site Surveys & Sizing:**
   - Roof area (sq ft), shadow obstruction (%), sanctioned load, earthing assessment, and recommended kW.
6. **Quotations & Financial ROI:**
   - Official PM Surya Ghar Muft Bijli Yojana subsidy calculator (₹30,000/kW up to 2kW, ₹18,000 for 3rd kW, ₹78,000 cap).
   - Blended residential solar GST calculation (8.9%).
   - In-memory streaming PDF generation via `pdfmake` with private storage upload and signed URLs.
   - 25-Year generation, tariff savings, and payback period calculation.
7. **Milestone Payments:**
   - Booking token, advance procurement, mounting milestone, and final net-metering payments with live outstanding calculator.
8. **Offline-First PWA:**
   - Service worker caching shell assets.
   - IndexedDB (`idb-keyval`) mutation queue for offline lead creation and call logging that replays automatically when network connectivity is restored.

---

## 3. Quick Start (Local Setup)

### Prerequisites
- Node.js >= 20
- npm >= 10

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(The `.env` file is already pre-configured with the project settings).*

### 3. Initialize Database Migrations & Seed Data
```bash
npm run seed
```

### 4. Run Development Servers
In separate terminals or concurrent scripts:
```bash
# Terminal 1: Backend API (NestJS, port 3002)
npm run dev:api

# Terminal 2: Frontend PWA (Vite, port 5173)
npm run dev:web
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 4. Test User Credentials (1-Click Switcher Available on Login)

| Role | Email | Password | Scope |
|---|---|---|---|
| **Super Admin** | `admin@kyrossolar.com` | `KyrosPass@123` | Full enterprise control & feature matrix |
| **Sales Admin** | `sales.lead@kyrossolar.com` | `KyrosPass@123` | Pipeline assignment & deletion approvals |
| **Telecaller** | `telecaller1@kyrossolar.com` | `KyrosPass@123` | Daily follow-up queue & lead capture |
| **Sales Exec** | `exec1@kyrossolar.com` | `KyrosPass@123` | Proposal generation, quotes & payments |
| **Field Surveyor** | `surveyor1@kyrossolar.com` | `KyrosPass@123` | Technical roof & shadow surveys |

---

## 5. Project Structure & Documentation

Detailed engineering documentation is maintained in `/docs`:
- `docs/MEMORY.md`: Project decisions, current status, and roadmap.
- `docs/SCHEMA.md`: Complete database schema, foreign keys, and RLS policies.
- `docs/API.md`: HTTP endpoint catalog, DTO contracts, and feature guards.
- `docs/FEATURES.md`: Feature registry and 3-tier resolution rules.
- `docs/SECURITY.md`: Security and compliance checklist.
- `docs/DATA_LEAKAGE.md`: PII data flow, masking rules, and audit points.
- `docs/PERFORMANCE.md`: Lighthouse benchmarks, bundle budgets, and query optimization.
- `docs/SEO.md`: Meta tags, OpenGraph, and PWA manifest specification.
- `docs/TESTING.md`: Test matrix and verification instructions.
- `docs/SEED.md`: Seed dataset specifications.

---

## 6. Troubleshooting

### Port 3002 EADDRINUSE (Address already in use)
If the API fails to start because a previous Node.js instance didn't release port `3002`, kill it via PowerShell:
```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3002).OwningProcess -Force
```
# solar-crm
