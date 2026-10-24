import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Governance invariant: every feature key in the registry is actually enforced.
 *
 * The audit (AUDIT.md step 5) found flags that the Super Admin could toggle in
 * the matrix but which gated nothing, so the admin UI lied. This test fails the
 * build if a registry key has neither a `@RequireFeature` decorator nor an
 * explicit service-level enforcement (tracked in ENFORCED_IN_SERVICE).
 */

const ENFORCED_IN_SERVICE = new Set([
  // Checked by LeadsService.assertVisible/visibilityFilter rather than a route
  // decorator, because it widens row visibility instead of gating a route.
  'telecalling',
]);

function walk(dir: string, ext: string): string[] {
  let out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p, ext));
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}

describe('Feature registry coverage', () => {
  it('every registry feature key is gated by a route or enforced in a service', () => {
    const seed = readFileSync(join(process.cwd(), '..', '..', 'supabase', 'seed.sql'), 'utf8');

    // Feature registry rows look like `  ('leads', 'Lead Pipeline ...`
    const registryBlock = seed.match(
      /insert into features \(key, label, description\) values([\s\S]*?);/,
    );
    expect(registryBlock).not.toBeNull();

    const registry = [...(registryBlock?.[1] || '').matchAll(/\(\s*'([a-z_]+)'\s*,/g)].map(
      (m) => m[1],
    );
    expect(registry.length).toBeGreaterThan(0);

    const used = new Set<string>();
    for (const f of walk(join(process.cwd(), 'src'), '.ts')) {
      const t = readFileSync(f, 'utf8');
      for (const m of t.matchAll(/RequireFeature\(['"]([a-z_]+)['"]\)/g)) used.add(m[1]);
    }

    const unenforced = registry.filter((k) => !used.has(k) && !ENFORCED_IN_SERVICE.has(k));
    expect(unenforced).toEqual([]);
  });
});
