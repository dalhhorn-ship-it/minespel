// "Alle blokken": a panel with the 16 building blocks. Tap one to put it in the selected slot.
// The backdrop and the panel are ignore zones, so a tap here never reaches the world (AC104).
import '../styles/hotbar.css';
import type { PointerRouter } from '../input/pointer-router';
import { blockColor } from '../render/effects';
import { PLACEABLE_BLOCKS, blockInfo } from '../world/blocks';
import { el } from './dom';
import { onTap } from './tap';

export interface BlockGridOptions {
  router: PointerRouter;
  onPick: (block: number) => void;
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
  const cells = PLACEABLE_BLOCKS.map((id) => {
    const b = el('button', { class: 'grid-block', attrs: { type: 'button' } }, [
      el('span', { class: 'grid-swatch' }),
      el('span', { class: 'grid-name', text: blockInfo(id).name }),
    ]);
    (b.firstElementChild as HTMLElement).style.background = blockColor(id);
    cleanups.push(onTap(b, () => {
      options.onPick(id);
      close();
    }));
    return b;
  });
  const closeBtn = el('button', { class: 'grid-close', text: 'Klaar', attrs: { type: 'button' } });
  cleanups.push(onTap(closeBtn, () => close()));
  const panel = el('div', { class: 'grid-panel' }, [
    el('div', { class: 'grid-title', text: 'Alle blokken' }),
    el('div', { class: 'grid-cells' }, cells),
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
