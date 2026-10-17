// Smoke test of the production build. Run after `npm run build`.
// T3 adds the manifest and icon checks, T22 the service worker check.
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

if (problems.length) {
  for (const p of problems) console.error(`check-dist: ${p}`);
  process.exit(1);
}
console.log(`check-dist: OK (${(total / 1024).toFixed(0)} KB)`);
