# SEO, Meta, & PWA Manifest Specification — Solar EPC CRM

## 1. Meta Standards
- **Page Title:** Max 60 characters: `Solar EPC CRM | Kyros Solar Pipeline & Quotation Platform`
- **Meta Description:** Max 155 characters: `Mobile-first Solar EPC CRM for rooftop solar contractors: pipeline management, PM Surya Ghar subsidy calculations, site surveys, and payment tracking.`
- **Canonical URL:** Configured on root index.
- **Robots Directives:**
  - Public routes (`/login`, `/public/reports/:token`): `index, follow`
  - Internal authenticated application routes (`/leads`, `/quotations`, `/admin`): `noindex, nofollow` via meta robots tag and `public/robots.txt`.

## 2. Favicons & PWA Assets
- `favicon.ico`: Standard 32x32 legacy browser icon.
- `favicon-32.png`: High-DPI browser tab icon.
- `apple-touch-icon-180.png`: iOS home-screen bookmark icon.
- `icon-192.png`: PWA manifest icon (Android home screen).
- `icon-512.png`: PWA splash screen & Windows store badge.
- `maskable-icon-512.png`: Android adaptive icon with safe area padding.
- `manifest.webmanifest`: Standalone display, theme color `#0f172a`, background `#ffffff`.
