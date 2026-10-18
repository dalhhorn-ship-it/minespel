// Minecraft style background for the learning screens.
// A small world slice (grass on top, dirt, stone, a few ore blocks) is painted from the game's own
// block textures (src/render/atlas.ts), once, into a tiny PNG data URL. The CSS shows it with
// image-rendering: pixelated, so every block is chunky. No image files, no network.
import { paintTile, TILE_SIZE, tileFor, type PixelImage } from '../../render/atlas';
import { AARDE, DIAMANT, GOUDSTEEN, GRAS, KEISTEEN, MOSSTEEN, STEEN } from '../../world/blocks';

/** 16 x 12 blocks matches an iPad in landscape (4:3). */
export const SCENE_COLS = 16;
export const SCENE_ROWS = 12;

/** Row where stone starts. Rows 1 to 3 are dirt. */
const STONE_FROM = 4;

/** Fixed ore spots as [column, row, block]. Mostly near the edges, the middle is covered by panels. */
const ORES: ReadonlyArray<readonly [number, number, number]> = [
  [1, 6, GOUDSTEEN],
  [14, 8, GOUDSTEEN],
  [6, 11, GOUDSTEEN],
  [0, 9, DIAMANT],
  [15, 5, DIAMANT],
  [10, 10, DIAMANT],
  [3, 5, MOSSTEEN],
  [12, 11, MOSSTEEN],
];

/** Tile index for every cell of the scene, row by row. Pure. */
export function sceneTiles(): number[][] {
  const grassTop = tileFor(GRAS, 'top');
  const dirt = tileFor(AARDE, 'side');
  const stone = tileFor(STEEN, 'side');
  const cobble = tileFor(KEISTEEN, 'side');
  const rows: number[][] = [];
  for (let r = 0; r < SCENE_ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < SCENE_COLS; c++) {
      if (r === 0) row.push(grassTop);
      else if (r < STONE_FROM) row.push(dirt);
      else row.push((c * 5 + r * 3) % 7 === 0 ? cobble : stone);
    }
    rows.push(row);
  }
  for (const [c, r, block] of ORES) {
    const t = tileFor(block, 'side');
    const row = rows[r];
    if (row && t >= 0) row[c] = t;
  }
  return rows;
}

/** Paints the whole scene as one RGBA image (256 x 192). Pure: same input, same pixels. */
export function paintScene(): PixelImage {
  const width = SCENE_COLS * TILE_SIZE;
  const height = SCENE_ROWS * TILE_SIZE;
  const data = new Uint8ClampedArray(width * height * 4);
  const cache = new Map<number, PixelImage>();
  sceneTiles().forEach((row, r) => {
    row.forEach((tileIndex, c) => {
      let tile = cache.get(tileIndex);
      if (!tile) {
        tile = paintTile(tileIndex);
        cache.set(tileIndex, tile);
      }
      for (let y = 0; y < TILE_SIZE; y++) {
        const from = y * TILE_SIZE * 4;
        data.set(tile.data.subarray(from, from + TILE_SIZE * 4), ((r * TILE_SIZE + y) * width + c * TILE_SIZE) * 4);
      }
    });
  });
  return { width, height, data };
}

let cachedUrl: string | null | undefined;

/** PNG data URL of the scene, built once. Null when there is no canvas (tests, very old browsers). */
export function sceneDataUrl(): string | null {
  if (cachedUrl !== undefined) return cachedUrl;
  cachedUrl = null;
  try {
    const img = paintScene();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
      cachedUrl = canvas.toDataURL('image/png');
    }
  } catch {
    cachedUrl = null;
  }
  return cachedUrl;
}

/** Sets the --mc-bg custom property that break.css uses. Without a url the plain stone colour stays. */
export function applyMcBackground(target: HTMLElement, url: string | null = sceneDataUrl()): void {
  if (url) target.style.setProperty('--mc-bg', `url("${url}")`);
  else target.style.removeProperty('--mc-bg');
}
