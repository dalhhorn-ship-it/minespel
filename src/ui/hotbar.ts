// The hotbar: 8 slots with a block colour each, and the "Alle blokken" button.
// Fills the empty holders the HUD made. Those holders are already ignore zones.
import '../styles/hotbar.css';
import { blockColor } from '../render/effects';
import { blockInfo } from '../world/blocks';
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
  setSelected(slot: number): void;
  destroy(): void;
}

export function createHotbar(options: HotbarOptions): Hotbar {
  const cleanups: Array<() => void> = [];
  const buttons = options.slots.map((holder, i) => {
    const swatch = el('span', { class: 'hotbar-swatch' });
    const b = el('button', { class: 'hotbar-slot', attrs: { type: 'button', 'aria-pressed': 'false' } }, [swatch]);
    holder.append(b);
    cleanups.push(onTap(b, () => options.onSelect(i)));
    return { b, swatch };
  });
  const all = el('button', { class: 'hotbar-all', text: 'Alle blokken', attrs: { type: 'button' } });
  options.allBlocksSlot.append(all);
  cleanups.push(onTap(all, options.onAllBlocks));

  function setBlocks(blocks: readonly number[]) {
    buttons.forEach(({ b, swatch }, i) => {
      const id = blocks[i];
      if (id === undefined) return;
      swatch.style.background = blockColor(id);
      b.setAttribute('aria-label', blockInfo(id).name);
    });
  }
  function setSelected(slot: number) {
    buttons.forEach(({ b }, i) => b.setAttribute('aria-pressed', String(i === slot)));
  }
  setBlocks(options.blocks);
  setSelected(options.selected);

  return {
    setBlocks,
    setSelected,
    destroy() {
      for (const c of cleanups) c();
      for (const { b } of buttons) b.remove();
      all.remove();
    },
  };
}
