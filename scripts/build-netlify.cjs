#!/usr/bin/env node
/**
 * Netlify Production Build Orchestrator for Solar EPC CRM Monorepo
 * 1. Runs @solar-crm/web build with 4096MB V8 heap limit.
 * 2. Synchronizes apps/web/dist artifacts to root /dist directory so that
 *    Netlify finds the publish directory regardless of whether it resolves
 *    relative to the repo root or packagePath.
 * 3. Runs bundle size verification.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const webDir = path.join(rootDir, 'apps', 'web');
const webDistDir = path.join(webDir, 'dist');
const rootDistDir = path.join(rootDir, 'dist');

console.log('🚀 [Netlify Build] Starting production build for @solar-crm/web...');

// Execute the web build runner
execSync('node scripts/build.cjs', {
  cwd: webDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: '--max-old-space-size=4096'
  }
});

// Verify build artifacts
if (!fs.existsSync(webDistDir) || !fs.existsSync(path.join(webDistDir, 'index.html'))) {
  console.error('❌ [Netlify Build] Build output missing from apps/web/dist!');
  process.exit(1);
}

// Copy apps/web/dist to root /dist and nested paths for Netlify publish
console.log('📦 [Netlify Build] Synchronizing build artifacts for Netlify publish...');
try {
  if (fs.existsSync(rootDistDir)) {
    fs.rmSync(rootDistDir, { recursive: true, force: true });
  }
  fs.cpSync(webDistDir, rootDistDir, { recursive: true });

  const nestedWebDistDir = path.join(webDir, 'apps', 'web', 'dist');
  if (fs.existsSync(nestedWebDistDir)) {
    fs.rmSync(nestedWebDistDir, { recursive: true, force: true });
  }
  fs.mkdirSync(path.dirname(nestedWebDistDir), { recursive: true });
  fs.cpSync(webDistDir, nestedWebDistDir, { recursive: true });

  console.log('✅ [Netlify Build] Copied dist to root /dist and nested paths successfully.');
} catch (copyErr) {
  console.warn('⚠️ [Netlify Build] Warning syncing dist:', copyErr.message);
}

// Run bundle size audit
console.log('📊 [Netlify Build] Auditing bundle sizes...');
try {
  execSync('node scripts/check-bundle-size.cjs', {
    cwd: webDir,
    stdio: 'inherit',
    env: process.env
  });
} catch (err) {
  console.warn('⚠️ Bundle audit reported warning:', err.message);
}

console.log('🎉 [Netlify Build] Production build and artifact staging completed successfully!');
