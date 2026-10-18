import { describe, expect, it, vi } from 'vitest';
import { BLOCK_GRID_ROWS, DIAMANT, PLACEABLE_BLOCKS, blockInfo } from '../world/blocks';
import { DEFAULT_HOTBAR, HOTBAR_SIZE } from '../game/build-controller';
import { createBlockGrid } from './block-grid';

function ptr(type: string, id = 1): Event {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}
const tap = (node: Element) => {
  node.dispatchEvent(ptr('pointerdown'));
  node.dispatchEvent(ptr('pointerup'));
};

// A tiny stand in for the build controller: the same rules as setSlotBlock.
function setup(selected = 2) {
  const zones: Element[] = [];
  const router = { addIgnoreZone: (z: Element) => (zones.push(z), () => {}), ownerOf: () => null, destroy() {} };
  const state = { hotbar: [...DEFAULT_HOTBAR], selected };
  const saves = vi.fn();
  const grid = createBlockGrid({
    router,
    getState: () => state,
    onPick: (slot, block) => {
      state.hotbar[slot] = block;
      state.selected = slot;
      saves();
    },
  });
  document.body.append(grid.root);
  return { grid, zones, state, saves };
}
const slots = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('button.grid-slot')];

describe('block grid (AC155, AC156)', () => {
  it('AC155: 32 tiles in 4 named rows, 8 slots above, the selected slot marked on open', () => {
    const { grid, zones } = setup(2);
    grid.open();
    expect(grid.root.querySelectorAll('button.grid-block')).toHaveLength(32);
    const rows = [...grid.root.querySelectorAll('.grid-row')];
    expect(rows.map((r) => r.getAttribute('data-row'))).toEqual(['Natuur', 'Steen', 'Bouwen', 'Kleur']);
    rows.forEach((r, i) => {
      const names = [...r.querySelectorAll('.grid-name')].map((n) => n.textContent);
      expect(names).toEqual(BLOCK_GRID_ROWS[i]!.blocks.map((id) => blockInfo(id).name));
    });
    expect(slots(grid.root)).toHaveLength(HOTBAR_SIZE);
    expect(slots(grid.root).map((b) => b.getAttribute('aria-pressed'))).toEqual(
      ['false', 'false', 'true', 'false', 'false', 'false', 'false', 'false'],
    );
    expect(zones).toContain(grid.root); // AC104
    grid.destroy();
  });

  it('AC156: slot 5 then diamant fills slot 5, selects it, closes, and leaves the other 7 alone', () => {
    const { grid, state, saves } = setup(0);
    const before = [...state.hotbar];
    grid.open();
    tap(slots(grid.root)[4]!); // slot 5
    expect(slots(grid.root)[4]!.getAttribute('aria-pressed')).toBe('true');
    const diamant = [...grid.root.querySelectorAll('button.grid-block')].find((b) => b.textContent?.includes('diamant'))!;
    tap(diamant);
    expect(state.hotbar[4]).toBe(DIAMANT);
    expect(state.selected).toBe(4);
    expect(grid.isOpen()).toBe(false);
    state.hotbar.forEach((b, i) => {
      if (i !== 4) expect(b).toBe(before[i]);
    });
    expect(saves).toHaveBeenCalledTimes(1);
    grid.destroy();
  });

  it('without choosing a slot, the block goes to the selected slot; the same block may sit twice', () => {
    vi.useFakeTimers({ toFake: ['performance'] });
    const { grid, state } = setup(6);
    grid.open();
    const first = grid.root.querySelector('button.grid-block')!;
    tap(first);
    expect(state.hotbar[6]).toBe(PLACEABLE_BLOCKS[0]);
    grid.open();
    expect(slots(grid.root)[6]!.getAttribute('aria-pressed')).toBe('true');
    // the same block into slot 1 as well (after the double tap guard has passed)
    vi.advanceTimersByTime(1000);
    tap(slots(grid.root)[1]!);
    tap(grid.root.querySelector('button.grid-block')!);
    expect(state.hotbar[1]).toBe(PLACEABLE_BLOCKS[0]);
    expect(state.hotbar[6]).toBe(PLACEABLE_BLOCKS[0]);
    vi.useRealTimers();
    grid.destroy();
  });

  it('Terug and a tap beside the panel change nothing', () => {
    const { grid, state, saves } = setup();
    const before = JSON.stringify(state);
    grid.open();
    tap(slots(grid.root)[5]!);
    tap(grid.root.querySelector('.grid-close')!);
    expect(grid.isOpen()).toBe(false);
    expect(grid.root.querySelector('.grid-close')!.textContent).toBe('Terug');
    grid.destroy();
    const again = setup();
    again.grid.open();
    tap(again.grid.root);
    expect(again.grid.isOpen()).toBe(false);
    expect(again.saves).not.toHaveBeenCalled();
    expect(JSON.stringify(state)).toBe(before);
    expect(saves).not.toHaveBeenCalled();
    again.grid.destroy();
  });

  it('a new game has the default 8 blocks', () => {
    expect(DEFAULT_HOTBAR).toHaveLength(8);
    const { grid } = setup(0);
    grid.open();
    expect(grid.root.querySelectorAll('.grid-slot-swatch')).toHaveLength(8);
    grid.destroy();
  });

  it('a fast double tap on a tile closes once and saves once', () => {
    const { grid, saves } = setup();
    grid.open();
    const tile = grid.root.querySelectorAll('button.grid-block')[10]!;
    tap(tile);
    tap(tile);
    expect(saves).toHaveBeenCalledTimes(1);
    expect(grid.isOpen()).toBe(false);
    grid.destroy();
  });
});
