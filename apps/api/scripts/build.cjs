#!/usr/bin/env node
/**
 * Production build runner for @solar-crm/api
 * Resolves @nestjs/cli locally and compiles the NestJS backend safely.
 * Guarantees that even if NODE_ENV=production was set during initial install,
 * required build dependencies are detected and installed.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const apiRoot = path.resolve(__dirname, '..');
const rootDir = path.resolve(apiRoot, '../..');

function resolveNestBin() {
  const candidateRoots = [apiRoot, rootDir];
  for (const cRoot of candidateRoots) {
    try {
      const pkgJson = require.resolve('@nestjs/cli/package.json', { paths: [cRoot] });
      const bin = path.join(path.dirname(pkgJson), 'bin', 'nest.js');
      if (fs.existsSync(bin)) {
        return bin;
      }
    } catch {}
  }
  return null;
}

let nestBin = resolveNestBin();

if (!nestBin) {
  console.log('⚡ [@solar-crm/api] @nestjs/cli not found. Installing with --include=dev...');
  try {
    execSync('npm install --include=dev', {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development', // Temporarily unset production during install
      },
    });
    nestBin = resolveNestBin();
  } catch (err) {
    console.error('⚠️ [@solar-crm/api] npm install --include=dev warning:', err.message);
  }
}

if (!nestBin) {
  console.error('❌ [@solar-crm/api] Could not locate @nestjs/cli binary. Exiting.');
  process.exit(1);
}

console.log(`⚡ [@solar-crm/api] Compiling NestJS application using ${nestBin}...`);
execSync(`"${process.execPath}" "${nestBin}" build`, {
  cwd: apiRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=400',
  },
});

const distMain = path.join(apiRoot, 'dist', 'main.js');
if (!fs.existsSync(distMain)) {
  console.error('❌ [@solar-crm/api] Compilation completed but dist/main.js was not generated!');
  process.exit(1);
}

console.log('✅ [@solar-crm/api] API production build successfully generated.');
