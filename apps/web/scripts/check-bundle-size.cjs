#!/usr/bin/env node
/**
 * Automated Bundle Size Tracker & CI Quality Gate
 * Enforces a strict 300kB limit on all client JavaScript chunks.
 * Generates Markdown summaries for GitHub Actions and local terminal outputs.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MAX_CHUNK_BYTES = 300 * 1024; // 300 kB threshold
const distAssetsDir = path.resolve(__dirname, '..', 'dist', 'assets');

if (!fs.existsSync(distAssetsDir)) {
  console.error(`❌ Build directory missing: ${distAssetsDir}. Run 'npm run build' first.`);
  process.exit(1);
}

const files = fs.readdirSync(distAssetsDir).filter(f => f.endsWith('.js'));
if (files.length === 0) {
  console.error(`❌ No JavaScript chunks found in ${distAssetsDir}`);
  process.exit(1);
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

let hasViolations = false;
const results = [];

for (const file of files) {
  const filePath = path.join(distAssetsDir, file);
  const content = fs.readFileSync(filePath);
  const rawSize = content.length;
  const gzipSize = zlib.gzipSync(content).length;
  const isOverBudget = rawSize > MAX_CHUNK_BYTES;

  if (isOverBudget) {
    hasViolations = true;
  }

  results.push({
    file,
    rawSize,
    gzipSize,
    isOverBudget,
  });
}

// Sort descending by raw size
results.sort((a, b) => b.rawSize - a.rawSize);

// Print Terminal Output
console.log('\n📊 ──────────────────────────────────────────────────────────');
console.log('📦 Solar EPC CRM — Client Bundle Size Audit (< 300 kB Budget)');
console.log('────────────────────────────────────────────────────────────');

results.forEach(item => {
  const status = item.isOverBudget ? '❌ FAIL' : '✅ PASS';
  console.log(
    `${status} | ${item.file.padEnd(42)} | Raw: ${formatBytes(item.rawSize).padStart(9)} | Gzip: ${formatBytes(item.gzipSize).padStart(9)}`
  );
});

console.log('────────────────────────────────────────────────────────────\n');

// Write to GitHub Step Summary if running in GitHub Actions CI
if (process.env.GITHUB_STEP_SUMMARY) {
  let markdown = `### 📦 Client Bundle Size Audit Report\n\n`;
  markdown += `**Maximum Asset Budget:** 300.00 kB\n\n`;
  markdown += `| Status | Asset Chunk | Raw Size | Gzip Size | Budget Limit |\n`;
  markdown += `|:------:|:------------|---------:|----------:|-------------:|\n`;

  results.forEach(item => {
    const icon = item.isOverBudget ? '🔴 **FAIL**' : '🟢 **PASS**';
    markdown += `| ${icon} | \`${item.file}\` | ${formatBytes(item.rawSize)} | ${formatBytes(item.gzipSize)} | 300.00 kB |\n`;
  });

  if (hasViolations) {
    markdown += `\n> ⚠️ **Quality Gate Alert:** One or more JavaScript chunks exceeded the 300.00 kB threshold. Please investigate module imports.\n`;
  } else {
    markdown += `\n> ✨ **All ${results.length} JavaScript bundles are within the 300 kB performance budget.**\n`;
  }

  try {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, 'utf-8');
  } catch (err) {
    console.warn('Unable to append to GITHUB_STEP_SUMMARY:', err.message);
  }
}

if (hasViolations) {
  console.error('❌ Bundle size quality gate failed: one or more chunks exceed 300 kB.\n');
  process.exit(1);
} else {
  console.log(`✅ All ${results.length} JavaScript chunks passed the 300 kB budget check successfully.\n`);
  process.exit(0);
}
