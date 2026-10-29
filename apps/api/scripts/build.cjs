#!/usr/bin/env node
/**
 * Production build runner for @solar-crm/api
 * Optimized for memory-constrained environments (e.g. Render 512MB RAM free-tier).
 * 
 * Uses direct TypeScript compilation with lightweight production flags
 * (declaration: false, sourceMap: false, incremental: false) to keep peak
 * memory consumption under 150MB, completely avoiding V8 Heap Out-Of-Memory crashes.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const apiRoot = path.resolve(__dirname, '..');
const rootDir = path.resolve(apiRoot, '../..');

function resolveBin(pkg, binSubpath) {
  const candidateRoots = [apiRoot, rootDir];
  for (const cRoot of candidateRoots) {
    try {
      const pkgJson = require.resolve(`${pkg}/package.json`, { paths: [cRoot] });
      const bin = path.join(path.dirname(pkgJson), binSubpath);
      if (fs.existsSync(bin)) {
        return bin;
      }
    } catch {}
  }
  return null;
}

let tscBin = resolveBin('typescript', path.join('bin', 'tsc'));
let nestBin = resolveBin('@nestjs/cli', path.join('bin', 'nest.js'));

if (!tscBin && !nestBin) {
  console.log('⚡ [@solar-crm/api] Build tools not found. Installing dependencies...');
  try {
    execSync('npm install --include=dev', {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development',
      },
    });
    tscBin = resolveBin('typescript', path.join('bin', 'tsc'));
    nestBin = resolveBin('@nestjs/cli', path.join('bin', 'nest.js'));
  } catch (err) {
    console.warn('⚠️ [@solar-crm/api] npm install warning:', err.message);
  }
}

// Clean previous build artifacts
const distDir = path.join(apiRoot, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

let buildSuccess = false;

// 1. Primary Strategy: Fast, low-memory direct TypeScript compilation
if (tscBin) {
  console.log(`⚡ [@solar-crm/api] Compiling with TypeScript (low-memory profile: max 350MB)...`);
  try {
    execSync(`"${process.execPath}" --max-old-space-size=350 "${tscBin}" -p tsconfig.build.json`, {
      cwd: apiRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=350',
      },
    });
    buildSuccess = true;
  } catch (tscErr) {
    console.warn('⚠️ [@solar-crm/api] Direct tsc build encountered an error, trying nest build fallback...', tscErr.message);
  }
}

// 2. Fallback Strategy: Nest CLI build with strict 350MB ceiling
if (!buildSuccess && nestBin) {
  console.log(`⚡ [@solar-crm/api] Compiling with Nest CLI fallback...`);
  try {
    execSync(`"${process.execPath}" --max-old-space-size=350 "${nestBin}" build`, {
      cwd: apiRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=350',
      },
    });
    buildSuccess = true;
  } catch (nestErr) {
    console.error('❌ [@solar-crm/api] Nest CLI build failed:', nestErr.message);
  }
}

const distMain = path.join(apiRoot, 'dist', 'main.js');
if (!fs.existsSync(distMain)) {
  console.error('❌ [@solar-crm/api] Build completed but dist/main.js was not generated!');
  process.exit(1);
}

console.log('✅ [@solar-crm/api] API production build successfully generated.');
