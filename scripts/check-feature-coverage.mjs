import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function walk(d) {
  let r = [];
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) r = r.concat(walk(p));
    else if (e.name.endsWith('.ts')) r.push(p);
  }
  return r;
}

const used = new Set();
for (const f of walk('apps/api/src')) {
  const t = readFileSync(f, 'utf8');
  for (const m of t.matchAll(/RequireFeature\(['"]([a-z_]+)['"]\)/g)) used.add(m[1]);
}

const registry = [
  'leads', 'telecalling', 'bulk_import', 'export_excel', 'export_pdf', 'quotation',
  'payments', 'survey', 'installation', 'subsidy', 'reports', 'report_share',
  'kpi_dashboard', 'service_tickets', 'whatsapp',
];

// Keys that are enforced inside a service (data-scoping), not by a route
// decorator. `telecalling` grants whole-pool lead access and is checked by
// LeadsService.assertVisible/visibilityFilter via FeatureGuard.resolveFeatureFlag.
const SERVICE_ENFORCED = new Set(['telecalling']);

const missing = registry.filter((k) => !used.has(k) && !SERVICE_ENFORCED.has(k));

console.log(`USED in guards (${used.size}): ${[...used].sort().join(', ')}`);
console.log('');
if (missing.length === 0) {
  console.log('OK — every registry feature is either route-guarded or service-enforced.');
  console.log(`Service-enforced (no route decorator): ${[...SERVICE_ENFORCED].join(', ')}`);
} else {
  console.log('NO ENDPOINT (flag in registry but nothing enforces/gates it):');
  for (const k of missing) console.log(`  - ${k}`);
}
process.exit(missing.length === 0 ? 0 : 1);
