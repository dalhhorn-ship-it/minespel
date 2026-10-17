// Smoke test of the production build. Run after `npm run build`.
// Checks the manifest and icons (T3). T22 adds the service worker check.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const MAX_BYTES = 5 * 1024 * 1024; // PRD section 10
const problems = [];

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('check-dist: dist/index.html is missing. Run npm run build first.');
  process.exit(1);
}

let total = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else {
      total += s.size;
      if (readFileSync(p).includes('__dino')) problems.push(`test hook "__dino" found in ${p}`);
    }
  }
}
walk(DIST);

if (total > MAX_BYTES) problems.push(`dist/ is ${(total / 1048576).toFixed(2)} MB, over the 5 MB limit`);

// Manifest and icons (T3)
const manifestPath = join(DIST, 'manifest.webmanifest');
if (!existsSync(manifestPath)) {
  problems.push('dist/manifest.webmanifest is missing');
} else {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    problems.push('manifest.webmanifest is not valid JSON');
  }
  if (manifest) {
    for (const key of ['name', 'short_name', 'start_url', 'display', 'background_color']) {
      if (!manifest[key]) problems.push(`manifest is missing "${key}"`);
    }
    const sizes = new Set();
    for (const icon of manifest.icons ?? []) {
      const file = join(DIST, icon.src);
      if (!existsSync(file)) {
        problems.push(`manifest icon ${icon.src} is missing`);
        continue;
      }
      const buf = readFileSync(file);
      const isPng = buf.length > 24 && buf.subarray(1, 4).toString('ascii') === 'PNG';
      const w = isPng ? buf.readUInt32BE(16) : 0;
      const h = isPng ? buf.readUInt32BE(20) : 0;
      if (!isPng) problems.push(`icon ${icon.src} is not a PNG`);
      else if (`${w}x${h}` !== icon.sizes) problems.push(`icon ${icon.src} is ${w}x${h}, manifest says ${icon.sizes}`);
      else sizes.add(w);
    }
    for (const need of [180, 192, 512]) {
      if (!sizes.has(need)) problems.push(`manifest has no ${need} px icon`);
    }
  }
}
const indexHtml = readFileSync(join(DIST, 'index.html'), 'utf8');
for (const needle of ['rel="manifest"', 'apple-mobile-web-app-capable', 'rel="apple-touch-icon"', 'user-scalable=no', 'viewport-fit=cover']) {
  if (!indexHtml.includes(needle)) problems.push(`dist/index.html is missing ${needle}`);
}

if (problems.length) {
  for (const p of problems) console.error(`check-dist: ${p}`);
  process.exit(1);
}
console.log(`check-dist: OK (${(total / 1024).toFixed(0)} KB)`);
