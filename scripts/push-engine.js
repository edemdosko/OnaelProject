#!/usr/bin/env node
/**
 * push-engine.js: push the engine code to every project's script at once.
 *
 *   node scripts/push-engine.js              → every project in the list
 *   node scripts/push-engine.js lets-pray    → just one
 *
 * The list lives in apps-script/projects.local.json (gitignored), e.g.
 *   { "_template": "1AbC…scriptId", "lets-pray": "1R2A…scriptId" }
 * Find a Script ID in the sheet: Extensions → Apps Script → ⚙️ Project
 * Settings → IDs → Script ID.
 *
 * Only the engine files are pushed (no Seed*.gs), so client content never
 * reaches another project. clasp replaces the files in each script, so any
 * Seed file previously pushed to a project is removed there (it's only
 * needed once, on day one).
 *
 * After pushing, each project still needs: Deploy → Manage deployments →
 * ✏️ Edit → Version: New version → Deploy (the template doesn't).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SRC = path.join(__dirname, '..', 'apps-script');
const ENGINE_FILES = ['Code.gs', 'Table.gs', 'Setup.gs', 'Notify.gs', 'appsscript.json'];
const LIST = path.join(SRC, 'projects.local.json');

if (!fs.existsSync(LIST)) {
  console.error(`No project list yet. Create ${path.relative(process.cwd(), LIST)} like:\n` +
    '  { "_template": "SCRIPT-ID", "lets-pray": "SCRIPT-ID" }');
  process.exit(1);
}

const all = JSON.parse(fs.readFileSync(LIST, 'utf8'));
const only = process.argv[2];
const names = only ? [only] : Object.keys(all);
const results = [];

for (const name of names) {
  const scriptId = all[name];
  if (!scriptId) { results.push(`✗ ${name}: not in the list`); continue; }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `engine-${name}-`));
  for (const f of ENGINE_FILES) fs.copyFileSync(path.join(SRC, f), path.join(dir, f));
  fs.writeFileSync(path.join(dir, '.clasp.json'), JSON.stringify({ scriptId, rootDir: '' }));

  console.log(`\n→ ${name}`);
  const run = spawnSync('npx', ['-y', '@google/clasp', 'push', '--force'], { cwd: dir, stdio: 'inherit' });
  results.push(run.status === 0 ? `✓ ${name}` : `✗ ${name}: push failed (see above)`);
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log('\n' + results.join('\n'));
console.log('\nNext, for each project (not the template): Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.');
