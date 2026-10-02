#!/usr/bin/env node
/**
 * write-config.js: the portal's only build step.
 *
 * Reads the PROJECTS environment variable (set in Netlify) and writes
 * portal/config.js, which tells the portal which backend each project uses.
 *
 * PROJECTS format: one project per line, "address = script URL":
 *
 *   lets-pray = https://script.google.com/macros/s/AKfy.../exec
 *   next-client = https://script.google.com/macros/s/AKfy.../exec
 *
 * The address becomes the link: https://your-portal.netlify.app/lets-pray
 * Lines starting with # are ignored.
 *
 * Run locally:  PROJECTS="lets-pray = https://..." node scripts/write-config.js
 */

const fs = require('fs');
const path = require('path');

const raw = process.env.PROJECTS || '';
const errors = [];
const projects = {};

raw.split(/\r?\n|;/).forEach((line, i) => {
  const text = line.trim();
  if (!text || text.startsWith('#')) return;
  const match = text.match(/^([^=\s]+)\s*=\s*(\S+)$/);
  if (!match) {
    errors.push(`Line ${i + 1} should look like "lets-pray = https://...": ${text}`);
    return;
  }
  const slug = match[1].toLowerCase();
  const url = match[2];
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    errors.push(`"${slug}" can only use lowercase letters, numbers and dashes.`);
  } else if (!/^https:\/\/\S+$/.test(url) && !/^http:\/\/localhost(:\d+)?\//.test(url)) {
    errors.push(`The URL for "${slug}" must start with https://`);
  } else if (projects[slug]) {
    errors.push(`"${slug}" is listed twice.`);
  } else {
    projects[slug] = url;
  }
});

if (!Object.keys(projects).length && !errors.length) {
  errors.push('PROJECTS is empty. In Netlify: Site configuration → Environment variables → add PROJECTS.');
}

if (errors.length) {
  console.error('\nCould not write portal/config.js:\n  - ' + errors.join('\n  - ') + '\n');
  process.exit(1);
}

const out = '// Written by scripts/write-config.js from the PROJECTS environment variable.\n' +
  '// Do not edit by hand on Netlify; change PROJECTS and redeploy instead.\n' +
  'window.PORTAL_CONFIG = ' + JSON.stringify({ projects }, null, 2) + ';\n';

fs.writeFileSync(path.join(__dirname, '..', 'portal', 'config.js'), out);
console.log(`portal/config.js written with ${Object.keys(projects).length} project(s): ${Object.keys(projects).join(', ')}`);
