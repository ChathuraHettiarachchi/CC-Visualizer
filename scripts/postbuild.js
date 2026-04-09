#!/usr/bin/env node
/**
 * Post-build: copy .next/static and public/ into the standalone output dir
 * so `node .next/standalone/server.js` can serve them correctly.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const root       = path.resolve(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');
const staticSrc  = path.join(root, '.next', 'static');
const staticDst  = path.join(standalone, '.next', 'static');
const publicSrc  = path.join(root, 'public');
const publicDst  = path.join(standalone, 'public');

if (!fs.existsSync(standalone)) {
  console.error('postbuild: .next/standalone not found — did next build run with output: standalone?');
  process.exit(1);
}

cpSync(staticSrc, staticDst);
cpSync(publicSrc, publicDst);

// Remove any runtime data that ended up inside the standalone dir during dev
const runtimeDir = path.join(standalone, '.cc-visualizer');
if (fs.existsSync(runtimeDir)) {
  fs.rmSync(runtimeDir, { recursive: true, force: true });
  console.log('postbuild: removed .cc-visualizer runtime data from standalone ✓');
}

console.log('postbuild: standalone assets copied ✓');

function cpSync(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) cpSync(s, d);
    else fs.copyFileSync(s, d);
  }
}
