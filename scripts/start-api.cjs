const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.RENDER === 'true' ||
  process.env.RENDER === '1';

const rootDir = path.resolve(__dirname, '..');
const apiDir = path.resolve(rootDir, 'apps/api');
const distMain = path.resolve(apiDir, 'dist/main.js');

if (isProduction) {
  console.log('🚀 [@solar-crm/api] Production environment detected.');

  // If the API hasn't been built yet, build it now
  if (!fs.existsSync(distMain)) {
    console.log('⚡ [@solar-crm/api] Pre-compiled dist/main.js not found. Running build...');
    execSync('npm --workspace=apps/api run build', {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    });
  }

  console.log('⚡ [@solar-crm/api] Booting production API server in-process...');
  // Require directly in the same process to eliminate child_process overhead and pipe buffering
  require(distMain);
} else {
  // Local development mode: run Nest CLI watch
  const { spawn } = require('child_process');
  console.log('⚡ [@solar-crm/api] Launching development mode (nest start --watch)...');
  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['nest', 'start', '--watch'],
    {
      cwd: apiDir,
      stdio: 'inherit',
      shell: true,
      env: process.env,
    }
  );

  child.on('exit', (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });
}
