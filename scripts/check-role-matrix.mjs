import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Consistency check for the role/feature mapping (AUDIT.md §4b).
 *
 * Three places encode the same intent and can silently drift:
 *   1. `supabase/seed.sql`      — the authoritative role grant matrix (DB).
 *   2. `auth.service.ts`        — `FALLBACK_ROLE_FEATURES`, used when the DB is down.
 *   3. `@RequireFeature` + `@Roles` on controllers — what the API actually allows.
 *
 * Drift is a real bug: the admin matrix would show a feature as granted while the
 * API still refuses, or vice versa. This script fails when that happens.
 */

const ROLES = [
  'super_admin',
  'sales_admin',
  'telecaller',
  'sales_exec',
  'surveyor',
  'installer',
  'accounts',
];

function walk(dir) {
  let out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------- seed matrix
const seed = readFileSync('supabase/seed.sql', 'utf8');
const seedBlock = seed.match(
  /insert into feature_grants \(org_id, scope, scope_value, feature_key, enabled\) values([\s\S]*?);/,
);
if (!seedBlock) {
  console.error('FAIL: could not find the role grant matrix in supabase/seed.sql');
  process.exit(1);
}

const seedMatrix = {}; // seedMatrix[role][feature] = boolean
for (const m of seedBlock[1].matchAll(
  /\(\s*'[0-9a-f-]+'\s*,\s*'role'\s*,\s*'([a-z_]+)'\s*,\s*'([a-z_]+)'\s*,\s*(true|false)\s*\)/g,
)) {
  const [, role, feature, enabled] = m;
  (seedMatrix[role] ||= {})[feature] = enabled === 'true';
}

// ------------------------------------------------- ------------ fallback matrix
const authSrc = readFileSync('apps/api/src/modules/auth/auth.service.ts', 'utf8');
const fallbackBlock = authSrc.match(
  /const FALLBACK_ROLE_FEATURES: Record<string, Record<string, boolean>> = \{([\s\S]*?)\n\};/,
);
if (!fallbackBlock) {
  console.error('FAIL: could not find FALLBACK_ROLE_FEATURES in auth.service.ts');
  process.exit(1);
}

const fallbackMatrix = {};
// super_admin: featureSet(ALL_FEATURES)  -> everything the seed grants
fallbackMatrix.super_admin = {};
for (const m of fallbackBlock[1].matchAll(/(\w+):\s*featureSet\(([\s\S]*?)\)/g)) {
  const role = m[1];
  if (role === 'super_admin' && /ALL_FEATURES/.test(m[2])) continue;
  const features = [...m[2].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
  const set = new Set(features);
  fallbackMatrix[role] = {};
  for (const f of Object.keys(seedMatrix.super_admin || {})) {
    fallbackMatrix[role][f] = set.has(f);
  }
}

let problems = 0;

console.log('1) fallback map vs seed role matrix');
for (const role of ROLES) {
  if (role === 'super_admin') continue;
  const seedRole = seedMatrix[role] || {};
  const fb = fallbackMatrix[role];
  if (!fb) {
    console.log(`   !! ${role}: missing from FALLBACK_ROLE_FEATURES`);
    problems++;
    continue;
  }
  for (const feature of Object.keys(seedRole)) {
    if (seedRole[feature] !== fb[feature]) {
      console.log(
        `   !! ${role}.${feature}: seed=${seedRole[feature]} fallback=${fb[feature]}`,
      );
      problems++;
    }
  }
}
if (!problems) console.log('   ok — offline fallback matches the seeded grants');

// -------------------------------------------------- routes vs granted features
console.log('\n2) routes gated by a feature no role is granted');
const controllers = walk('apps/api/src/modules').filter((f) => f.endsWith('.controller.ts'));
const grantedAnywhere = new Set();
for (const role of Object.keys(seedMatrix)) {
  for (const [feature, enabled] of Object.entries(seedMatrix[role])) {
    if (enabled) grantedAnywhere.add(feature);
  }
}

const featureOnRoute = new Set();
for (const f of controllers) {
  const t = readFileSync(f, 'utf8');
  for (const m of t.matchAll(/RequireFeature\(['"]([a-z_]+)['"]\)/g)) featureOnRoute.add(m[1]);
}

for (const feature of featureOnRoute) {
  if (!grantedAnywhere.has(feature)) {
    console.log(`   !! '${feature}' gates a route but no role is granted it`);
    problems++;
  }
}
if (!problems) console.log('   ok — every route-gating feature is granted to someone');

// ------------------------------------ service-enforced features must be granted
console.log('\n3) service-enforced features are granted (telecalling)');
if (!grantedAnywhere.has('telecalling')) {
  console.log("   !! 'telecalling' is enforced in LeadsService but granted to nobody");
  problems++;
} else {
  const holders = ROLES.filter((r) => seedMatrix[r]?.telecalling);
  console.log(`   ok — granted to: ${holders.join(', ')}`);
}

console.log(`\n${problems === 0 ? 'PASS' : `FAIL (${problems} problem(s))`}`);
process.exit(problems === 0 ? 0 : 1);
