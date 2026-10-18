import { describe, expect, it, vi } from 'vitest';
import { PLACEABLE_BLOCKS } from '../world/blocks';
import { createBlockGrid } from './block-grid';
import { createHotbar } from './hotbar';

function ptr(type: string, id = 1): Event {
  const e = new MouseEvent(type, { bubbles: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  return e;
}
const tap = (node: Element) => {
  node.dispatchEvent(ptr('pointerdown'));
  node.dispatchEvent(ptr('pointerup'));
};

describe('hotbar', () => {
  it('AC7: fills 8 slots and the Alle blokken button, and tells which slot was tapped', () => {
    const slots = Array.from({ length: 8 }, () => document.createElement('div'));
    const all = document.createElement('div');
    const onSelect = vi.fn();
    const onAllBlocks = vi.fn();
    const bar = createHotbar({ slots, allBlocksSlot: all, blocks: [1, 2, 3, 4, 6, 9, 10, 12], selected: 0, onSelect, onAllBlocks });
    expect(slots.every((s) => s.querySelector('button.hotbar-slot'))).toBe(true);
    expect(slots[5]!.querySelector('button')!.getAttribute('aria-label')).toBe('glas');
    expect(slots[0]!.querySelector('button')!.getAttribute('aria-pressed')).toBe('true');
    tap(slots[3]!.querySelector('button')!);
    expect(onSelect).toHaveBeenCalledWith(3);
    bar.setSelected(3);
    expect(slots[3]!.querySelector('button')!.getAttribute('aria-pressed')).toBe('true');
    expect(slots[0]!.querySelector('button')!.getAttribute('aria-pressed')).toBe('false');
    tap(all.querySelector('button')!);
    expect(onAllBlocks).toHaveBeenCalled();
    expect(all.textContent).toBe('Alle blokken');
    bar.destroy();
    expect(slots[0]!.querySelector('button')).toBeNull();
  });
});

describe('block grid', () => {
  function setup() {
    const zones: Element[] = [];
    const router = { addIgnoreZone: (z: Element) => (zones.push(z), () => {}), ownerOf: () => null, destroy() {} };
    const onPick = vi.fn();
    const grid = createBlockGrid({ router, onPick });
    document.body.append(grid.root);
    return { grid, zones, onPick };
  }

  it('AC7: shows all 16 building blocks and picking one reports it and closes', () => {
    const { grid, onPick, zones } = setup();
    expect(grid.isOpen()).toBe(false);
    grid.open();
    const buttons = grid.root.querySelectorAll('button.grid-block');
    expect(buttons).toHaveLength(32);
    expect(PLACEABLE_BLOCKS).toHaveLength(32);
    expect(zones).toContain(grid.root); // AC104: a touch here never turns the view
    tap(buttons[4]!);
    expect(onPick).toHaveBeenCalledWith(PLACEABLE_BLOCKS[4]);
    expect(grid.isOpen()).toBe(false);
    grid.destroy();
  });

  it('Klaar and a tap beside the panel close it without picking', () => {
    const { grid, onPick } = setup();
    grid.open();
    tap(grid.root.querySelector('.grid-close')!);
    expect(grid.isOpen()).toBe(false);
    grid.destroy();
    const again = setup();
    again.grid.open();
    tap(again.grid.root);
    expect(again.grid.isOpen()).toBe(false);
    expect(onPick).not.toHaveBeenCalled();
    expect(again.onPick).not.toHaveBeenCalled();
    again.grid.destroy();
  });
});
