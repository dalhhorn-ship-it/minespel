import { describe, expect, it } from 'vitest';
import { TILE_SIZE, paintTile, tileFor } from '../../render/atlas';
import { DIAMANT, GOUDSTEEN, GRAS } from '../../world/blocks';
import { contrastRatio } from '../contrast';
import { applyMcBackground, paintScene, SCENE_COLS, SCENE_ROWS, sceneTiles } from './mc-background';

describe('minecraft background scene', () => {
  const tiles = sceneTiles();
  const flat = tiles.flat();

  it('has the right size and only real tiles', () => {
    expect(tiles).toHaveLength(SCENE_ROWS);
    for (const row of tiles) expect(row).toHaveLength(SCENE_COLS);
    expect(flat.every((t) => t >= 0)).toBe(true);
  });

  it('has a band of grass on top, then dirt, then stone below', () => {
    expect(tiles[0]!.every((t) => t === tileFor(GRAS, 'top'))).toBe(true);
    expect(new Set(tiles[1]).size).toBe(1);
    expect(new Set(tiles[SCENE_ROWS - 1]).size).toBeGreaterThan(1);
    expect(tiles[1]![0]).not.toBe(tiles[SCENE_ROWS - 2]![0]);
  });

  it('has gold and diamond ore blocks', () => {
    expect(flat).toContain(tileFor(GOUDSTEEN, 'side'));
    expect(flat).toContain(tileFor(DIAMANT, 'side'));
  });

  it('paints the tiles of the game at the right place and is the same every time', () => {
    const a = paintScene();
    const b = paintScene();
    expect(a.width).toBe(SCENE_COLS * TILE_SIZE);
    expect(a.height).toBe(SCENE_ROWS * TILE_SIZE);
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
    // First pixel row of the top left block is the first pixel row of the grass tile.
    const grass = paintTile(tileFor(GRAS, 'top'));
    expect(Array.from(a.data.subarray(0, TILE_SIZE * 4))).toEqual(Array.from(grass.data.subarray(0, TILE_SIZE * 4)));
    // Fully opaque, so nothing shines through.
    for (let i = 3; i < a.data.length; i += 4) expect(a.data[i]).toBe(255);
  });

  it('sets and clears the css variable', () => {
    const div = document.createElement('div');
    applyMcBackground(div, 'data:image/png;base64,AAAA');
    expect(div.style.getPropertyValue('--mc-bg')).toContain('data:image/png');
    applyMcBackground(div, null);
    expect(div.style.getPropertyValue('--mc-bg')).toBe('');
  });
});

describe('minecraft menu colours', () => {
  const nodeFs = (
    globalThis as unknown as { process: { getBuiltinModule(n: string): { readFileSync(p: string, enc: string): string } } }
  ).process.getBuiltinModule('node:fs');
  const css = nodeFs.readFileSync('src/styles/mc-menu.css', 'utf8');
  const v = (name: string) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))![1]!;

  it('body text on the stone panel and on sunken slots is at least 4.5:1', () => {
    expect(contrastRatio(v('mc-text'), v('mc-panel'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#000000', v('mc-slot'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#0d3d18', v('mc-slot'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#5c2300', v('mc-slot'))).toBeGreaterThanOrEqual(4.5);
  });

  it('button text is readable', () => {
    expect(contrastRatio(v('mc-text'), v('mc-btn'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(v('mc-text'), v('mc-btn-down'))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#ffffff', v('mc-green'))).toBeGreaterThanOrEqual(4.5);
  });

  it('the stylesheets have no hover rules and buttons have a pressed look', () => {
    for (const f of ['mc-menu', 'break', 'lesson', 'questions', 'keyboard']) {
      expect(nodeFs.readFileSync(`src/styles/${f}.css`, 'utf8')).not.toContain(':hover');
    }
    expect(css).toContain('.q-option:active');
    expect(css).toContain('translateY');
  });
});
