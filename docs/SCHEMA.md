# Database Schema Reference — Solar EPC CRM

The database is built on PostgreSQL with Row Level Security (RLS) enabled on all tables.

## 1. Tables Overview

| Table | Purpose | Primary Key | Key Foreign Keys |
|---|---|---|---|
| `orgs` | Solar EPC organizations (tenants) | `id (uuid)` | - |
| `profiles` | Users tied to `auth.users` | `id (uuid)` | `org_id -> orgs`, `team_id -> teams` |
| `teams` | Regional or departmental sales/survey teams | `id (uuid)` | `org_id -> orgs`, `lead_id -> profiles` |
| `features` | Master registry of system feature flags | `key (text)` | - |
| `feature_grants` | Scoped overrides (org / role / user) | `id (uuid)` | `org_id -> orgs`, `feature_key -> features` |
| `leads` | Solar pipeline leads with stage & dedupe | `id (uuid)` | `org_id`, `owner_id -> profiles`, `team_id` |
| `lead_stage_history`| Audit trail of pipeline phase changes | `id (bigserial)`| `lead_id -> leads`, `by_user -> profiles` |
| `lead_activities` | Call logs, follow-up notes, site remarks | `id (bigserial)`| `lead_id -> leads`, `by_user -> profiles` |
| `import_batches` | Metadata on bulk CSV/Excel imports | `id (uuid)` | `org_id -> orgs`, `by_user -> profiles` |
| `deletion_requests`| Workflow queue for soft-delete approvals | `id (uuid)` | `org_id`, `requested_by`, `decided_by` |
| `surveys` | Technical site assessment (roof, shadow, kW)| `id (uuid)`| `lead_id -> leads`, `surveyor_id` |
| `price_book` | Benchmark solar pricing ₹/kW tiers | `id (uuid)` | `org_id -> orgs` |
| `tax_subsidy_config`| GST rules (8.9%) & PM Surya Ghar subsidies| `key (text)` | - |
| `quotations` | Generated customer proposals with BOM & ROI | `id (uuid)` | `org_id`, `lead_id -> leads` |
| `payments` | Customer payment milestones & receipts | `id (uuid)` | `org_id`, `lead_id`, `quotation_id` |
| `installations` | Engineering & commissioning milestone tracking | `id (uuid)` | `lead_id -> leads` |
| `documents` | KYC, electricity bills, site photos | `id (uuid)` | `lead_id -> leads`, `by_user -> profiles` |
| `targets` | Monthly revenue/kW targets per sales agent | `id (uuid)` | `user_id -> profiles` |
| `report_shares` | Tokenized expiring public report links | `id (uuid)` | `org_id -> orgs`, `created_by` |
| `audit_log` | Immutable append-only security log | `id (bigserial)`| `org_id`, `user_id` |

## 2. Views & Materialized Performance Views
- `v_funnel`: Real-time count of leads, estimated kW, and projected pipeline value aggregated per stage.
- `v_kpi_daily`: Daily intake, calls performed, surveys completed, quotes sent, bookings closed, revenue collected.
- `v_team_perf`: Total assigned leads, conversions, bookings, and revenue collected per salesperson.

## 3. RLS Matrix
- **Leads:** Users only query leads matching their `org_id`. Super admins and Sales admins see all leads in org; Telecallers and Sales Execs see assigned (`owner_id = auth.uid()`) or team leads if team lead.
- **Deletes:** Direct `DELETE` queries denied for all non-super-admin users. Soft deletes handled via `deleted_at`.
