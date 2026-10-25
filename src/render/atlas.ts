import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three';
import {
  AARDE, BAKSTEEN, BASALT, BLADEREN, BOOMSTAM, DIAMANT, DIEPSTEEN, GLAS, GOUDSTEEN, GRANIET, GRAS,
  IJS, KEISTEEN, LAVA, MARMER, MOSSTEEN, OBSIDIAAN, OERSTEEN, PLANKEN, SNEEUW, STEEN, VUUR,
  VUURSTEEN, WATER, WOL_BLAUW, WOL_GEEL, WOL_GROEN, WOL_ORANJE, WOL_PAARS, WOL_ROOD, WOL_WIT, ZAND,
  METEORIET, IJSDIAMANT, BLIKSEMSTEEN, REGENBOOGKERN, LAVAKRISTAL, MAANSTEEN, DRAKENOOG, STERRENSTOF, ZANDSTEEN,
} from '../world/blocks';

export const TILE_SIZE = 16;
export const ATLAS_COLUMNS = 8;

export type FaceKind = 'top' | 'bottom' | 'side';

type Rgb = readonly [number, number, number];

/** One painted tile: a base colour with speckles, plus an optional special pattern. */
interface TileSpec {
  name: string;
  base: Rgb;
  /** How much each pixel may differ from the base colour. */
  speckle: number;
  /** Optional per pixel override. Return null to keep the speckled base. Alpha 0 is see through. */
  pattern?: (x: number, y: number) => readonly [number, number, number, number] | null;
}


const wool = (name: string, base: Rgb): TileSpec => ({ name, base, speckle: 8 });

const RAINBOW: readonly (readonly [number, number, number, number])[] = [
  [236, 60, 60, 255], [248, 150, 40, 255], [250, 224, 60, 255], [70, 190, 86, 255],
  [60, 120, 230, 255], [158, 84, 210, 255], [236, 60, 60, 255],
];

export const TILES: readonly TileSpec[] = [
  { name: 'gras-top', base: [92, 178, 70], speckle: 22 },
  {
    name: 'gras-side', base: [134, 96, 62], speckle: 18,
    pattern: (x, y) => (y < 4 || (y === 4 && x % 3 !== 0) ? [92, 178, 70, 255] : null),
  },
  { name: 'aarde', base: [134, 96, 62], speckle: 18 },
  { name: 'steen', base: [140, 140, 146], speckle: 16 },
  {
    name: 'keisteen', base: [120, 120, 126], speckle: 14,
    pattern: (x, y) => ((x + (y >> 2)) % 5 === 0 || y % 5 === 0 ? [80, 80, 86, 255] : null),
  },
  { name: 'zand', base: [232, 214, 140], speckle: 12 },
  {
    name: 'boomstam-top', base: [196, 156, 98], speckle: 8,
    pattern: (x, y) => {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      return d > 6.5 ? [104, 72, 40, 255] : Math.floor(d) % 2 === 1 ? [170, 130, 80, 255] : null;
    },
  },
  {
    name: 'boomstam-side', base: [112, 78, 44], speckle: 8,
    pattern: (x) => (x % 4 === 0 ? [88, 60, 34, 255] : null),
  },
  {
    name: 'planken', base: [204, 160, 100], speckle: 8,
    pattern: (x, y) => (y % 4 === 3 ? [150, 112, 66, 255] : x === (y >> 2) * 5 % TILE_SIZE ? [160, 120, 70, 255] : null),
  },
  {
    name: 'bladeren', base: [54, 140, 56], speckle: 24,
    pattern: (x, y) => ((x * 7 + y * 13) % 11 === 0 ? [0, 0, 0, 0] : null),
  },
  {
    name: 'glas', base: [200, 230, 245], speckle: 0,
    pattern: (x, y) => {
      const edge = x === 0 || y === 0 || x === TILE_SIZE - 1 || y === TILE_SIZE - 1;
      if (edge) return [190, 225, 245, 255];
      if (x === y && x > 2 && x < 7) return [255, 255, 255, 255];
      return [0, 0, 0, 0];
    },
  },
  {
    name: 'baksteen', base: [178, 74, 58], speckle: 10,
    pattern: (x, y) => {
      const row = y >> 2;
      if (y % 4 === 3) return [214, 200, 184, 255];
      return (x + (row % 2 === 0 ? 0 : 4)) % 8 === 7 ? [214, 200, 184, 255] : null;
    },
  },
  wool('wol-wit', [244, 244, 244]),
  wool('wol-rood', [220, 56, 56]),
  wool('wol-geel', [248, 214, 56]),
  wool('wol-blauw', [60, 110, 226]),
  wool('wol-groen', [70, 190, 86]),
  wool('wol-paars', [158, 84, 210]),
  { name: 'oersteen', base: [56, 52, 66], speckle: 14 },
  {
    name: 'obsidiaan', base: [26, 16, 44], speckle: 10,
    pattern: (x, y) => ((x * 5 + y * 9) % 13 === 0 ? [112, 48, 178, 255] : (x + y) % 7 === 0 ? [14, 8, 26, 255] : null),
  },
  {
    name: 'vuur', base: [255, 118, 24], speckle: 18,
    pattern: (x, y) => {
      const tongue = Math.abs((x % 5) - 2) + Math.floor(y / 4);
      if (y < 3 && tongue > 2) return [0, 0, 0, 0];
      if (y > 11) return [255, 232, 82, 255];
      if (y > 7 && (x + y) % 2 === 0) return [255, 182, 36, 255];
      return null;
    },
  },
  {
    name: 'lava', base: [236, 68, 16], speckle: 14,
    pattern: (x, y) => {
      const wave = (x + (y >> 1) * 3) % 7;
      if (wave === 0) return [255, 214, 52, 255];
      if (wave === 1) return [255, 140, 24, 255];
      return null;
    },
  },
  {
    name: 'mossteen', base: [118, 124, 118], speckle: 14,
    pattern: (x, y) => ((x * 3 + y * 5) % 7 === 0 ? [72, 152, 58, 255] : y % 5 === 0 ? [82, 92, 82, 255] : null),
  },
  {
    name: 'zandsteen', base: [224, 198, 128], speckle: 8,
    pattern: (_x, y) => (y === 3 || y === 9 ? [196, 168, 98, 255] : y < 3 ? [238, 216, 152, 255] : null),
  },
  {
    name: 'graniet', base: [168, 108, 92], speckle: 20,
    pattern: (x, y) => ((x * 11 + y * 7) % 9 === 0 ? [212, 164, 148, 255] : null),
  },
  {
    name: 'marmer', base: [236, 236, 242], speckle: 6,
    pattern: (x, y) => ((x + y * 2) % 9 === 0 ? [184, 188, 202, 255] : null),
  },
  {
    name: 'basalt', base: [64, 64, 72], speckle: 12,
    pattern: (x) => (x % 3 === 0 ? [44, 44, 52, 255] : null),
  },
  {
    name: 'diepsteen', base: [78, 82, 94], speckle: 10,
    pattern: (x, y) => (y % 4 === 0 || (x + (y >> 2) * 4) % 8 === 0 ? [50, 54, 64, 255] : null),
  },
  {
    name: 'vuursteen', base: [92, 74, 68], speckle: 14,
    pattern: (x, y) => ((x * 7 + y * 5) % 11 === 0 ? [255, 132, 36, 255] : null),
  },
  {
    name: 'goudsteen', base: [244, 196, 48], speckle: 12,
    pattern: (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? [198, 146, 20, 255] : (x + y) === 6 ? [255, 244, 164, 255] : null),
  },
  {
    name: 'diamant', base: [74, 226, 236], speckle: 10,
    pattern: (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? [38, 174, 192, 255] : (x + y) === 7 ? [224, 255, 255, 255] : null),
  },
  {
    name: 'water', base: [44, 132, 236], speckle: 8,
    pattern: (x, y) => ((x + y) % 9 === 0 ? [0, 0, 0, 0] : y % 4 === 0 ? [96, 176, 252, 255] : null),
  },
  {
    name: 'ijs', base: [164, 218, 252], speckle: 6,
    pattern: (x, y) => ((x * 5 + y * 3) % 13 === 0 ? [0, 0, 0, 0] : x + y === 12 ? [232, 248, 255, 255] : null),
  },
  { name: 'sneeuw', base: [246, 250, 255], speckle: 6 },
  wool('wol-oranje', [245, 130, 32]),
  // Rare blocks (still pictures): each one is a small scene so it looks special next to the plain blocks.
  {
    // Green scales with a golden eye and a black slit pupil.
    name: 'drakenoog', base: [28, 128, 66], speckle: 8,
    pattern: (x, y) => {
      const dx = (x - 7.5) / 6.5;
      const dy = (y - 7.5) / 4.2;
      const e = dx * dx + dy * dy;
      if (e < 1) {
        if (Math.abs(x - 7.5) < 1 && e < 0.9) return [8, 8, 8, 255];
        if (e > 0.72) return [214, 150, 20, 255];
        return (x + y) % 5 === 0 ? [255, 244, 140, 255] : [255, 208, 40, 255];
      }
      if (e < 1.35) return [14, 70, 36, 255];
      const row = y >> 2;
      if (y % 4 === 3 || (x + (row % 2) * 4) % 8 === 7) return [18, 88, 46, 255];
      return (x + y) % 6 === 0 ? [92, 214, 124, 255] : null;
    },
  },
  {
    // Dark red rock cracked open, with glowing orange lava inside the cracks.
    name: 'lavakristal', base: [70, 12, 16], speckle: 10,
    pattern: (x, y) => {
      const crack = (x + y * 2) % 8 === 0 || (x * 2 - y + 40) % 11 === 0 || (x === 7 && y > 4 && y < 12);
      if (!crack) return (x * 7 + y * 3) % 13 === 0 ? [120, 24, 20, 255] : null;
      return (x + y) % 3 === 0 ? [255, 226, 80, 255] : [255, 128, 20, 255];
    },
  },
  {
    // Pale grey blue stone with small round craters.
    name: 'maansteen', base: [172, 184, 208], speckle: 8,
    pattern: (x, y) => {
      const craters: readonly (readonly [number, number, number])[] = [[4, 4, 3], [11, 6, 2.6], [7, 12, 2.4], [13, 13, 1.6]];
      for (const [cx, cy, r] of craters) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < r - 0.8) return [104, 116, 148, 255];
        if (d < r) return x + y < cx + cy ? [88, 100, 134, 255] : [236, 242, 255, 255];
      }
      return x === 0 || y === 0 || x === 15 || y === 15 ? [132, 146, 178, 255] : null;
    },
  },
  {
    // Black charred rock, bright green cracks and a green halo: it looks radioactive.
    name: 'meteoriet', base: [20, 18, 20], speckle: 8,
    pattern: (x, y) => {
      const crack = (x + y * 2) % 7 === 0 || (x * 2 - y + 30) % 9 === 0 || (x === 7 && y > 2 && y < 13);
      if (crack) return (x + y) % 3 === 0 ? [220, 255, 190, 255] : [90, 255, 60, 255];
      const edge = Math.min(x, y, 15 - x, 15 - y);
      if (edge === 0) return [40, 190, 40, 255];
      if (edge === 1) return [24, 92, 28, 255];
      return (x * 5 + y * 7) % 11 === 0 ? [60, 40, 28, 255] : null;
    },
  },
  {
    // Icy blue with sharp white facets that meet in the middle.
    name: 'ijsdiamant', base: [120, 196, 240], speckle: 8,
    pattern: (x, y) => {
      const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      if (x === 0 || y === 0 || x === 15 || y === 15) return [60, 140, 210, 255];
      if (d < 2) return [255, 255, 255, 255];
      if (x === y || x + y === 15 || x === 7 || x === 8 || y === 7 || y === 8) return [232, 250, 255, 255];
      if (d >= 7 && d < 8) return [200, 238, 255, 255];
      return (x < 8) === (y < 8) ? [150, 214, 248, 255] : [92, 168, 226, 255];
    },
  },
  {
    // Dark stone with a bright yellow lightning bolt.
    name: 'bliksemsteen', base: [44, 46, 68], speckle: 8,
    pattern: (x, y) => {
      const bolt: readonly (readonly [number, number])[] = [
        [9, 1], [8, 1], [8, 2], [7, 3], [7, 4], [6, 5], [5, 6], [6, 7], [7, 7], [8, 7], [8, 8], [7, 9], [7, 10], [6, 11], [6, 12], [5, 13], [5, 14],
      ];
      if (bolt.some(([bx, by]) => bx === x && by === y)) return [255, 244, 90, 255];
      if (bolt.some(([bx, by]) => Math.abs(bx - x) + Math.abs(by - y) === 1)) return [255, 176, 20, 255];
      return x === 0 || y === 0 || x === 15 || y === 15 ? [90, 96, 140, 255] : null;
    },
  },
  {
    // Rainbow rings around a white core.
    name: 'regenboogkern', base: [255, 255, 255], speckle: 0,
    pattern: (x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d < 2.2) return [255, 255, 255, 255];
      return RAINBOW[Math.min(5, Math.floor((d - 2.2) / 1.5))] ?? null;
    },
  },
  {
    // Deep blue with gold star dust and one bright star.
    name: 'sterrenstof', base: [16, 16, 72], speckle: 8,
    pattern: (x, y) => {
      const ax = Math.abs(x - 7.5);
      const ay = Math.abs(y - 7.5);
      if (ax + ay < 1.5) return [255, 255, 255, 255];
      if ((ax < 1 && ay < 5) || (ay < 1 && ax < 5)) return [255, 240, 130, 255];
      if (ax + ay < 3.5) return [255, 214, 70, 255];
      if ((x * 7 + y * 11) % 13 === 0) return [255, 214, 70, 255];
      if ((x * 5 + y * 3) % 17 === 0) return [180, 190, 255, 255];
      return x === 0 || y === 0 || x === 15 || y === 15 ? [60, 50, 150, 255] : null;
    },
  },
];

const TILE_INDEX = new Map(TILES.map((t, i) => [t.name, i]));

function tileName(block: number, face: FaceKind): string | null {
  switch (block) {
    case GRAS: return face === 'top' ? 'gras-top' : face === 'bottom' ? 'aarde' : 'gras-side';
    case AARDE: return 'aarde';
    case STEEN: return 'steen';
    case KEISTEEN: return 'keisteen';
    case ZAND: return 'zand';
    case BOOMSTAM: return face === 'side' ? 'boomstam-side' : 'boomstam-top';
    case PLANKEN: return 'planken';
    case BLADEREN: return 'bladeren';
    case GLAS: return 'glas';
    case BAKSTEEN: return 'baksteen';
    case WOL_WIT: return 'wol-wit';
    case WOL_ROOD: return 'wol-rood';
    case WOL_GEEL: return 'wol-geel';
    case WOL_BLAUW: return 'wol-blauw';
    case WOL_GROEN: return 'wol-groen';
    case WOL_PAARS: return 'wol-paars';
    case OERSTEEN: return 'oersteen';
    case OBSIDIAAN: return 'obsidiaan';
    case VUUR: return 'vuur';
    case LAVA: return 'lava';
    case MOSSTEEN: return 'mossteen';
    case ZANDSTEEN: return 'zandsteen';
    case GRANIET: return 'graniet';
    case MARMER: return 'marmer';
    case BASALT: return 'basalt';
    case DIEPSTEEN: return 'diepsteen';
    case VUURSTEEN: return 'vuursteen';
    case GOUDSTEEN: return 'goudsteen';
    case DIAMANT: return 'diamant';
    case WATER: return 'water';
    case IJS: return 'ijs';
    case SNEEUW: return 'sneeuw';
    case WOL_ORANJE: return 'wol-oranje';
    case DRAKENOOG: return 'drakenoog';
    case LAVAKRISTAL: return 'lavakristal';
    case MAANSTEEN: return 'maansteen';
    case METEORIET: return 'meteoriet';
    case IJSDIAMANT: return 'ijsdiamant';
    case BLIKSEMSTEEN: return 'bliksemsteen';
    case REGENBOOGKERN: return 'regenboogkern';
    case STERRENSTOF: return 'sterrenstof';
    default: return null;
  }
}

/** Tile index in the atlas for a block face. Air and unknown ids have no tile (-1). */
export function tileFor(block: number, face: FaceKind): number {
  const name = tileName(block, face);
  return name === null ? -1 : (TILE_INDEX.get(name) ?? -1);
}

export const ATLAS_ROWS = Math.ceil(TILES.length / ATLAS_COLUMNS);
export const ATLAS_WIDTH = ATLAS_COLUMNS * TILE_SIZE;
export const ATLAS_HEIGHT = ATLAS_ROWS * TILE_SIZE;

/** Small fixed hash, so every start paints the same pixels. */
function noise(tile: number, x: number, y: number): number {
  let h = (tile * 73856093) ^ (x * 19349663) ^ (y * 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) % 1000) / 1000;
}

export interface PixelImage {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row 0 at the top. */
  data: Uint8ClampedArray;
}

/** Paints one 16 x 16 tile. Pure: same input, same pixels. */
export function paintTile(tileIndex: number): PixelImage {
  const spec = TILES[tileIndex];
  if (!spec) throw new RangeError(`Unknown tile ${tileIndex}`);
  const data = new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4);
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const o = (y * TILE_SIZE + x) * 4;
      const special = spec.pattern?.(x, y) ?? null;
      if (special && special[3] === 0) continue;
      let rgb: Rgb;
      let alpha = 255;
      if (special) {
        rgb = [special[0], special[1], special[2]];
        alpha = special[3];
      } else {
        rgb = spec.base;
      }
      const wobble = (noise(tileIndex, x, y) - 0.5) * 2 * spec.speckle;
      data[o] = rgb[0] + wobble;
      data[o + 1] = rgb[1] + wobble;
      data[o + 2] = rgb[2] + wobble;
      data[o + 3] = alpha;
    }
  }
  return { width: TILE_SIZE, height: TILE_SIZE, data };
}

/** Paints all tiles into one image. Pure. */
export function paintAtlas(): PixelImage {
  const data = new Uint8ClampedArray(ATLAS_WIDTH * ATLAS_HEIGHT * 4);
  for (let t = 0; t < TILES.length; t++) {
    const tile = paintTile(t);
    const ox = (t % ATLAS_COLUMNS) * TILE_SIZE;
    const oy = Math.floor(t / ATLAS_COLUMNS) * TILE_SIZE;
    for (let y = 0; y < TILE_SIZE; y++) {
      const from = y * TILE_SIZE * 4;
      data.set(tile.data.subarray(from, from + TILE_SIZE * 4), ((oy + y) * ATLAS_WIDTH + ox) * 4);
    }
  }
  return { width: ATLAS_WIDTH, height: ATLAS_HEIGHT, data };
}

/** UV rectangle of a tile, inset half a pixel so neighbours never bleed in. v counts up from the bottom. */
export function tileUv(tileIndex: number): { u0: number; u1: number; v0: number; v1: number } {
  const col = tileIndex % ATLAS_COLUMNS;
  const row = Math.floor(tileIndex / ATLAS_COLUMNS);
  const left = col * TILE_SIZE + 0.5;
  const right = (col + 1) * TILE_SIZE - 0.5;
  const top = row * TILE_SIZE + 0.5;
  const bottom = (row + 1) * TILE_SIZE - 0.5;
  return {
    u0: left / ATLAS_WIDTH,
    u1: right / ATLAS_WIDTH,
    v0: 1 - bottom / ATLAS_HEIGHT,
    v1: 1 - top / ATLAS_HEIGHT,
  };
}

// Thin canvas wrapper below: only checked in e2e, jsdom has no canvas.

export function createAtlasCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_WIDTH;
  canvas.height = ATLAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas');
  const img = paintAtlas();
  ctx.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  return canvas;
}

export function createAtlasTexture(): CanvasTexture {
  const tex = new CanvasTexture(createAtlasCanvas());
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

