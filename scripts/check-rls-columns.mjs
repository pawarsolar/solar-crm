import { readFileSync } from 'node:fs';

/**
 * Static consistency check for the RLS migration.
 *
 * Catches the class of bug where a table is given an `org_id`-based policy but
 * has no `org_id` column (which makes `create policy` fail outright), and the
 * mirror case where a tenant table ends up with `FORCE ROW LEVEL SECURITY` but
 * no policy at all (deny-all for every request).
 */
const sql = readFileSync('supabase/migrations/20261020000000_init_schema.sql', 'utf8');

// 1. Tables created, with their column names.
const created = new Map();
for (const m of sql.matchAll(/create table if not exists (\w+)\s*\(([\s\S]*?)\n\);/g)) {
  const cols = [];
  for (const line of m[2].split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('--')) continue;
    if (/^(primary key|unique|foreign key|check|constraint|exclude)\b/i.test(t)) continue;
    const c = t.match(/^([a-z_][a-z0-9_]*)\s+/i);
    if (c) cols.push(c[1]);
  }
  created.set(m[1], cols);
}

// 2. Tables in the org_id policy loop (`tenant_tables text[] := array[...]`).
const orgLoop = sql.match(/tenant_tables text\[\] := array\[([\s\S]*?)\];/);
const orgPolicyTables = [...(orgLoop?.[1] || '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);

// 3. Tables that get FORCE ROW LEVEL SECURITY.
const forced = sql.match(/forced_tables text\[\] := array\[([\s\S]*?)\];/);
const forcedTables = [...(forced?.[1] || '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);

let problems = 0;

console.log('1) org_id policy loop vs actual columns');
for (const t of orgPolicyTables) {
  const cols = created.get(t);
  if (!cols) {
    console.log(`   !! ${t}: table not created in this migration`);
    problems++;
  } else if (!cols.includes('org_id')) {
    console.log(`   !! ${t}: no org_id column (has: ${cols.join(', ')})`);
    problems++;
  }
}
if (!problems) console.log('   ok — every table in the loop has org_id');

console.log('\n2) FORCE RLS tables exist');
for (const t of forcedTables) {
  if (!created.has(t)) {
    console.log(`   !! ${t}: table not created in this migration`);
    problems++;
  }
}
if (!problems) console.log('   ok — all forced tables exist');

console.log('\n3) every tenant table has at least one policy');
const policyTargets = new Set(
  [...sql.matchAll(/create policy "[^"]+" on (\w+)/g)].map((m) => m[1]),
);
// Tables covered by a dynamic `foreach ... execute format('create policy ... on %I')` loop.
const dynamicLoops = [...sql.matchAll(/(\w+)_tables text\[\] := array\[([\s\S]*?)\];/g)];
const loopCovered = new Set();
for (const [, , body] of dynamicLoops) {
  for (const m of body.matchAll(/'([a-z_]+)'/g)) loopCovered.add(m[1]);
}
for (const t of forcedTables) {
  if (!policyTargets.has(t) && !loopCovered.has(t)) {
    console.log(`   !! ${t}: FORCE RLS but no policy -> deny-all`);
    problems++;
  }
}
if (!problems) console.log('   ok — no deny-all tenant table');

console.log(`\n${problems === 0 ? 'PASS' : `FAIL (${problems} problem(s))`}`);
process.exit(problems === 0 ? 0 : 1);
