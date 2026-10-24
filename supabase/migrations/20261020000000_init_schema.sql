-- ==============================================================================
-- Solar EPC CRM — Initial Database Schema & RLS Policies
-- ==============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- 1. Master Tenants / Organizations
create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- 2. User Profiles (Extends auth.users)
create table if not exists profiles (
  id uuid primary key,
  org_id uuid not null references orgs(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  role text not null check (role in ('super_admin','sales_admin','telecaller','sales_exec','surveyor','installer','accounts')),
  team_id uuid,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists components (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  category text not null check (category in ('solar_panel','solar_inverter','mounting_structure','solar_cable','accessories')),
  brand text not null,
  model text not null,
  specs jsonb default '{}'::jsonb,
  price numeric,
  unit text default 'piece',
  wattage numeric,
  is_active boolean default true,
  search_vector tsvector,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(org_id, category, brand, model)
);

create index if not exists idx_components_org_cat on components (org_id, category, is_active);
create index if not exists idx_components_search on components using gin (search_vector);

create or replace function components_search_trigger() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.brand,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.model,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.category,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.specs::text,'')), 'C');
  new.updated_at = now();
  return new;
end
$$ language plpgsql;

drop trigger if exists components_search_update on components;
create trigger components_search_update
  before insert or update on components
  for each row execute function components_search_trigger();

-- 3. Teams
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  name text not null,
  lead_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Add foreign key constraint back to profiles for team_id
alter table profiles add constraint fk_profiles_team foreign key (team_id) references teams(id) on delete set null;

-- 4. Feature Registry
create table if not exists features (
  key text primary key,
  label text not null,
  description text
);

-- 5. Feature Grants (Scope: org / role / user)
create table if not exists feature_grants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  scope text not null check (scope in ('org','role','user')),
  scope_value text not null, -- role name or user UUID
  feature_key text not null references features(key) on delete cascade,
  enabled boolean not null,
  unique (org_id, scope, scope_value, feature_key)
);

-- 6. Leads (Core Pipeline)
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  city text,
  state text,
  pincode text,
  address text,
  source text default 'Direct',
  category text default 'Residential',
  monthly_bill numeric,
  system_kw numeric,
  property_type text,
  stage text not null default 'NEW',
  status text default 'ACTIVE',
  owner_id uuid references profiles(id) on delete set null,
  team_id uuid references teams(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  next_followup_at timestamptz,
  last_contact_at timestamptz,
  first_response_at timestamptz,
  value_estimate numeric,
  notes text,
  consent_recorded boolean default true,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (org_id, phone)
);

create index if not exists idx_leads_org_stage on leads (org_id, stage) where deleted_at is null;
create index if not exists idx_leads_owner_followup on leads (owner_id, next_followup_at) where deleted_at is null;
create index if not exists idx_leads_org_created on leads (org_id, created_at desc);

-- 7. Lead Stage History (Audit trail of pipeline movements)
create table if not exists lead_stage_history (
  id bigserial primary key,
  lead_id uuid not null references leads(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  by_user uuid references profiles(id) on delete set null,
  note text,
  at timestamptz default now()
);

-- 8. Lead Activities (Call logs, follow-ups, visits)
create table if not exists lead_activities (
  id bigserial primary key,
  lead_id uuid not null references leads(id) on delete cascade,
  type text not null, -- call, whatsapp, visit, note
  outcome text,       -- connected, busy, wrong_number, interested, scheduled_survey
  note text,
  by_user uuid references profiles(id) on delete set null,
  at timestamptz default now()
);

-- 9. Bulk Import Batches
create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  file_name text not null,
  total int not null default 0,
  ok int not null default 0,
  failed int not null default 0,
  rules jsonb,
  by_user uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- 10. Deletion Requests (Approval workflow before soft delete)
create table if not exists deletion_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  entity text not null check (entity in ('lead', 'quotation', 'survey')),
  entity_id uuid not null,
  reason text not null,
  requested_by uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz default now()
);

-- 11. Surveys (Technical Site Assessments)
create table if not exists surveys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  surveyor_id uuid references profiles(id) on delete set null,
  scheduled_at timestamptz,
  done_at timestamptz,
  roof_area_sqft numeric,
  roof_type text, -- rcc, tin_shed, tiled
  shadow_pct numeric,
  sanctioned_load_kw numeric,
  earthing_ok boolean default true,
  recommended_kw numeric,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 12. Master Price Book
create table if not exists price_book (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  kw numeric not null,
  system_type text not null default 'on-grid', -- on-grid, hybrid, off-grid
  tier text default 'premium',
  base_price numeric not null,
  valid_from date default current_date,
  valid_to date default (current_date + interval '90 days'),
  active boolean default true,
  created_at timestamptz default now()
);

-- 13. Tax and Subsidy Configuration (PM Surya Ghar & Blended GST)
create table if not exists tax_subsidy_config (
  key text primary key,
  value jsonb not null,
  source_url text,
  verified_on date default current_date
);

-- 14. Quotations
create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  number text not null unique,
  version int default 1,
  kw numeric not null,
  panel_brand text,
  inverter_brand text,
  items jsonb default '[]'::jsonb,
  subtotal numeric not null,
  gst numeric not null,
  total numeric not null,
  subsidy numeric default 0,
  net_cost numeric not null,
  roi jsonb default '{}'::jsonb,
  valid_until date default (current_date + interval '15 days'),
  pdf_path text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- 15. Payments
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  quotation_id uuid references quotations(id) on delete set null,
  type text not null check (type in ('booking','advance','milestone','final')),
  amount numeric not null,
  due_date date,
  paid_on date,
  mode text, -- UPI, NEFT, Cheque, Cash
  ref_no text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz default now()
);

-- 16. Installations
create table if not exists installations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  milestone text not null, -- material_dispatch, structure_mounting, module_wiring, inverter_commission, net_metering
  planned_on date,
  done_on date,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  note text,
  created_at timestamptz default now()
);

-- 17. Documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  kind text not null, -- electricity_bill, site_photo, kyc_aadhaar, kyc_pan, quotation_copy
  storage_path text not null,
  by_user uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- 18. Sales Targets
create table if not exists targets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  period text not null, -- e.g. 2026-10
  period_start date not null,
  metric text not null default 'revenue', -- revenue, kw, bookings
  target numeric not null,
  created_at timestamptz default now()
);

-- 19. Report Shares (Expiring Public Access)
create table if not exists report_shares (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  report text not null,
  params jsonb default '{}'::jsonb,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- 20. Immutable Audit Log
create table if not exists audit_log (
  id bigserial primary key,
  org_id uuid references orgs(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb default '{}'::jsonb,
  ip inet,
  at timestamptz default now()
);

-- ==============================================================================
-- Analytical Views (Performance optimized SQL views)
-- ==============================================================================

create or replace view v_funnel as
select 
  l.org_id,
  l.stage,
  count(l.id) as lead_count,
  coalesce(sum(l.system_kw), 0) as total_kw,
  coalesce(sum(l.value_estimate), 0) as total_value
from leads l
where l.deleted_at is null
group by l.org_id, l.stage;

create or replace view v_kpi_daily as
select
  l.org_id,
  date_trunc('day', l.created_at) as day,
  count(l.id) as new_leads,
  count(case when l.stage = 'BOOKED' then 1 end) as booked_leads,
  coalesce(sum(case when l.stage = 'BOOKED' then l.value_estimate else 0 end), 0) as booked_value
from leads l
where l.deleted_at is null
group by l.org_id, date_trunc('day', l.created_at);

create or replace view v_team_perf as
select
  p.id as user_id,
  p.org_id,
  p.full_name,
  p.role,
  count(l.id) as total_assigned,
  count(case when l.stage in ('QUOTATION_SENT', 'NEGOTIATION', 'BOOKED') then 1 end) as qualified_or_booked,
  count(case when l.stage = 'BOOKED' then 1 end) as booked_count,
  coalesce(sum(case when l.stage = 'BOOKED' then l.value_estimate else 0 end), 0) as total_booked_value
from profiles p
left join leads l on l.owner_id = p.id and l.deleted_at is null
group by p.id, p.org_id, p.full_name, p.role;

-- ==============================================================================
-- Row Level Security (RLS) Configuration
-- ==============================================================================

alter table orgs enable row level security;
alter table profiles enable row level security;
alter table teams enable row level security;
alter table features enable row level security;
alter table feature_grants enable row level security;
alter table leads enable row level security;
alter table lead_stage_history enable row level security;
alter table lead_activities enable row level security;
alter table import_batches enable row level security;
alter table deletion_requests enable row level security;
alter table surveys enable row level security;
alter table price_book enable row level security;
alter table tax_subsidy_config enable row level security;
alter table quotations enable row level security;
alter table payments enable row level security;
alter table installations enable row level security;
alter table documents enable row level security;
alter table targets enable row level security;
alter table report_shares enable row level security;
alter table audit_log enable row level security;

-- Global policy helper functions
create or replace function get_auth_org_id() returns uuid as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'org_id', '')::uuid;
$$ language sql stable;

create or replace function get_auth_role() returns text as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role', 'anonymous');
$$ language sql stable;

-- Leads RLS Policies (the INSERT/UPDATE/DELETE bodies are replaced further down
-- with tenant_org_matches()-based versions once the helpers exist).
create policy "leads_select_policy" on leads
  for select using (
    deleted_at is null and (
      org_id = get_auth_org_id() and (
        get_auth_role() in ('super_admin', 'sales_admin') or
        owner_id = auth.uid() or
        team_id in (select id from teams where lead_id = auth.uid())
      )
    )
  );

create policy "leads_insert_policy" on leads
  for insert with check (
    org_id = get_auth_org_id()
  );

create policy "leads_update_policy" on leads
  for update using (
    deleted_at is null and (
      org_id = get_auth_org_id() and (
        get_auth_role() in ('super_admin', 'sales_admin') or
        owner_id = auth.uid()
      )
    )
  );

-- No DELETE policy for standard sales roles (must use deletion_requests)
create policy "leads_delete_policy" on leads
  for delete using (
    get_auth_role() = 'super_admin'
  );

-- Audit log: Insert only, no update or delete for anyone
create policy "audit_insert_policy" on audit_log for insert with check (true);
create policy "audit_select_policy" on audit_log for select using (
  get_auth_role() in ('super_admin', 'sales_admin') and org_id = get_auth_org_id()
);

-- ==============================================================================
-- 2nd migration: Service tickets, helper functions, tightened RLS, entitlements
-- ==============================================================================

-- Post-commissioning AMC / service tickets (feature flag `service_tickets`)
create table if not exists service_tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  subject text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  assigned_to uuid references profiles(id) on delete set null,
  opened_by uuid references profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists components (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  category text not null check (category in ('solar_panel','solar_inverter','mounting_structure','solar_cable','accessories')),
  brand text not null,
  model text not null,
  specs jsonb default '{}'::jsonb,
  price numeric,
  unit text default 'piece',
  wattage numeric,
  is_active boolean default true,
  search_vector tsvector,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(org_id, category, brand, model)
);

create index if not exists idx_components_org_cat on components (org_id, category, is_active);
create index if not exists idx_components_search on components using gin (search_vector);

create or replace function components_search_trigger() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.brand,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.model,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.category,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.specs::text,'')), 'C');
  new.updated_at = now();
  return new;
end
$$ language plpgsql;

drop trigger if exists components_search_update on components;
create trigger components_search_update
  before insert or update on components
  for each row execute function components_search_trigger();

create index if not exists idx_service_tickets_org_status on service_tickets (org_id, status);

-- Audit trail for super-admin entitlement (feature grant) changes
alter table feature_grants add column if not exists updated_at timestamptz default now();
alter table feature_grants add column if not exists updated_by uuid references profiles(id) on delete set null;

-- ------------------------------------------------------------------------------
-- Safer RLS claim helpers: app_metadata role is authoritative, with a profiles
-- fallback so a stale/missing JWT claim cannot silently grant admin access.
-- ------------------------------------------------------------------------------
create or replace function raw_auth_org_id() returns uuid as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'org_id', '')::uuid,
    (select org_id from profiles where id = auth.uid())
  );
$$ language sql stable security definer set search_path = public;

create or replace function raw_auth_role() returns text as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role', ''),
    (select role from profiles where id = auth.uid()),
    'anonymous'
  );
$$ language sql stable security definer set search_path = public;

-- ------------------------------------------------------------------------------
-- Tenant identity resolution for *server-side* sessions.
--
-- The NestJS API connects with a privileged role (the Supabase service role /
-- the `postgres` owner) which normally bypasses RLS. To make tenant isolation
-- defence-in-depth rather than app-only, every request that touches tenant data
-- runs inside a transaction which calls set_tenant_context(<org>, <role>) first.
-- These helpers read that transaction-local setting, exactly like PostgREST
-- reads the JWT claim above, so the SAME policies apply on both paths.
-- ------------------------------------------------------------------------------
create or replace function set_tenant_context(p_org uuid, p_role text) returns void as $$
  select set_config('app.current_org', coalesce(p_org::text, ''), true),
         set_config('app.current_role', coalesce(p_role, 'anonymous'), true);
$$ language plpgsql volatile;

-- Seed/reset escape hatch. `app.bypass_rls` is set ONLY by the seed/reset
-- scripts, never on a request-serving connection.
create or replace function rls_bypassed() returns boolean as $$
  select coalesce(current_setting('app.bypass_rls', true), 'off') = 'on';
$$ language sql stable;

-- Unified resolver: an explicit PostgREST-style JWT claim wins, otherwise the
-- server-side tenant context, otherwise the caller's own profile.
create or replace function get_auth_org_id() returns uuid as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'org_id', '')::uuid,
    nullif(current_setting('app.current_org', true), '')::uuid,
    raw_auth_org_id()
  );
$$ language sql stable security definer set search_path = public;

create or replace function get_auth_role() returns text as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role', ''),
    nullif(current_setting('app.current_role', true), ''),
    raw_auth_role()
  );
$$ language sql stable security definer set search_path = public;

create or replace function is_org_admin() returns boolean as $$
  select rls_bypassed() or get_auth_role() in ('super_admin', 'sales_admin');
$$ language sql stable;

revoke execute on function get_auth_org_id() from public;
revoke execute on function get_auth_role() from public;
grant execute on function get_auth_org_id() to authenticated;
grant execute on function get_auth_role() to authenticated;
grant execute on function is_org_admin() to authenticated;

-- Tenant-table policy body. `rls_bypassed()` ORs into every predicate so the
-- seed/reset connection is never blocked, while a request-serving connection
-- (which never sets the flag) is policed strictly.
create or replace function tenant_org_matches(p_org uuid) returns boolean as $$
  select rls_bypassed() or p_org = get_auth_org_id();
$$ language sql stable;

grant execute on function tenant_org_matches(uuid) to authenticated;
grant execute on function rls_bypassed() to authenticated;

-- ------------------------------------------------------------------------------
-- Tighten the leads policies (insert now pins owner to the caller or an admin)
-- ------------------------------------------------------------------------------
drop policy if exists "leads_select_policy" on leads;
create policy "leads_select_policy" on leads
  for select using (
    rls_bypassed() or (
      deleted_at is null and tenant_org_matches(org_id) and (
        is_org_admin() or
        owner_id = auth.uid() or
        team_id in (select id from teams where lead_id = auth.uid())
      )
    )
  );

drop policy if exists "leads_insert_policy" on leads;
create policy "leads_insert_policy" on leads
  for insert with check (
    tenant_org_matches(org_id)
    and (is_org_admin() or owner_id = auth.uid() or owner_id is null)
  );

drop policy if exists "leads_update_policy" on leads;
create policy "leads_update_policy" on leads
  for update using (
    tenant_org_matches(org_id) and (is_org_admin() or owner_id = auth.uid())
  ) with check (
    tenant_org_matches(org_id) and (is_org_admin() or owner_id = auth.uid())
  );

drop policy if exists "leads_delete_policy" on leads;
create policy "leads_delete_policy" on leads
  for delete using (rls_bypassed() or (deleted_at is not null and get_auth_role() = 'super_admin'));

drop policy if exists "audit_select_policy" on audit_log;
create policy "audit_select_policy" on audit_log for select using (
  is_org_admin() and tenant_org_matches(org_id)
);

-- ------------------------------------------------------------------------------
-- Remaining tenant tables: org-scoped access, admin-only mutations.
-- (Previously 18 of 20 tables had RLS enabled but zero policies = deny-all.)
-- ------------------------------------------------------------------------------
do $$
declare
  t text;
  tenant_tables text[] := array[
    'profiles','teams','feature_grants','import_batches','deletion_requests',
    'surveys','price_book','quotations','payments','installations','documents',
    'targets','report_shares','service_tickets','components'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('drop policy if exists "%s_select" on %I', t, t);
    execute format('drop policy if exists "%s_insert" on %I', t, t);
    execute format('drop policy if exists "%s_update" on %I', t, t);
    execute format('drop policy if exists "%s_delete" on %I', t, t);

    execute format(
      'create policy "%s_select" on %I for select using (tenant_org_matches(org_id))',
      t, t
    );
    execute format(
      'create policy "%s_insert" on %I for insert with check (tenant_org_matches(org_id))',
      t, t
    );
    execute format(
      'create policy "%s_update" on %I for update using (tenant_org_matches(org_id) and is_org_admin()) with check (tenant_org_matches(org_id))',
      t, t
    );
    execute format(
      'create policy "%s_delete" on %I for delete using (tenant_org_matches(org_id) and get_auth_role() = ''super_admin'')',
      t, t
    );
  end loop;
end $$;

-- ------------------------------------------------------------------------------
-- Child tables that hang off a lead and carry NO org_id of their own. Their
-- tenant boundary is the parent lead, so the policies join through `leads`.
-- (Listing them in the org_id loop above made the migration itself fail with
-- `column "org_id" does not exist`.)
-- ------------------------------------------------------------------------------
create or replace function lead_in_tenant(p_lead uuid) returns boolean as $$
  select rls_bypassed() or exists (
    select 1 from leads
    where leads.id = p_lead
      and leads.org_id = get_auth_org_id()
  );
$$ language sql stable security definer set search_path = public;

grant execute on function lead_in_tenant(uuid) to authenticated;

do $$
declare
  t text;
  child_tables text[] := array['lead_stage_history', 'lead_activities'];
begin
  foreach t in array child_tables loop
    execute format('drop policy if exists "%s_select" on %I', t, t);
    execute format('drop policy if exists "%s_insert" on %I', t, t);
    execute format('drop policy if exists "%s_update" on %I', t, t);
    execute format('drop policy if exists "%s_delete" on %I', t, t);

    execute format(
      'create policy "%s_select" on %I for select using (lead_in_tenant(lead_id))',
      t, t
    );
    execute format(
      'create policy "%s_insert" on %I for insert with check (lead_in_tenant(lead_id))',
      t, t
    );
    -- Stage history / activities are an append-only trail: admins may correct,
    -- nobody except super_admin may delete.
    execute format(
      'create policy "%s_update" on %I for update using (lead_in_tenant(lead_id) and is_org_admin()) with check (lead_in_tenant(lead_id))',
      t, t
    );
    execute format(
      'create policy "%s_delete" on %I for delete using (rls_bypassed() or (lead_in_tenant(lead_id) and get_auth_role() = ''super_admin''))',
      t, t
    );
  end loop;
end $$;

-- Reference tables shared across tenants
drop policy if exists "features_select" on features;
create policy "features_select" on features for select using (rls_bypassed() or auth.uid() is not null);

drop policy if exists "tax_subsidy_select" on tax_subsidy_config;
create policy "tax_subsidy_select" on tax_subsidy_config for select using (rls_bypassed() or auth.uid() is not null);

drop policy if exists "orgs_select" on orgs;
create policy "orgs_select" on orgs for select using (rls_bypassed() or id = get_auth_org_id());

-- The seed loads the feature registry and subsidy slabs, so these tables need
-- a write policy. It is bypass-gated: only the seed/reset connection (which
-- sets `app.bypass_rls`) can write them, so tenant traffic stays read-only.
do $$
declare
  t text;
  reference_tables text[] := array['features', 'tax_subsidy_config'];
begin
  foreach t in array reference_tables loop
    execute format('drop policy if exists "%s_select" on %I', t, t);
    execute format('drop policy if exists "%s_write" on %I', t, t);
    execute format(
      'create policy "%s_select" on %I for select using (rls_bypassed() or auth.uid() is not null)',
      t, t
    );
    execute format(
      'create policy "%s_write" on %I for all using (rls_bypassed()) with check (rls_bypassed())',
      t, t
    );
  end loop;
end $$;

drop policy if exists "orgs_write" on orgs;
create policy "orgs_write" on orgs for all using (rls_bypassed()) with check (rls_bypassed());

-- ------------------------------------------------------------------------------
-- FORCE ROW LEVEL SECURITY.
--
-- `ENABLE ROW LEVEL SECURITY` alone does NOT apply to the table owner. Because
-- the API's `DATABASE_URL` connects as the owner (`postgres`), every policy
-- above would be silently skipped on the raw-SQL path. `FORCE` removes that
-- exemption, so the pg Pool is held to exactly the same tenant rules as a
-- PostgREST request. The seed/reset scripts deliberately set
-- `app.bypass_rls='on'` (see below) to be allowed to do their work.
-- ------------------------------------------------------------------------------
do $$
declare
  t text;
  forced_tables text[] := array[
    'orgs','profiles','teams','feature_grants','leads','lead_stage_history',
    'lead_activities','import_batches','deletion_requests','surveys','price_book',
    'tax_subsidy_config','quotations','payments','installations','documents',
    'targets','report_shares','audit_log','service_tickets','components'
  ];
begin
  foreach t in array forced_tables loop
    execute format('alter table %I force row level security', t);
  end loop;
end $$;


