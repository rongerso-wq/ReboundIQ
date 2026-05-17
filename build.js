#!/usr/bin/env node
//
// ReboundIQ — production build script.
//
// Pre-compiles the inline JSX in index.html to a static dist/app.js via
// esbuild (npx, no install needed). Tightens the meta CSP in dist/index.html
// so production drops 'unsafe-eval' + script-src 'unsafe-inline'.
//
// Dev story: open the source index.html in Chrome via file:// — still works
// unchanged with the in-browser Babel compile.
//
// Prod story: Vercel runs `node build.js` (see vercel.json buildCommand),
// then serves dist/ with the tightened CSP from vercel.json headers.
//
// Usage: node build.js
//

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const TMP_JSX = path.join(ROOT, '.build-tmp.jsx');

// Tightened CSP applied to dist/index.html's <meta http-equiv>.
// vercel.json headers carry the same value at HTTP level; both are kept
// in sync so loading the file directly OR via Vercel applies the same policy.
const TIGHT_CSP =
  "default-src 'self'; " +
  "script-src 'self'; " +                       // dropped 'unsafe-eval', 'unsafe-inline'
  "style-src 'self' 'unsafe-inline'; " +        // Tailwind Play still injects styles at runtime
  "font-src 'self'; " +
  "img-src 'self' data: blob:; " +
  "connect-src 'self'; " +                      // /api/coach is same-origin
  "frame-ancestors 'none'; " +
  "base-uri 'self'; " +
  "form-action 'none'; " +
  "object-src 'none'; " +
  "manifest-src 'none'; " +
  "media-src 'none'";

function log(msg) { console.log('[build] ' + msg); }

function clean() {
  if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  fs.mkdirSync(path.join(DIST, 'vendor', 'fonts'), { recursive: true });
}

function extractAndCompile(htmlSrc) {
  const m = htmlSrc.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('No <script type="text/babel"> block found in index.html');
  fs.writeFileSync(TMP_JSX, m[1]);

  log('Compiling JSX via esbuild...');
  // --target=es2019: broad browser support without polyfills
  // --format=iife: self-contained, no module loader needed
  // --minify: smaller output; preserves correctness
  // --loader:.jsx=jsx: explicit ext mapping (the bare --loader=jsx form is stdin-only)
  const compiled = execSync(
    `npx --yes esbuild "${TMP_JSX}" --loader:.jsx=jsx --minify --target=es2019 --format=iife`,
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  );
  fs.unlinkSync(TMP_JSX);
  return compiled;
}

function buildIndexHtml(htmlSrc, compiledJs) {
  // 1. Tighten the meta CSP
  let out = htmlSrc.replace(
    /<meta http-equiv="Content-Security-Policy"[^>]*?\/?>/,
    `<meta http-equiv="Content-Security-Policy" content="${TIGHT_CSP}" />`
  );
  // 2. Drop the Babel vendor script (no longer needed at runtime)
  out = out.replace(/\s*<script src="vendor\/babel\.min\.js"><\/script>\s*\n?/g, '\n  ');
  // 3. Replace the inline JSX block with a reference to the pre-compiled app.js
  out = out.replace(
    /<script type="text\/babel">[\s\S]*?<\/script>/,
    '<script src="app.js" defer></script>'
  );
  return out;
}

function copyVendor() {
  const vendorFiles = [
    'react.production.min.js',
    'react-dom.production.min.js',
    'tailwind.min.js'
    // babel.min.js is intentionally not copied
  ];
  vendorFiles.forEach(f => {
    fs.copyFileSync(
      path.join(ROOT, 'vendor', f),
      path.join(DIST, 'vendor', f)
    );
  });
  const fontsDir = path.join(ROOT, 'vendor', 'fonts');
  fs.readdirSync(fontsDir).forEach(f => {
    fs.copyFileSync(path.join(fontsDir, f), path.join(DIST, 'vendor', 'fonts', f));
  });
  log('Copied vendor/ (sans babel.min.js)');
}

function main() {
  log('Cleaning dist/');
  clean();

  const htmlSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const compiled = extractAndCompile(htmlSrc);
  log('Compiled JS size: ' + (compiled.length / 1024).toFixed(1) + ' KB');

  fs.writeFileSync(path.join(DIST, 'app.js'), compiled);
  log('Wrote dist/app.js');

  const builtHtml = buildIndexHtml(htmlSrc, compiled);
  fs.writeFileSync(path.join(DIST, 'index.html'), builtHtml);
  log('Wrote dist/index.html (tightened CSP, app.js reference)');

  copyVendor();

  log('Done. Deploy dist/ to Vercel — api/ stays at repo root.');
}

main();
