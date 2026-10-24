# Feature Flags & Role Matrix — Solar EPC CRM

Feature grants follow strict hierarchical resolution:
`user override` (highest) → `role default` → `org default` (lowest)

## 1. Feature Registry

| Key | Description | Default Enabled Roles |
|---|---|---|
| `leads` | View and manage assigned leads | `super_admin`, `sales_admin`, `telecaller`, `sales_exec` |
| `bulk_import` | Upload Excel/CSV files with distribution rules | `super_admin`, `sales_admin` |
| `export_excel` | Export pipeline or lead lists to .xlsx | `super_admin`, `sales_admin` |
| `export_pdf` | Generate high-res pipeline PDF reports | `super_admin`, `sales_admin` |
| `quotation` | Build system quotes with PM Surya Ghar subsidy | `super_admin`, `sales_admin`, `sales_exec` |
| `payments` | View and record payment milestones | `super_admin`, `sales_admin`, `sales_exec`, `accounts` |
| `survey` | Perform and submit technical site surveys | `super_admin`, `sales_admin`, `surveyor`, `sales_exec` |
| `installation` | Track procurement, installation, and net-metering| `super_admin`, `sales_admin`, `installer` |
| `subsidy` | Configure government subsidy slabs and GST rules | `super_admin` |
| `reports` | Access analytics and financial reporting | `super_admin`, `sales_admin` |
| `report_share`| Generate secure expiring share links | `super_admin`, `sales_admin` |
| `kpi_dashboard`| View performance graphs and team leaderboards | All roles (scoped view) |
| `service_tickets`| Post-commissioning AMC and maintenance tickets | `super_admin`, `sales_admin`, `installer` |
| `whatsapp` | Trigger WhatsApp templates and message logs | `super_admin`, `sales_admin`, `telecaller`, `sales_exec` |

## 2. Enforcement Points
1. **NestJS Guards:** `@RequireFeature('feature_name')` rejects with 403 Forbidden.
2. **PostgreSQL RLS:** Policies consult user's active permissions computed in JWT.
3. **PWA UI (React):** `<FeatureGate feature="feature_name">` hides menus and action buttons.
