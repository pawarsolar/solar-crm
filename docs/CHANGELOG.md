# Changelog — Solar EPC CRM

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-20
### Added
- **Core Architecture:**
  - Supabase PostgreSQL schema with 18 core tables and Row Level Security (RLS).
  - NestJS API with low-memory bounds (`--max-old-space-size=256`), Helmet, rate limiting, and compression.
  - React + Vite mobile-first PWA with bottom navigation, responsive sidebar, and offline sync.
- **Pipeline & Leads:**
  - 17-stage solar lifecycle pipeline (`NEW` through `AMC/SERVICE`).
  - Stage transition audit logging with note attachments.
  - Automatic phone deduplication per organization.
  - Streaming CSV/Excel bulk import with anti-formula injection and category-based round-robin distribution.
- **Surveys & Technical Sizing:**
  - Roof area, shadow analysis, sanctioned load, and earthing assessment module.
  - Solar generation and payback calculator (4 kWh/kW/day average generation).
- **Quotations & Payments:**
  - PM Surya Ghar Muft Bijli Yojana subsidy calculator (₹30,000/kW up to 2kW, ₹18,000 for 3rd kW, ₹78,000 cap).
  - Blended residential solar GST calculation (8.9%).
  - Fast, low-memory PDF generation via `pdfmake` with Supabase private storage upload and signed URLs.
  - Milestone payment tracker (Booking, Advance, Milestone, Final) with live outstanding calculation.
- **Security & Governance:**
  - 3-tier hierarchical feature flag resolution (`user override -> role default -> org default`).
  - Two-stage deletion approval workflow (`deletion_requests` -> admin approval -> soft-delete).
  - DPDP Act 2023 compliant consent recording and PII masking on tokenized public share links.
  - Append-only immutable `audit_log`.
- **Dashboards & KPIs:**
  - Real-time SQL views: `v_funnel`, `v_kpi_daily`, `v_team_perf`.
  - Executive company dashboard & personalized salesperson dashboard.
  - Stuck lead aging detection (>7 days in current stage).
- **Offline & PWA:**
  - Service worker caching and offline mutation queue using `idb-keyval`.
  - Automatic reconnection sync.
