#!/usr/bin/env node
/**
 * Production build runner for @solar-crm/web
 * Guarantees 4096MB heap allocation for TypeScript typechecker (tsc) and Vite bundle optimizer,
 * preventing V8 heap exhaustion (error code 134) in CI/CD environments such as Netlify.
 */
const { execSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

// Enforce 4096MB max old space size, overriding any restrictive parent NODE_OPTIONS
const buildEnv = {
  ...process.env,
  NODE_OPTIONS: '--max-old-space-size=4096'
};

// Resolve compilers from locally installed devDependencies. Using `npx tsc` would
// silently download the unrelated `tsc` package from npm if TypeScript is missing.
function resolveBin(pkg, binPath) {
  try {
    const pkgJson = require.resolve(`${pkg}/package.json`, { paths: [projectRoot] });
    return path.join(path.dirname(pkgJson), binPath);
  } catch (err) {
    console.error(`❌ [@solar-crm/web] Could not find "${pkg}". Make sure devDependencies are installed (NODE_ENV must not be "production" during install).`);
    process.exit(1);
  }
}
const tscBin = resolveBin('typescript', 'bin/tsc');
const viteBin = resolveBin('vite', 'bin/vite.js');

console.log('⚡ [@solar-crm/web] Running TypeScript typecheck (heap limit: 4096MB)...');
execSync(`"${process.execPath}" "${tscBin}"`, {
  cwd: projectRoot,
  stdio: 'inherit',
  env: buildEnv
});

console.log('⚡ [@solar-crm/web] Building production bundle with Vite...');
execSync(`"${process.execPath}" "${viteBin}" build`, {
  cwd: projectRoot,
  stdio: 'inherit',
  env: buildEnv
});

console.log('✅ [@solar-crm/web] Production build successfully finished.');

// Mirror dist to monorepo root and nested paths for flexible Netlify publish resolution
try {
  const fs = require('fs');
  const rootDist = path.resolve(projectRoot, '..', '..', 'dist');
  const webDist = path.resolve(projectRoot, 'dist');
  const nestedWebDist = path.resolve(projectRoot, 'apps', 'web', 'dist');

  if (fs.existsSync(webDist)) {
    // 1. Mirror to monorepo root /dist
    if (fs.existsSync(rootDist)) {
      fs.rmSync(rootDist, { recursive: true, force: true });
    }
    fs.cpSync(webDist, rootDist, { recursive: true });
    console.log('📦 [@solar-crm/web] Mirrored dist artifacts to root /dist.');

    // 2. Mirror to apps/web/apps/web/dist for nested resolution
    if (fs.existsSync(nestedWebDist)) {
      fs.rmSync(nestedWebDist, { recursive: true, force: true });
    }
    fs.mkdirSync(path.dirname(nestedWebDist), { recursive: true });
    fs.cpSync(webDist, nestedWebDist, { recursive: true });
    console.log('📦 [@solar-crm/web] Mirrored dist artifacts to apps/web/apps/web/dist.');
  }
} catch (mirrorErr) {
  // Ignore in isolated environments
}
