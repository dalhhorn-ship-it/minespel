// The hotbar: 8 slots with a block colour each, and the "Alle blokken" button.
// A rare village block shows how many are left; at 0 its slot is greyed with "0" (decision 106).
// The 32 building blocks show no count.
// Fills the empty holders the HUD made. Those holders are already ignore zones.
import '../styles/hotbar.css';
import { blockColor } from '../render/effects';
import { RARE_BLOCKS, blockInfo } from '../world/blocks';
import { el } from './dom';
import { onTap } from './tap';

export interface HotbarOptions {
  slots: HTMLElement[];
  allBlocksSlot: HTMLElement;
  blocks: readonly number[];
  selected: number;
  onSelect: (slot: number) => void;
  onAllBlocks: () => void;
}

export interface Hotbar {
  setBlocks(blocks: readonly number[]): void;
  /** How many of each rare block are left, keyed by block id. A missing id means 0. */
  setStock(stock: Readonly<Record<number, number>>): void;
  setSelected(slot: number): void;
  destroy(): void;
}

export function createHotbar(options: HotbarOptions): Hotbar {
  const cleanups: Array<() => void> = [];
  const buttons = options.slots.map((holder, i) => {
    const swatch = el('span', { class: 'hotbar-swatch' });
    const count = el('span', { class: 'hotbar-count', attrs: { 'data-testid': `hotbar-count-${i}`, 'aria-hidden': 'true' } });
    count.hidden = true;
    const b = el('button', { class: 'hotbar-slot', attrs: { type: 'button', 'aria-pressed': 'false' } }, [swatch, count]);
    holder.append(b);
    cleanups.push(onTap(b, () => options.onSelect(i)));
    return { b, swatch, count };
  });
  let blocks: readonly number[] = options.blocks;
  let stock: Readonly<Record<number, number>> = {};
  const all = el('button', { class: 'hotbar-all', text: 'Alle blokken', attrs: { type: 'button' } });
  options.allBlocksSlot.append(all);
  cleanups.push(onTap(all, options.onAllBlocks));

  function render() {
    buttons.forEach(({ b, swatch, count }, i) => {
      const id = blocks[i];
      if (id === undefined) return;
      swatch.style.background = blockColor(id);
      b.setAttribute('aria-label', blockInfo(id).name);
      const rare = RARE_BLOCKS.includes(id);
      const n = rare ? Math.max(0, stock[id] ?? 0) : 0;
      count.hidden = !rare;
      count.textContent = rare ? String(n) : '';
      b.classList.toggle('hotbar-slot-empty', rare && n === 0);
    });
  }
  function setBlocks(next: readonly number[]) {
    blocks = [...next];
    render();
  }
  function setStock(next: Readonly<Record<number, number>>) {
    stock = { ...next };
    render();
  }
  function setSelected(slot: number) {
    buttons.forEach(({ b }, i) => b.setAttribute('aria-pressed', String(i === slot)));
  }
  setBlocks(options.blocks);
  setSelected(options.selected);

  return {
    setBlocks,
    setStock,
    setSelected,
    destroy() {
      for (const c of cleanups) c();
      for (const { b } of buttons) b.remove();
      all.remove();
    },
  };
}
