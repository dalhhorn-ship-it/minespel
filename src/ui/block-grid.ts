// "Alle blokken": all 32 blocks in four rows, with the 8 hotbar slots above. Tap a slot, then a block.
// The backdrop and the panel are ignore zones, so a tap here never reaches the world (AC104).
import '../styles/hotbar.css';
import type { PointerRouter } from '../input/pointer-router';
import { blockColor } from '../render/effects';
import { BLOCK_GRID_ROWS, blockInfo } from '../world/blocks';
import { HOTBAR_SIZE } from '../game/build-controller';
import { el } from './dom';
import { onTap } from './tap';

export interface BlockGridOptions {
  router: PointerRouter;
  /** The current hotbar blocks and selected slot, read each time the grid opens. */
  getState: () => { hotbar: readonly number[]; selected: number };
  /** The kid chose a block for a slot. The caller stores it, selects the slot and saves once. */
  onPick: (slot: number, block: number) => void;
}

export interface BlockGrid {
  readonly root: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export function createBlockGrid(options: BlockGridOptions): BlockGrid {
  const cleanups: Array<() => void> = [];
  let chosen = 0;

  // The 8 hotbar slots above the grid. Tap one to choose which slot gets the next block.
  const slotButtons = Array.from({ length: HOTBAR_SIZE }, (_, i) => {
    const swatch = el('span', { class: 'grid-slot-swatch' });
    const b = el('button', { class: 'grid-slot', attrs: { type: 'button', 'aria-pressed': 'false' } }, [swatch]);
    cleanups.push(onTap(b, () => {
      chosen = i;
      refreshSlots();
    }));
    return { b, swatch };
  });
  function refreshSlots() {
    const { hotbar } = options.getState();
    slotButtons.forEach(({ b, swatch }, i) => {
      const id = hotbar[i];
      if (id !== undefined) {
        swatch.style.background = blockColor(id);
        b.setAttribute('aria-label', `plek ${i + 1}: ${blockInfo(id).name}`);
      }
      b.setAttribute('aria-pressed', String(i === chosen));
    });
  }

  // One row of 8 tiles for each of the four groups of the PRD.
  const rows = BLOCK_GRID_ROWS.map((row) => {
    const tiles = row.blocks.map((id) => {
      const b = el('button', { class: 'grid-block', attrs: { type: 'button' } }, [
        el('span', { class: 'grid-swatch' }),
        el('span', { class: 'grid-name', text: blockInfo(id).name }),
      ]);
      (b.firstElementChild as HTMLElement).style.background = blockColor(id);
      cleanups.push(onTap(b, () => {
        if (root.hidden) return; // a fast second tap must not pick twice
        options.onPick(chosen, id);
        close();
      }));
      return b;
    });
    return el('div', { class: 'grid-row', attrs: { role: 'group', 'aria-label': row.label, 'data-row': row.label } }, tiles);
  });
  const closeBtn = el('button', { class: 'grid-close', text: 'Terug', attrs: { type: 'button' } });
  cleanups.push(onTap(closeBtn, () => close()));
  const panel = el('div', { class: 'grid-panel' }, [
    el('div', { class: 'grid-title', text: 'Alle blokken' }),
    el('div', { class: 'grid-slots' }, slotButtons.map((s) => s.b)),
    el('div', { class: 'grid-cells' }, rows),
    closeBtn,
  ]);
  const root = el('div', { class: 'block-grid', attrs: { role: 'dialog', 'aria-label': 'Alle blokken' } }, [panel]);
  root.hidden = true;
  cleanups.push(options.router.addIgnoreZone(root));
  // A tap beside the panel closes it.
  cleanups.push(onTap(root, (e) => {
    if (e.target === root) close();
  }));

  function close() {
    root.hidden = true;
  }
  return {
    root,
    open() {
      chosen = options.getState().selected;
      refreshSlots();
      root.hidden = false;
    },
    close,
    isOpen: () => !root.hidden,
    destroy() {
      for (const c of cleanups) c();
      root.remove();
    },
  };
}
