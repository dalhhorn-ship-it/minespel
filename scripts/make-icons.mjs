// Draws the app icons as PNG with node only (no packages).
// Run: node scripts/make-icons.mjs   (writes public/icons/icon-180|192|512.png)
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const SKY = [143, 211, 255];
const GREEN = [76, 175, 80];
const DARK = [46, 125, 50];
const LIGHT = [165, 214, 167];
const WHITE = [255, 255, 255];
const INK = [31, 45, 61];

const inEllipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
function inTriangle(x, y, a, b, c) {
  const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const p = [x, y];
  const d1 = s(p, a, b);
  const d2 = s(p, b, c);
  const d3 = s(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

/** Colour of the icon at (x, y) in the unit square. Keeps the art inside the safe middle. */
function sample(x, y) {
  // spikes on the back of the head
  for (const cx of [0.3, 0.46, 0.62]) {
    if (inTriangle(x, y, [cx - 0.07, 0.34], [cx, 0.2], [cx + 0.07, 0.34])) return DARK;
  }
  // eye
  if (inEllipse(x, y, 0.5, 0.44, 0.045, 0.05)) return INK;
  if (inEllipse(x, y, 0.5, 0.44, 0.085, 0.09)) return WHITE;
  // nostrils
  if (inEllipse(x, y, 0.66, 0.66, 0.02, 0.025) || inEllipse(x, y, 0.78, 0.66, 0.02, 0.025)) return DARK;
  // snout
  if (inEllipse(x, y, 0.72, 0.68, 0.17, 0.12)) return LIGHT;
  // head
  if (inEllipse(x, y, 0.5, 0.56, 0.3, 0.26)) return GREEN;
  return SKY;
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size) {
  const SS = 3;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let o = 0;
  for (let py = 0; py < size; py++) {
    raw[o++] = 0; // filter: none
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS;
      raw[o++] = Math.round(r / n);
      raw[o++] = Math.round(g / n);
      raw[o++] = Math.round(b / n);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = new URL('../public/icons/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });
for (const size of [180, 192, 512]) {
  writeFileSync(`${outDir}icon-${size}.png`, png(size));
  console.log(`icon-${size}.png`);
}
