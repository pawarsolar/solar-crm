# Performance Budget & Benchmark Targets — Solar EPC CRM

## 1. Frontend Performance Budget (<2s load time)
- **Initial JS Bundle:** ≤ 170 KB gzipped.
  - Chunk splitting: React vendor, UI vendor, Recharts lazy-loaded, Route components dynamic `React.lazy`.
- **Lighthouse Performance Score:** ≥ 90 / 100.
- **Largest Contentful Paint (LCP):** < 2.0s on simulated 4G mobile.
- **Cumulative Layout Shift (CLS):** < 0.1.
- **Font Stack:** Modern system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`) for zero layout thrash and 0 KB network font weight.
- **Service Worker (PWA):** `vite-plugin-pwa` caching shell assets, UI styles, and static scripts.

## 2. Backend & Database Performance Targets
- **Memory Footprint:** Node process runs bounded to `--max-old-space-size=256` (max 256 MB RAM).
- **API Latency (p95):** < 300 ms for all standard paginated list and CRUD operations.
- **PDF Generation:** Handled by stream-based `pdfmake` (peak memory < 20 MB vs Puppeteer 300 MB).
- **Excel Export/Import:** Handled by streaming `exceljs` parser/writer.
- **Database Indexing:**
  - `idx_leads_org_stage`: `(org_id, stage) WHERE deleted_at IS NULL`
  - `idx_leads_owner_followup`: `(owner_id, next_followup_at) WHERE deleted_at IS NULL`
  - `idx_leads_org_created`: `(org_id, created_at DESC)`
- **Aggregation:** KPI views (`v_funnel`, `v_kpi_daily`, `v_team_perf`) prevent in-memory Node aggregations.
