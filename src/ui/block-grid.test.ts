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
    expect(tiles()[1]!.querySelector('.grid-name')!.textContent).toBe('lavakristal');
    expect(tiles()[1]!.querySelector('.grid-rare-stock')!.textContent).toBe('0'); // AC187: with no stock it shows 0
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

  it('AC187, AC192: a found tile shows its stock; at 0 it is greyed with "0" and can still be picked; it still counts as found', () => {
    const { grid, onPick } = setup();
    const [a, b] = [RARE_BLOCKS[1]!, RARE_BLOCKS[4]!];
    grid.setFound([a, b]);
    grid.setStock({ [a]: 2, [b]: 0 });
    grid.open();
    tap(grid.root.querySelector('[data-testid="grid-cat-dorp"]')!);
    const tile = (id: number) => grid.root.querySelector<HTMLButtonElement>(`.grid-rare[data-block-id="${id}"]`)!;
    const stock = (id: number) => grid.root.querySelector<HTMLElement>(`[data-testid="grid-rare-stock-${id}"]`)!;
    expect(stock(a).textContent).toBe('2');
    expect(stock(a).hidden).toBe(false);
    expect(tile(a).classList.contains('grid-rare-empty')).toBe(false);
    expect(stock(b).textContent).toBe('0');
    expect(tile(b).classList.contains('grid-rare-empty')).toBe(true);
    expect(grid.root.querySelector('[data-testid="grid-rare-count"]')!.textContent).toBe('2 van de 8 gevonden');
    // A block not found shows no number.
    expect(stock(RARE_BLOCKS[0]!).hidden).toBe(true);
    expect(tile(RARE_BLOCKS[0]!).classList.contains('grid-rare-empty')).toBe(false);
    tap(tile(b));
    expect(onPick).toHaveBeenCalledWith(b);
    // Mined one back: no longer greyed.
    grid.setStock({ [a]: 2, [b]: 1 });
    expect(stock(b).textContent).toBe('1');
    expect(tile(b).classList.contains('grid-rare-empty')).toBe(false);
    grid.destroy();
  });

  it('AC187: the 32 building blocks show no count', () => {
    const { grid } = setup();
    grid.setStock({ [RARE_BLOCKS[0]!]: 4 });
    grid.open();
    for (const b of grid.root.querySelectorAll('button.grid-block')) {
      expect(b.querySelector('.grid-rare-stock')).toBeNull();
      expect(b.textContent).not.toMatch(/\d/);
    }
    grid.destroy();
  });
});
