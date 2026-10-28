#!/usr/bin/env node
/**
 * Root Build Orchestrator for Solar EPC CRM Monorepo
 * 
 * Intelligently targets the required bundle based on the hosting platform:
 * - On Render: Builds the NestJS API application (@solar-crm/api).
 * - On Netlify: Builds the React Vite PWA application (@solar-crm/web) with 4096MB heap limit.
 * - In CI / Local: Builds both applications and audits bundle performance budgets.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const isRender = process.env.RENDER === 'true' || process.env.RENDER === '1';
const isNetlify = process.env.NETLIFY === 'true' || process.env.NETLIFY === '1';

console.log('🏗️  [Build Orchestrator] Starting monorepo build...');
console.log(`ℹ️  Environment: ${isRender ? 'Render' : isNetlify ? 'Netlify' : 'Local / CI'}`);

const exec = (cmd, cwd = rootDir) => {
  console.log(`⚡ Executing: ${cmd} (cwd: ${cwd})`);
  execSync(cmd, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=4096',
    },
  });
};

try {
  if (isRender) {
    // Render only hosts the backend API service
    console.log('🚀 [Render Target] Building @solar-crm/api...');
    exec('npm --workspace=apps/api run build');
    console.log('✅ [Render Target] API build completed successfully.');
  } else if (isNetlify) {
    // Netlify only hosts the frontend client SPA
    console.log('🚀 [Netlify Target] Building @solar-crm/web...');
    exec('node scripts/build-netlify.cjs');
    console.log('✅ [Netlify Target] Web build and staging completed successfully.');
  } else {
    // CI (GitHub Actions) or Local: Build both to guarantee end-to-end integrity
    console.log('🚀 [Full Monorepo Target] Building API and Web applications...');
    exec('npm --workspace=apps/api run build');
    exec('node scripts/build-netlify.cjs');
    console.log('✅ [Full Monorepo Target] All builds and verifications succeeded.');
  }
} catch (error) {
  console.error('❌ [Build Orchestrator] Build failed:', error.message);
  process.exit(1);
}
