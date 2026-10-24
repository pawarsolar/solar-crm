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

console.log('⚡ [@solar-crm/web] Running TypeScript typecheck (heap limit: 4096MB)...');
execSync('npx tsc', {
  cwd: projectRoot,
  stdio: 'inherit',
  env: buildEnv
});

console.log('⚡ [@solar-crm/web] Building production bundle with Vite...');
execSync('npx vite build', {
  cwd: projectRoot,
  stdio: 'inherit',
  env: buildEnv
});

console.log('✅ [@solar-crm/web] Production build successfully finished.');
