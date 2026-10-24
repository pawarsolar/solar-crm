-- ==============================================================================
-- Solar EPC CRM — Master Seed Script (Kyros Solar Solutions)
-- ==============================================================================
--
-- REQUIRES `app.bypass_rls = 'on'` on the seeding connection. The tables have
-- `FORCE ROW LEVEL SECURITY` and the seed declares its own org_id, so without
-- the bypass every INSERT below is denied. `npm run seed` / `npm run seed:reset`
-- set the flag automatically (see apps/api/src/scripts/{seed,reset}.ts).

-- 1. Master Organization
insert into orgs (id, name, created_at)
values ('11111111-1111-1111-1111-111111111111', 'Kyros Solar Solutions Pvt Ltd', now())
on conflict (id) do nothing;

-- 2. Master Features Registry
insert into features (key, label, description) values
  ('leads', 'Lead Pipeline Management', 'Access and update customer inquiries'),
  ('bulk_import', 'Bulk CSV / Excel Import', 'Import and rule-based allocate customer lists'),
  ('export_excel', 'Excel Pipeline Export', 'Export pipeline data into .xlsx sheets'),
  ('export_pdf', 'PDF Pipeline Export', 'Download formatted management reports'),
  ('quotation', 'Quotation Engine & PDF', 'Generate system proposals with PM Surya Ghar subsidy'),
  ('payments', 'Payment & Milestone Tracker', 'Record customer advances and milestone receipts'),
  ('survey', 'Technical Site Survey', 'Assess roof area, shadow analysis, and electrical load'),
  ('installation', 'Project Installation Tracking', 'Track physical execution and net-metering status'),
  ('subsidy', 'Subsidy & Tax Configuration', 'Manage PM Surya Ghar slabs and GST parameters'),
  ('reports', 'Reports & Business Analytics', 'Comprehensive performance metrics and P&L indicators'),
  ('report_share', 'Secure Link Sharing', 'Create expiring tokenized read-only report links'),
  ('kpi_dashboard', 'KPI Dashboard', 'Real-time performance boards and funnel analysis'),
  ('telecalling', 'Telecalling & Call Queue', 'Work the inbound call pool and log call outcomes (grantable per role/user)'),
  ('service_tickets', 'Post-commissioning AMC', 'Service tickets and maintenance requests'),
  ('whatsapp', 'WhatsApp Automation', 'Direct messaging and automated notifications')
on conflict (key) do nothing;

-- 3. Profiles (6 Roles)
insert into profiles (id, org_id, full_name, email, phone, role, is_active) values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Kishan', 'admin@kyrossolar.com', '+919820100001', 'super_admin', true),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Vikram Deshmukh', 'sales.lead@kyrossolar.com', '+919820100002', 'sales_admin', true),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Sneha Patil', 'telecaller1@kyrossolar.com', '+919820100003', 'telecaller', true),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 'Amit Kulkarni', 'telecaller2@kyrossolar.com', '+919820100004', 'telecaller', true),
  ('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111', 'Rohan Mehta', 'exec1@kyrossolar.com', '+919820100005', 'sales_exec', true),
  ('22222222-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111111', 'Pooja Joshi', 'exec2@kyrossolar.com', '+919820100006', 'sales_exec', true),
  ('22222222-2222-2222-2222-222222222227', '11111111-1111-1111-1111-111111111111', 'Sachin Shinde', 'surveyor1@kyrossolar.com', '+919820100007', 'surveyor', true),
  ('22222222-2222-2222-2222-222222222228', '11111111-1111-1111-1111-111111111111', 'Ganesh Pawar', 'installer1@kyrossolar.com', '+919820100008', 'installer', true),
  ('22222222-2222-2222-2222-222222222229', '11111111-1111-1111-1111-111111111111', 'Meera Iyer', 'accounts@kyrossolar.com', '+919820100009', 'accounts', true)
on conflict (id) do nothing;

-- 4. Teams
insert into teams (id, org_id, name, lead_id) values
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Pune Metro Rooftop', '22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Mumbai Commercial C&I', '22222222-2222-2222-2222-222222222225')
on conflict (id) do nothing;

update profiles set team_id = '33333333-3333-3333-3333-333333333331' where id in ('22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222225');
update profiles set team_id = '33333333-3333-3333-3333-333333333332' where id in ('22222222-2222-2222-2222-222222222226', '22222222-2222-2222-2222-222222222227');

-- 5. Role Default Feature Grants
-- Full 14-flag registry x 7 roles. The Super Admin can flip any of these at
-- runtime from Admin -> Feature Permissions Matrix (PUT /features/grants), and can
-- additionally grant a single user extra access with scope = 'user' (e.g. a
-- sales_exec who is also allowed to telecall): see supabase/migration note below.
insert into feature_grants (org_id, scope, scope_value, feature_key, enabled) values
  -- Super Admin: everything
  ('11111111-1111-1111-1111-111111111111','role','super_admin','leads',true),
  ('11111111-1111-1111-1111-111111111111','role','super_admin','telecalling',true),
  ('11111111-1111-1111-1111-111111111111','role','super_admin','bulk_import',true),
  ('11111111-1111-1111-1111-111111111111','role','super_admin','export_excel',true),
  ('11111111-1111-1111-1111-111111111111','role','super_admin','export_pdf',true),
  ('11111111-1111-1111-1111-111111111111','role','super_admin','quotation',true),
  ('11111111-1111-1111-1111-111111111111','role','super_admin','payments',true),
  ('11111111-1111-1111-1111-111111111111','role','super_admin','survey',true),
  ('11111111-1111-1111-1111-111111111111','role','super_admin','installation',true),
  ('11111111-1111-1111-1111-111111111111','role','super_admin','subsidy',true),
  ('11111111-1111-1111-1111-111111111111','role','super_admin','reports',true),
  ('11111111-1111-1111-1111-111111111111','role','super_admin','report_share',true),
  ('11111111-1111-1111-1111-111111111111','role','super_admin','kpi_dashboard',true),
  ('11111111-1111-1111-1111-111111111111','role','super_admin','service_tickets',true),
  ('11111111-1111-1111-1111-111111111111','role','super_admin','whatsapp',true),
  -- Sales Admin: full pipeline owner (no report_share/subscription settings by default)
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','leads',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','telecalling',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','bulk_import',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','export_excel',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','export_pdf',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','quotation',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','payments',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','survey',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','installation',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','subsidy',false),
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','reports',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','report_share',false),
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','kpi_dashboard',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','service_tickets',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_admin','whatsapp',true),
  -- Telecaller: pipeline + calls, no money, no exports
  ('11111111-1111-1111-1111-111111111111','role','telecaller','leads',true),
  ('11111111-1111-1111-1111-111111111111','role','telecaller','telecalling',true),
  ('11111111-1111-1111-1111-111111111111','role','telecaller','bulk_import',false),
  ('11111111-1111-1111-1111-111111111111','role','telecaller','export_excel',false),
  ('11111111-1111-1111-1111-111111111111','role','telecaller','export_pdf',false),
  ('11111111-1111-1111-1111-111111111111','role','telecaller','quotation',false),
  ('11111111-1111-1111-1111-111111111111','role','telecaller','payments',false),
  ('11111111-1111-1111-1111-111111111111','role','telecaller','survey',false),
  ('11111111-1111-1111-1111-111111111111','role','telecaller','installation',false),
  ('11111111-1111-1111-1111-111111111111','role','telecaller','subsidy',false),
  ('11111111-1111-1111-1111-111111111111','role','telecaller','reports',false),
  ('11111111-1111-1111-1111-111111111111','role','telecaller','report_share',false),
  ('11111111-1111-1111-1111-111111111111','role','telecaller','kpi_dashboard',true),
  ('11111111-1111-1111-1111-111111111111','role','telecaller','service_tickets',false),
  ('11111111-1111-1111-1111-111111111111','role','telecaller','whatsapp',true),
  -- Sales Exec: owns the deal (leads, quotes, surveys) - payments must be granted explicitly
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','leads',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','telecalling',false),
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','bulk_import',false),
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','export_excel',false),
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','export_pdf',false),
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','quotation',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','payments',false),
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','survey',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','installation',false),
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','subsidy',false),
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','reports',false),
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','report_share',false),
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','kpi_dashboard',true),
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','service_tickets',false),
  ('11111111-1111-1111-1111-111111111111','role','sales_exec','whatsapp',true),
  -- Surveyor: surveys only, read-only pipeline
  ('11111111-1111-1111-1111-111111111111','role','surveyor','leads',true),
  ('11111111-1111-1111-1111-111111111111','role','surveyor','telecalling',false),
  ('11111111-1111-1111-1111-111111111111','role','surveyor','bulk_import',false),
  ('11111111-1111-1111-1111-111111111111','role','surveyor','export_excel',false),
  ('11111111-1111-1111-1111-111111111111','role','surveyor','export_pdf',false),
  ('11111111-1111-1111-1111-111111111111','role','surveyor','quotation',false),
  ('11111111-1111-1111-1111-111111111111','role','surveyor','payments',false),
  ('11111111-1111-1111-1111-111111111111','role','surveyor','survey',true),
  ('11111111-1111-1111-1111-111111111111','role','surveyor','installation',false),
  ('11111111-1111-1111-1111-111111111111','role','surveyor','subsidy',false),
  ('11111111-1111-1111-1111-111111111111','role','surveyor','reports',false),
  ('11111111-1111-1111-1111-111111111111','role','surveyor','report_share',false),
  ('11111111-1111-1111-1111-111111111111','role','surveyor','kpi_dashboard',true),
  ('11111111-1111-1111-1111-111111111111','role','surveyor','service_tickets',false),
  ('11111111-1111-1111-1111-111111111111','role','surveyor','whatsapp',false),
  -- Installer: execution + after-sales
  ('11111111-1111-1111-1111-111111111111','role','installer','leads',true),
  ('11111111-1111-1111-1111-111111111111','role','installer','telecalling',false),
  ('11111111-1111-1111-1111-111111111111','role','installer','bulk_import',false),
  ('11111111-1111-1111-1111-111111111111','role','installer','export_excel',false),
  ('11111111-1111-1111-1111-111111111111','role','installer','export_pdf',false),
  ('11111111-1111-1111-1111-111111111111','role','installer','quotation',false),
  ('11111111-1111-1111-1111-111111111111','role','installer','payments',false),
  ('11111111-1111-1111-1111-111111111111','role','installer','survey',false),
  ('11111111-1111-1111-1111-111111111111','role','installer','installation',true),
  ('11111111-1111-1111-1111-111111111111','role','installer','subsidy',false),
  ('11111111-1111-1111-1111-111111111111','role','installer','reports',false),
  ('11111111-1111-1111-1111-111111111111','role','installer','report_share',false),
  ('11111111-1111-1111-1111-111111111111','role','installer','kpi_dashboard',true),
  ('11111111-1111-1111-1111-111111111111','role','installer','service_tickets',true),
  ('11111111-1111-1111-1111-111111111111','role','installer','whatsapp',false),
  -- Accounts: money, reports, exports - no pipeline mutations, no quotes
  ('11111111-1111-1111-1111-111111111111','role','accounts','leads',false),
  ('11111111-1111-1111-1111-111111111111','role','accounts','telecalling',false),
  ('11111111-1111-1111-1111-111111111111','role','accounts','bulk_import',false),
  ('11111111-1111-1111-1111-111111111111','role','accounts','export_excel',true),
  ('11111111-1111-1111-1111-111111111111','role','accounts','export_pdf',true),
  ('11111111-1111-1111-1111-111111111111','role','accounts','quotation',false),
  ('11111111-1111-1111-1111-111111111111','role','accounts','payments',true),
  ('11111111-1111-1111-1111-111111111111','role','accounts','survey',false),
  ('11111111-1111-1111-1111-111111111111','role','accounts','installation',false),
  ('11111111-1111-1111-1111-111111111111','role','accounts','subsidy',true),
  ('11111111-1111-1111-1111-111111111111','role','accounts','reports',true),
  ('11111111-1111-1111-1111-111111111111','role','accounts','report_share',false),
  ('11111111-1111-1111-1111-111111111111','role','accounts','kpi_dashboard',true),
  ('11111111-1111-1111-1111-111111111111','role','accounts','service_tickets',false),
  ('11111111-1111-1111-1111-111111111111','role','accounts','whatsapp',true)
on conflict do nothing;

-- 5b. Sample per-user overrides (scope = 'user').
-- Demonstrates the requirement "a sales exec who is also allowed to telecall" and
-- "a telecaller promoted to see payments" - managed at runtime by the Super Admin.
insert into feature_grants (org_id, scope, scope_value, feature_key, enabled) values
  -- Rohan Mehta (exec1): also doing telecalling shifts
  ('11111111-1111-1111-1111-111111111111','user','22222222-2222-2222-2222-222222222225','telecalling',true),
  -- Pooja Joshi (exec2): allowed to record booking payments
  ('11111111-1111-1111-1111-111111111111','user','22222222-2222-2222-2222-222222222226','payments',true),
  -- Sneha Patil (telecaller1): senior caller, may export her list
  ('11111111-1111-1111-1111-111111111111','user','22222222-2222-2222-2222-222222222223','export_excel',true)
on conflict do nothing;

-- 6. Price Book (Benchmark residential & commercial ₹/kW)
insert into price_book (org_id, kw, system_type, tier, base_price) values
  ('11111111-1111-1111-1111-111111111111', 1.0, 'on-grid', 'premium', 65000),
  ('11111111-1111-1111-1111-111111111111', 2.0, 'on-grid', 'premium', 125000),
  ('11111111-1111-1111-1111-111111111111', 3.0, 'on-grid', 'premium', 180000),
  ('11111111-1111-1111-1111-111111111111', 4.0, 'on-grid', 'premium', 230000),
  ('11111111-1111-1111-1111-111111111111', 5.0, 'on-grid', 'premium', 280000),
  ('11111111-1111-1111-1111-111111111111', 6.0, 'on-grid', 'premium', 330000),
  ('11111111-1111-1111-1111-111111111111', 8.0, 'on-grid', 'premium', 430000),
  ('11111111-1111-1111-1111-111111111111', 10.0, 'on-grid', 'premium', 520000)
on conflict do nothing;

-- 7. Tax & Subsidy Configuration (PM Surya Ghar: Muft Bijli Yojana & Blended GST)
insert into tax_subsidy_config (key, value, source_url, verified_on) values
  ('pm_surya_ghar_residential', '{
    "slabs": [
      {"max_kw": 2, "subsidy_per_kw": 30000},
      {"max_kw": 3, "subsidy_per_kw": 18000}
    ],
    "max_subsidy_cap": 78000,
    "disclaimer": "PM Surya Ghar Muft Bijli Yojana subsidy is disbursed directly to beneficiary account after DISCOM net-meter commissioning."
  }'::jsonb, 'https://pmsuryaghar.gov.in', '2026-10-20'),
  ('gst_residential_solar', '{
    "blended_rate_percent": 8.9,
    "supply_portion_percent": 70,
    "supply_gst_percent": 5,
    "service_portion_percent": 30,
    "service_gst_percent": 18,
    "note": "Blended 8.9% effective rate (70% goods @ 5% + 30% services @ 18%). Verify with auditor."
  }'::jsonb, 'https://cbic-gst.gov.in', '2026-10-20')
on conflict (key) do nothing;

-- 8. Seed Realistic Leads (200 sample leads across 17 pipeline stages)
do $$
declare
  stages text[] := array[
    'NEW', 'CONTACTED', 'QUALIFIED', 'SURVEY_SCHEDULED', 'SURVEY_DONE',
    'QUOTATION_SENT', 'NEGOTIATION', 'BOOKED', 'DOCS_COLLECTION', 'SUBSIDY_APPLIED',
    'MATERIAL_PROCUREMENT', 'INSTALLATION', 'NET_METERING', 'COMMISSIONED',
    'FINAL_PAYMENT', 'HANDOVER', 'AMC/SERVICE'
  ];
  sources text[] := array['FB Ads', 'Google Ads', 'WhatsApp Direct', 'Referral', 'Walk-in', 'Web Form'];
  cities text[] := array['Pune', 'Mumbai', 'Nashik', 'Nagpur', 'Aurangabad'];
  owners uuid[] := array[
    '22222222-2222-2222-2222-222222222223'::uuid,
    '22222222-2222-2222-2222-222222222224'::uuid,
    '22222222-2222-2222-2222-222222222225'::uuid,
    '22222222-2222-2222-2222-222222222226'::uuid
  ];
  s text;
  c text;
  st text;
  kw_val numeric;
  val numeric;
  lead_uid uuid;
  i int;
begin
  for i in 1..200 loop
    st := stages[1 + (i % array_length(stages, 1))];
    s := sources[1 + (i % array_length(sources, 1))];
    c := cities[1 + (i % array_length(cities, 1))];
    kw_val := 2 + (i % 8);
    val := kw_val * 55000;

    lead_uid := gen_random_uuid();

    insert into leads (
      id, org_id, name, phone, email, city, state, pincode,
      source, category, monthly_bill, system_kw, stage,
      owner_id, value_estimate, notes, next_followup_at, created_at
    ) values (
      lead_uid,
      '11111111-1111-1111-1111-111111111111',
      'Solar Lead #' || i || ' (' || c || ')',
      '+9198' || lpad((20000000 + i)::text, 8, '0'),
      'lead' || i || '@customer.in',
      c,
      'Maharashtra',
      '4110' || lpad((i % 50)::text, 2, '0'),
      s,
      case when kw_val <= 5 then 'Residential' else 'Commercial' end,
      kw_val * 1400,
      kw_val,
      st,
      owners[1 + (i % array_length(owners, 1))],
      val,
      'Customer interested in ' || kw_val || ' kW rooftop setup with PM Surya Ghar subsidy.',
      now() + ((i % 5) - 2) * interval '1 day',
      now() - (i % 60) * interval '1 day'
    ) on conflict do nothing;

    -- Add stage history
    insert into lead_stage_history (lead_id, from_stage, to_stage, by_user, note, at)
    values (lead_uid, 'NEW', st, owners[1 + (i % array_length(owners, 1))], 'Pipeline progress transition', now() - (i % 10) * interval '1 day');

    -- Insert surveys for leads past survey stage
    if i % 5 = 0 then
      insert into surveys (org_id, lead_id, surveyor_id, scheduled_at, done_at, roof_area_sqft, roof_type, shadow_pct, sanctioned_load_kw, earthing_ok, recommended_kw)
      values (
        '11111111-1111-1111-1111-111111111111',
        lead_uid,
        '22222222-2222-2222-2222-222222222227',
        now() - interval '5 days',
        now() - interval '3 days',
        kw_val * 90 + 50,
        'rcc',
        4.5,
        kw_val + 2,
        true,
        kw_val
      );
    end if;

    -- Insert quotation for leads in QUOTATION_SENT, NEGOTIATION, or BOOKED
    if st in ('QUOTATION_SENT', 'NEGOTIATION', 'BOOKED', 'INSTALLATION', 'COMMISSIONED') then
      insert into quotations (
        org_id, lead_id, number, kw, panel_brand, inverter_brand,
        subtotal, gst, total, subsidy, net_cost, status, created_by
      ) values (
        '11111111-1111-1111-1111-111111111111',
        lead_uid,
        'KS/2026-27/' || lpad(i::text, 4, '0'),
        kw_val,
        'Waaree 540W Bifacial',
        'Growatt 5kW Hybrid',
        val,
        round(val * 0.089, 2),
        round(val * 1.089, 2),
        case when kw_val >= 3 then 78000 when kw_val = 2 then 60000 else 30000 end,
        round(val * 1.089, 2) - case when kw_val >= 3 then 78000 when kw_val = 2 then 60000 else 30000 end,
        case when st = 'BOOKED' then 'accepted' else 'sent' end,
        owners[1 + (i % array_length(owners, 1))]
      ) on conflict do nothing;
    end if;

    -- Insert payments for booked leads
    if st in ('BOOKED', 'INSTALLATION', 'COMMISSIONED') then
      insert into payments (org_id, lead_id, type, amount, due_date, paid_on, mode, ref_no, status)
      values
        ('11111111-1111-1111-1111-111111111111', lead_uid, 'booking', 25000, current_date - 10, current_date - 9, 'UPI', 'UPI-TXN-' || i || '-BK', 'paid'),
        ('11111111-1111-1111-1111-111111111111', lead_uid, 'advance', val * 0.4, current_date - 5, current_date - 3, 'NEFT', 'NEFT-ADV-' || i, 'paid');
    end if;

  end loop;
end $$;

-- 9. Sales Targets for Current Month
insert into targets (org_id, user_id, period, period_start, metric, target) values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222225', '2026-10', '2026-10-01', 'revenue', 2500000),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222226', '2026-10', '2026-10-01', 'revenue', 2000000),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222223', '2026-10', '2026-10-01', 'leads', 80),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222224', '2026-10', '2026-10-01', 'leads', 80)
on conflict do nothing;

-- 10. Components Catalog (searchable)
insert into components (org_id, category, brand, model, specs, price, unit, wattage) values
  -- Solar Panels / Modules
  ('11111111-1111-1111-1111-111111111111','solar_panel','Adani Solar','Adani 540W Bifacial','{"type":"Bifacial Mono PERC","cell":"M10","warranty_years":25}'::jsonb, 11000, 'piece', 540),
  ('11111111-1111-1111-1111-111111111111','solar_panel','Waaree Solar','Waaree 540W Bi-Facial','{"type":"Bifacial Mono PERC","cell":"M10","warranty_years":25}'::jsonb, 10800, 'piece', 540),
  ('11111111-1111-1111-1111-111111111111','solar_panel','Vikram Solar','Vikram Somera 540W','{"type":"Mono PERC","cell":"M10","warranty_years":25}'::jsonb, 10700, 'piece', 540),
  ('11111111-1111-1111-1111-111111111111','solar_panel','Tata Power Solar','Tata Power 540W','{"type":"Mono PERC","cell":"M10","warranty_years":25}'::jsonb, 11200, 'piece', 540),
  ('11111111-1111-1111-1111-111111111111','solar_panel','Kosol Solar','Kosol 550W','{"type":"Mono PERC","cell":"G12","warranty_years":25}'::jsonb, 9800, 'piece', 550),
  ('11111111-1111-1111-1111-111111111111','solar_panel','APS','APS 540W','{"type":"Mono PERC","warranty_years":25}'::jsonb, 9500, 'piece', 540),
  ('11111111-1111-1111-1111-111111111111','solar_panel','Premier Energies','Premier 550W N-Type','{"type":"TOPCon","cell":"G12","warranty_years":25}'::jsonb, 11500, 'piece', 550),
  ('11111111-1111-1111-1111-111111111111','solar_panel','Renew Solar','Renew 540W','{"type":"Mono PERC","warranty_years":25}'::jsonb, 9400, 'piece', 540),
  ('11111111-1111-1111-1111-111111111111','solar_panel','Rays Power','Rays 540W','{"type":"Mono PERC","warranty_years":25}'::jsonb, 9300, 'piece', 540),
  ('11111111-1111-1111-1111-111111111111','solar_panel','Goldi Solar','Goldi 550W Bifacial','{"type":"Bifacial TOPCon","cell":"G12","warranty_years":25}'::jsonb, 11400, 'piece', 550),
  ('11111111-1111-1111-1111-111111111111','solar_panel','Jakson Solar','Jakson 540W','{"type":"Mono PERC","warranty_years":25}'::jsonb, 9600, 'piece', 540),
  -- Solar Inverters
  ('11111111-1111-1111-1111-111111111111','solar_inverter','Microtek','Microtek 5kW On-Grid','{"type":"On-Grid","phases":"Single/Three","warranty_years":10}'::jsonb, 45000, 'piece', null),
  ('11111111-1111-1111-1111-111111111111','solar_inverter','XWatt','XWatt 5kW Hybrid','{"type":"Hybrid","phases":"Single","warranty_years":10}'::jsonb, 52000, 'piece', null),
  ('11111111-1111-1111-1111-111111111111','solar_inverter','Livguard Solar','Livguard 5kW Hybrid','{"type":"Hybrid","phases":"Single","warranty_years":10}'::jsonb, 51000, 'piece', null),
  ('11111111-1111-1111-1111-111111111111','solar_inverter','Havells Solar','Havells 5kW On-Grid','{"type":"On-Grid","phases":"Single/Three","warranty_years":10}'::jsonb, 56000, 'piece', null),
  ('11111111-1111-1111-1111-111111111111','solar_inverter','Solis','Solis 5kW On-Grid','{"type":"On-Grid","phases":"Single","warranty_years":10}'::jsonb, 54000, 'piece', null),
  ('11111111-1111-1111-1111-111111111111','solar_inverter','Growatt','Growatt 5kW Hybrid','{"type":"Hybrid","phases":"Single","warranty_years":10}'::jsonb, 55000, 'piece', null),
  ('11111111-1111-1111-1111-111111111111','solar_inverter','Sungrow','Sungrow 5kW On-Grid','{"type":"On-Grid","phases":"Single/Three","warranty_years":10}'::jsonb, 62000, 'piece', null),
  -- Mounting Structures
  ('11111111-1111-1111-1111-111111111111','mounting_structure','GI Structure','GI Structure (RCC/Tile)','{"material":"Galvanized Iron","type":"RCC Flat Roof / Tile","coating":"Hot Dip"}'::jsonb, 3500, 'per_kw', null),
  ('11111111-1111-1111-1111-111111111111','mounting_structure','HDGI Structure','HDGI Structure (RCC/Tile)','{"material":"Hot Dip Galvanized Iron","type":"RCC Flat Roof / Tin Shed","coating":"HDG"}'::jsonb, 4200, 'per_kw', null),
  ('11111111-1111-1111-1111-111111111111','mounting_structure','JSW','JSW HDGI Mounting Structure','{"material":"JSW Steel","coating":"HDG 80μm"}'::jsonb, 4400, 'per_kw', null),
  ('11111111-1111-1111-1111-111111111111','mounting_structure','Kamdhenu Steel','Kamdhenu Steel Structure','{"material":"Kamdhenu Steel","coating":"Hot Dip Galvanized"}'::jsonb, 3800, 'per_kw', null),
  ('11111111-1111-1111-1111-111111111111','mounting_structure','Tata Structura','Tata Structura Mounting Kit','{"material":"Tata Structura YST","coating":"Hot Dip Galvanized"}'::jsonb, 4800, 'per_kw', null),
  ('11111111-1111-1111-1111-111111111111','mounting_structure','Jindal','Jindal HDGI Structure','{"material":"Jindal Steel","coating":"HDG"}'::jsonb, 4100, 'per_kw', null),
  ('11111111-1111-1111-1111-111111111111','mounting_structure','Everest','Everest GI Structure','{"material":"Everest Steel","coating":"Galvanized"}'::jsonb, 3700, 'per_kw', null),
  ('11111111-1111-1111-1111-111111111111','mounting_structure','EAPL','EAPL Mounting Structure','{"material":"EAPL Steel","coating":"HDG"}'::jsonb, 3900, 'per_kw', null),
  -- Solar Cables
  ('11111111-1111-1111-1111-111111111111','solar_cable','RR Kabel','RR Kabel 4sqmm DC Solar Cable','{"type":"DC Solar Cable","size":"4 sqmm","insulation":"XLPE/PO","standard":"EN 50618"}'::jsonb, 85, 'per_mtr', null),
  ('11111111-1111-1111-1111-111111111111','solar_cable','KEI','KEI 4sqmm DC Solar Cable','{"type":"DC Solar Cable","size":"4 sqmm","insulation":"XLPE","standard":"TUV/EN 50618"}'::jsonb, 88, 'per_mtr', null),
  ('11111111-1111-1111-1111-111111111111','solar_cable','Polycab','Polycab 4sqmm DC Solar Cable','{"type":"DC Solar Cable","size":"4 sqmm","insulation":"XLPE","standard":"EN 50618"}'::jsonb, 84, 'per_mtr', null),
  ('11111111-1111-1111-1111-111111111111','solar_cable','Finolex','Finolex 4sqmm DC Solar Cable','{"type":"DC Solar Cable","size":"4 sqmm","insulation":"XLPE","standard":"EN 50618"}'::jsonb, 82, 'per_mtr', null),
  -- Accessories (Lightning arrestor, Earthing kit)
  ('11111111-1111-1111-1111-111111111111','accessories','Havells','Havells Lightning Arrestor','{"type":"ESE/Conventional Lightning Arrestor","application":"SPV System"}'::jsonb, 4500, 'piece', null),
  ('11111111-1111-1111-1111-111111111111','accessories','Generic','Earthing Kit (GI/Copper)','{"type":"Earthing Kit","includes":"Earth pit, electrode, backfill, clamp","material":"GI/Copper"}'::jsonb, 5500, 'kit', null),
  ('11111111-1111-1111-1111-111111111111','accessories','Polycab','Polycab Earthing Kit','{"type":"Earthing Kit","includes":"Electrode, GI Strip, Chemical Compound","material":"GI"}'::jsonb, 5800, 'kit', null)
on conflict (org_id, category, brand, model) do nothing;
