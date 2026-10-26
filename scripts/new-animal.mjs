#!/usr/bin/env node
// Adds an animal to the Dinowinkel: one new entry in src/dinos/species.ts (docs/ANIMALS.md, decision 111).
// Everything else (3D model, egg, shop card, emblem, size chip) is generated from the entry.
//
//   npm run new-animal -- --id parasaurolophus --name Parasaurolophus --price 60 --plan fourLegs \
//     --color "#8d6e63" --trait "Toetert vrolijk met zijn holle kuif!"
//
// Optional: --size w,h,l (blocks), --feature-color "#rrggbb", --dry-run (print the entry, change nothing).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../src/dinos/species.ts', import.meta.url));
const MARKER = '  // new-animal: entries are added above this line';
const PLANS = {
  twoLegs: [0.6, 0.8, 1],
  fourLegs: [1, 1.2, 1.8],
  longNeck: [1.2, 2.4, 2],
};

function fail(msg) {
  console.error(`new-animal: ${msg}`);
  console.error('Usage: npm run new-animal -- --id <id> --name <Naam> --price <punten> --plan <twoLegs|fourLegs|longNeck> --color "#rrggbb" --trait "<zin>" [--size w,h,l] [--feature-color "#rrggbb"] [--dry-run]');
  process.exit(1);
}

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) fail(`unexpected argument "${a}"`);
  const key = a.slice(2);
  if (key === 'dry-run') args[key] = true;
  else if (i + 1 < argv.length) args[key] = argv[++i];
  else fail(`--${key} needs a value`);
}

const { id, name, plan, trait } = args;
if (!id || !/^[a-z][a-z0-9]{1,23}$/.test(id)) fail('--id must be lower case letters and digits, like "ankylosaurus"');
if (!name || name.length > 20) fail('--name is the Dutch name the kid sees, at most 20 characters');
const price = Number(args.price);
if (!Number.isInteger(price) || price < 1 || price > 500) fail('--price must be a whole number of points from 1 to 500');
if (!(plan in PLANS)) fail(`--plan must be one of ${Object.keys(PLANS).join(', ')}`);
const hex = (v, flag) => {
  if (!/^#?[0-9a-fA-F]{6}$/.test(v ?? '')) fail(`${flag} must be a colour like "#8d6e63"`);
  return `0x${v.replace('#', '').toLowerCase()}`;
};
const color = hex(args.color, '--color');
const featureColor = args['feature-color'] ? hex(args['feature-color'], '--feature-color') : null;
if (!trait || trait.length > 90) fail('--trait is one or two short sentences for the shop card, at most 90 characters');
const size = args.size ? args.size.split(',').map(Number) : PLANS[plan];
if (size.length !== 3 || size.some((n) => !(n > 0 && n <= 3))) fail('--size is w,h,l in blocks, each above 0 and at most 3');

const src = readFileSync(FILE, 'utf8');
if (!src.includes(MARKER)) fail(`marker line not found in ${FILE}`);
if (new RegExp(`\\bid: '${id}'`).test(src)) fail(`there is already an animal with id "${id}"`);

const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const entry = [
  '  {',
  `    id: ${q(id)},`,
  `    name: ${q(name)},`,
  `    price: ${price},`,
  '    inShop: true,',
  `    plan: ${q(plan)},`,
  `    size: { w: ${size[0]}, h: ${size[1]}, l: ${size[2]} },`,
  `    color: ${color},`,
  ...(featureColor ? [`    featureColor: ${featureColor},`] : []),
  `    trait: ${q(trait)},`,
  '  },',
].join('\n');

if (args['dry-run']) {
  console.log(entry);
  process.exit(0);
}
writeFileSync(FILE, src.replace(MARKER, `${entry}\n${MARKER}`));
console.log(`Added ${name} (${id}, ${price} punten) to src/dinos/species.ts.`);
console.log('Next: npx vitest run src/dinos src/render/dino-models src/ui/shop src/core/economy, then look at it in the shop (npm run dev).');
