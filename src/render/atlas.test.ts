import { describe, expect, it } from 'vitest';
import { AIR, BLADEREN, BLOCKS, GLAS, GRAS, MAX_BLOCK_ID, STEEN } from '../world/blocks';
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
    expect(MAX_BLOCK_ID).toBe(17);
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
