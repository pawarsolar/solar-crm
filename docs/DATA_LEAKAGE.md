# Data Leakage Prevention & PII Inventory — Solar EPC CRM

## 1. PII Inventory

| Field | Sensitivity | Stored In | Authorized Viewers | Masking Rule |
|---|---|---|---|---|
| Customer Name | Medium | `leads.name` | Org Staff | Plain text |
| Phone Number | High | `leads.phone` | Owner, Team Lead, Admins | Masked on public share links (e.g., `+91 98****1234`) |
| Email Address | Medium | `leads.email` | Owner, Team Lead, Admins | Masked on public shares (e.g., `r****@example.com`) |
| Site Address | High | `leads.address` | Assigned Surveyor, Exec, Admins | Masked to City/Pincode on shared previews |
| Electricity Bill | High | `documents.storage_path` | Assigned Staff | Private Supabase bucket, signed URL only |
| KYC Documents | Critical | `documents.storage_path` | Accounts, Admins | Private Supabase bucket, strictly restricted |

## 2. Leakage Test Results
- **Bundle Audit:** Automated grep verification ensuring `SUPABASE_SERVICE_ROLE_KEY` or database credentials never enter client-side JavaScript bundles.
- **API Serializers:** Strict DTO response serialization to ensure password hashes, internal metadata, or unmasked credentials are excluded from HTTP payloads.
- **Audit Logging:** Every export (`.xlsx` or `.pdf`) requires explicit permission and records user IP, timestamp, and row count to `audit_log`.
