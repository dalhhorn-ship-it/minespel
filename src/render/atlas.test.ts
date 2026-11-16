import { describe, expect, it } from 'vitest';
import { AIR, BLADEREN, BLOCKS, GLAS, GRAS, MAX_BLOCK_ID, STEEN, VEIN_BLOCKS, WAARSCHUWSTEEN } from '../world/blocks';
import {
  ATLAS_COLUMNS, ATLAS_HEIGHT, ATLAS_WIDTH, TILES, TILE_SIZE, paintAtlas, paintTile, tileFor, tileUv,
} from './atlas';

describe('atlas', () => {
  it('has a tile for every block face except air', () => {
    for (const b of BLOCKS) {
      if (b.id === AIR) continue;
      for (const face of ['top', 'bottom', 'side'] as const) {
        const t = tileFor(b.id, face);
        expect(t, `${b.name} ${face}`).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThan(TILES.length);
      }
    }
    expect(tileFor(AIR, 'top')).toBe(-1);
    expect(MAX_BLOCK_ID).toBe(50);
  });

  it('AC233: the stripe tile is solid yellow and black, 4 pixels wide diagonals', () => {
    const t = tileFor(WAARSCHUWSTEEN, 'side');
    expect(t).toBeGreaterThanOrEqual(0);
    expect(tileFor(WAARSCHUWSTEEN, 'top')).toBe(t);
    expect(tileFor(WAARSCHUWSTEEN, 'bottom')).toBe(t);
    expect(t).not.toBe(tileFor(STEEN, 'side'));
    const d = paintTile(t).data;
    const px = (x: number, y: number) => {
      const o = (y * TILE_SIZE + x) * 4;
      return [d[o], d[o + 1], d[o + 2], d[o + 3]] as number[];
    };
    for (let i = 3; i < d.length; i += 4) expect(d[i]).toBe(255);
    const yellow = px(0, 0);
    const black = px(4, 0);
    expect(yellow[0]).toBeGreaterThan(200);
    expect(yellow[2]).toBeLessThan(80);
    expect(Math.max(black[0] as number, black[1] as number, black[2] as number)).toBeLessThan(60);
    // Same stripe along the diagonal, the next stripe 4 pixels over.
    expect(Math.abs((px(2, 1)[0] as number) - (yellow[0] as number))).toBeLessThan(20);
    expect(Math.abs((px(1, 2)[0] as number) - (yellow[0] as number))).toBeLessThan(20);
    expect(Math.abs((px(8, 0)[0] as number) - (yellow[0] as number))).toBeLessThan(20);
  });

  it('AC271: every vein id has its own solid still tile, different from steen and from each other', () => {
    const seen = new Set<string>([Array.from(paintTile(tileFor(STEEN, 'side')).data).join(',')]);
    const tiles = new Set<number>();
    for (const id of VEIN_BLOCKS) {
      const t = tileFor(id, 'side');
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).not.toBe(tileFor(STEEN, 'side'));
      for (const face of ['top', 'bottom'] as const) expect(tileFor(id, face)).toBe(t);
      tiles.add(t);
      const d = paintTile(t).data;
      for (let i = 3; i < d.length; i += 4) expect(d[i]).toBe(255);
      seen.add(Array.from(d).join(','));
    }
    expect(tiles.size).toBe(8);
    expect(seen.size).toBe(9);
  });

  it('AC271: the stones differ in shape, not only in colour (grey scale pictures differ)', () => {
    const shapes = new Set<string>();
    for (const id of VEIN_BLOCKS) {
      const d = paintTile(tileFor(id, 'side')).data;
      const bits: string[] = [];
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] as number;
        const g = d[i + 1] as number;
        const b = d[i + 2] as number;
        bits.push(Math.max(r, g, b) - Math.min(r, g, b) > 30 || Math.min(r, g, b) > 200 ? '1' : '0');
      }
      shapes.add(bits.join(''));
    }
    expect(shapes.size).toBe(8);
  });

  it('AC271: no vein tile is animated', () => {
    const animated = ['water', 'lava', 'vuur'];
    for (const id of VEIN_BLOCKS) {
      const spec = TILES[tileFor(id, 'side')];
      expect(animated).not.toContain(spec?.name);
      expect(spec?.name).toBe(`ader-${id}`);
    }
    expect(Object.keys(TILES[tileFor(43, 'side')] ?? {}).sort()).toEqual(['base', 'name', 'pattern', 'speckle']);
  });

  it('AC187: paints 8 solid rare tiles that all differ from each other', () => {
    const seen = new Set<string>();
    for (let id = 34; id <= 41; id++) {
      const d = paintTile(tileFor(id, 'side')).data;
      for (let i = 3; i < d.length; i += 4) expect(d[i]).toBe(255);
      seen.add(Array.from(d).join(','));
    }
    expect(seen.size).toBe(8);
  });

  it('gives grass its own top and side', () => {
    expect(tileFor(GRAS, 'top')).not.toBe(tileFor(GRAS, 'side'));
  });

  it('paints a 16 x 16 RGBA tile, the same every time', () => {
    const a = paintTile(tileFor(STEEN, 'side'));
    expect(a.width).toBe(TILE_SIZE);
    expect(a.data.length).toBe(TILE_SIZE * TILE_SIZE * 4);
    expect(Array.from(a.data)).toEqual(Array.from(paintTile(tileFor(STEEN, 'side')).data));
    expect(a.data[3]).toBe(255);
  });

  it('makes glass and leaves see through in places, stone solid', () => {
    const alphas = (id: number) => {
      const d = paintTile(tileFor(id, 'side')).data;
      return Array.from({ length: TILE_SIZE * TILE_SIZE }, (_, i) => d[i * 4 + 3]);
    };
    expect(alphas(GLAS)).toContain(0);
    expect(alphas(BLADEREN)).toContain(0);
    expect(alphas(BLADEREN)).toContain(255);
    expect(alphas(STEEN).every((a) => a === 255)).toBe(true);
  });

  it('paints the atlas with every tile in place', () => {
    const img = paintAtlas();
    expect(img.width).toBe(ATLAS_WIDTH);
    expect(img.height).toBe(ATLAS_HEIGHT);
    const t = tileFor(STEEN, 'top');
    const tile = paintTile(t);
    const ox = (t % ATLAS_COLUMNS) * TILE_SIZE;
    const oy = Math.floor(t / ATLAS_COLUMNS) * TILE_SIZE;
    const o = ((oy + 3) * ATLAS_WIDTH + ox + 5) * 4;
    expect(Array.from(img.data.slice(o, o + 4))).toEqual(Array.from(tile.data.slice((3 * TILE_SIZE + 5) * 4, (3 * TILE_SIZE + 5) * 4 + 4)));
  });

  it('keeps uv rectangles inside their tile', () => {
    for (let t = 0; t < TILES.length; t++) {
      const { u0, u1, v0, v1 } = tileUv(t);
      expect(u0).toBeLessThan(u1);
      expect(v0).toBeLessThan(v1);
      expect(u0).toBeGreaterThan(0);
      expect(v1).toBeLessThan(1);
    }
  });
});
