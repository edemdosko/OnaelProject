#!/usr/bin/env node
/**
 * dev-server.js: preview the portal on your computer (no installs needed).
 *
 *   node scripts/dev-server.js
 *   then open http://localhost:8787/lets-pray
 *
 * It serves the portal folder like Netlify does: real files first, and every
 * other address (/lets-pray, /next-client…) gets index.html.
 * Needs portal/config.js. Create it with scripts/write-config.js, or copy
 * portal/config.example.js to portal/config.js.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'portal');
const PORT = Number(process.env.PORT) || 8787;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`Portal preview: http://localhost:${PORT}/<project-address>  (Ctrl+C to stop)`);
});
