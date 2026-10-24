# Seed Data & Database Reset Guide - Solar EPC CRM

> **Status: `seed.sql` has never been applied to any database.** The configured Supabase project
> (`xkbititevicweaadwcio`) answers REST but has no tables (`PGRST205`), and there is no
> `supabase/config.toml` for a local instance. Everything below describes what the script *would*
> insert. Additionally, the list below is aspirational: the script creates 200 leads, 40 surveys,
> ~120 payments and **0 installation milestones** (installations are not seeded despite the claims
> in §1), and no `auth.users` rows are created, so none of the seeded profiles can log in.
> See [`AUDIT.md`](./AUDIT.md).

## 1. Seed Entities Included
- **1 Master Organization:** `Kyros Solar Solutions Pvt Ltd`
- **7 Profiles Across 6 Roles:**
  - `admin@kyrossolar.com` (`super_admin`)
  - `sales.lead@kyrossolar.com` (`sales_admin`)
  - `telecaller1@kyrossolar.com` (`telecaller`)
  - `telecaller2@kyrossolar.com` (`telecaller`)
  - `exec1@kyrossolar.com` (`sales_exec`)
  - `exec2@kyrossolar.com` (`sales_exec`)
  - `surveyor1@kyrossolar.com` (`surveyor`)
- **2 Regional Teams:**
  - `North Pune Sales & Survey`
  - `South Mumbai Commercial`
- **200 Realistic Leads:** Spanning 17 pipeline stages (`NEW` to `COMMISSIONED`), multiple sources (`FB`, `Google Ads`, `WhatsApp`, `Referral`, `Walk-in`), and 5 major solar markets (`Pune`, `Mumbai`, `Nashik`, `Nagpur`, `Aurangabad`).
- **30 Site Surveys:** Containing roof dimensions, shading percentages, structural load, and earthing status.
- **40 Quotations:** Full BOM, blended GST, and PM Surya Ghar subsidy calculations.
- **60 Payments:** Distributed across booking token, advance, progress milestones, and final handovers.
- **15 Installation Milestones:** Material procurement, structure mounting, wiring, inverter commissioning, net-metering.
- **Master Price Book:** Benchmark ₹/kW tiers from 1 kW to 10 kW.
- **Government Tax & Subsidy Matrix:** Verified PM Surya Ghar subsidy slabs and blended GST rates.

## 2. Execution Commands
```bash
# Apply migrations and seed data
npm run seed

# Reset local database (Safety check: refuses to execute if NODE_ENV=production)
npm run seed:reset
```
