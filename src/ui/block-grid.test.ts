// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { RARE_BLOCKS } from '../world/blocks';
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

describe('block grid Dorp tab', () => {
  function setup() {
    const router = { addIgnoreZone: () => () => {}, ownerOf: () => null, destroy() {} };
    const onPick = vi.fn();
    const grid = createBlockGrid({ router, onPick });
    document.body.append(grid.root);
    return { grid, onPick };
  }

  it('AC187: the Dorp tab shows 8 tiles, "?" for blocks not found, the counter, and only found blocks can be picked', () => {
    const { grid, onPick } = setup();
    grid.open();
    const dorp = grid.root.querySelector<HTMLButtonElement>('[data-testid="grid-cat-dorp"]')!;
    const count = grid.root.querySelector<HTMLElement>('[data-testid="grid-rare-count"]')!;
    const tiles = () => [...grid.root.querySelectorAll<HTMLButtonElement>('button.grid-rare')];
    expect(tiles().every((t) => t.hidden)).toBe(true);
    expect(grid.root.querySelectorAll('button.grid-block')).toHaveLength(32);
    tap(dorp);
    expect(tiles()).toHaveLength(8);
    expect(tiles().every((t) => !t.hidden)).toBe(true);
    expect(count.textContent).toBe('0 van de 8 gevonden');
    expect(tiles()[0]!.textContent).toContain('?');
    expect(tiles()[0]!.textContent).toContain('Een dorpeling heeft deze');
    tap(tiles()[0]!);
    expect(onPick).not.toHaveBeenCalled();
    expect(grid.isOpen()).toBe(true);

    grid.setFound([RARE_BLOCKS[1]!, RARE_BLOCKS[7]!]);
    expect(count.textContent).toBe('2 van de 8 gevonden');
    expect(tiles()[1]!.textContent).toBe('robijn');
    expect(tiles()[1]!.textContent).not.toContain('?');
    expect(tiles()[0]!.textContent).toContain('?');
    tap(tiles()[0]!);
    expect(onPick).not.toHaveBeenCalled();
    tap(tiles()[1]!);
    expect(onPick).toHaveBeenCalledWith(RARE_BLOCKS[1]);
    expect(grid.isOpen()).toBe(false);

    grid.setFound(RARE_BLOCKS);
    expect(count.textContent).toBe('8 van de 8 gevonden');
    grid.destroy();
  });

  it('AC187: the found option fills the Dorp tab at the start', () => {
    const router = { addIgnoreZone: () => () => {}, ownerOf: () => null, destroy() {} };
    const grid = createBlockGrid({ router, onPick: vi.fn(), found: [RARE_BLOCKS[0]!, RARE_BLOCKS[2]!, RARE_BLOCKS[3]!] });
    expect(grid.root.querySelector('[data-testid="grid-rare-count"]')!.textContent).toBe('3 van de 8 gevonden');
    grid.destroy();
  });
});

describe('block grid Diep tab', () => {
  function setup() {
    const router = { addIgnoreZone: () => () => {}, ownerOf: () => null, destroy() {} };
    const onPick = vi.fn();
    const grid = createBlockGrid({ router, onPick });
    document.body.append(grid.root);
    return { grid, onPick };
  }
  const labels = (grid: { root: HTMLElement }) =>
    [...grid.root.querySelectorAll<HTMLElement>('[data-testid^="grid-cat-"]')].map((b) => b.textContent);

  it('AC276: Diep comes after Dorp, with 8 tiles in price order, "?" for a stone not found, and a tap does nothing', () => {
    const { grid, onPick } = setup();
    grid.open();
    const l = labels(grid);
    expect(l.indexOf('Diep')).toBe(l.indexOf('Dorp') + 1);
    const tiles = () => [...grid.root.querySelectorAll<HTMLButtonElement>('button.grid-stone')];
    expect(tiles().every((t) => t.hidden)).toBe(true);
    tap(grid.root.querySelector('[data-testid="grid-cat-diep"]')!);
    expect(tiles().map((t) => t.dataset.blockId)).toEqual(['43', '44', '45', '46', '47', '48', '49', '50']);
    expect(tiles().every((t) => !t.hidden)).toBe(true);
    expect(tiles()[0]!.textContent).toContain('?');
    expect(tiles()[0]!.textContent).toContain('Ergens diep onder de grond');
    expect(grid.root.querySelector('[data-testid="grid-stone-count"]')!.textContent).toBe('0 van de 8 gekocht');
    tap(tiles()[0]!);
    expect(onPick).not.toHaveBeenCalled();
    expect(grid.isOpen()).toBe(true);
  });

  it('AC276: found not bought shows a lock and "Koop in de Dinowinkel" and does nothing; bought can be picked; counter counts bought', () => {
    const { grid, onPick } = setup();
    grid.setStones([43, 44, 45], [43]);
    grid.open();
    tap(grid.root.querySelector('[data-testid="grid-cat-diep"]')!);
    const tiles = [...grid.root.querySelectorAll<HTMLButtonElement>('button.grid-stone')];
    expect(tiles[1]!.textContent).toContain('\u{1F512}');
    expect(tiles[1]!.textContent).toContain('Koop in de Dinowinkel');
    expect(tiles[3]!.textContent).toContain('?');
    expect(tiles[0]!.textContent).toBe('Maansteen');
    expect(grid.root.querySelector('[data-testid="grid-stone-count"]')!.textContent).toBe('1 van de 8 gekocht');
    tap(tiles[1]!);
    tap(tiles[3]!);
    expect(onPick).not.toHaveBeenCalled();
    tap(tiles[0]!);
    expect(onPick).toHaveBeenCalledWith(43);
    expect(grid.isOpen()).toBe(false);
  });

  it('AC275: the slot row of the grid names a locked stone leeg', () => {
    const router = { addIgnoreZone: () => () => {}, ownerOf: () => null, destroy() {} };
    const grid = createBlockGrid({ router, onPick: vi.fn(), hotbar: [44, 1, 2, 3, 4, 5, 6, 7], isLocked: (id) => id === 44 });
    expect(grid.root.querySelector('[data-testid="grid-slot-0"]')!.textContent).toContain('leeg');
  });
});
