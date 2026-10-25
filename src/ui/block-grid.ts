// "Alle blokken": a panel with all 32 building blocks, category tabs, and a live 8-slot lower-bar chooser (CR1).
// Tap a slot in the lower-bar preview (or on the HUD) and tap any block to place it in that slot.
// The backdrop and the panel are ignore zones, so a tap here never reaches the world (AC104).
import '../styles/hotbar.css';
import type { PointerRouter } from '../input/pointer-router';
import { blockColor } from '../render/effects';
import {
  AARDE, BAKSTEEN, BASALT, BLADEREN, BOOMSTAM, DIAMANT, DIEPSTEEN, GLAS, GOUDSTEEN, GRANIET, GRAS,
  IJS, KEISTEEN, LAVA, MARMER, MOSSTEEN, OBSIDIAAN, PLACEABLE_BLOCKS, PLANKEN, SNEEUW, STEEN, VUUR,
  VUURSTEEN, WATER, WOL_BLAUW, WOL_GEEL, WOL_GROEN, WOL_ORANJE, WOL_PAARS, WOL_ROOD, WOL_WIT, ZAND,
  ZANDSTEEN, RARE_BLOCKS, METEORIET, IJSDIAMANT, BLIKSEMSTEEN, REGENBOOGKERN, LAVAKRISTAL, MAANSTEEN, DRAKENOOG,
  STERRENSTOF, blockInfo,
} from '../world/blocks';
import { el } from './dom';
import { onTap } from './tap';

export type BlockCategoryId = 'all' | 'fire-gate' | 'stones' | 'nature' | 'wool' | 'dorp';

interface BlockCategory {
  id: BlockCategoryId;
  label: string;
  blocks: readonly number[];
}

export const BLOCK_CATEGORIES: readonly BlockCategory[] = [
  { id: 'all', label: 'Alle (32)', blocks: PLACEABLE_BLOCKS },
  {
    id: 'fire-gate',
    label: 'Poort, Vuur & Lava',
    blocks: [OBSIDIAAN, VUUR, LAVA, VUURSTEEN, WATER],
  },
  {
    id: 'stones',
    label: 'Stenen & Schat',
    blocks: [STEEN, KEISTEEN, MOSSTEEN, ZANDSTEEN, GRANIET, MARMER, BASALT, DIEPSTEEN, BAKSTEEN, GOUDSTEEN, DIAMANT],
  },
  {
    id: 'nature',
    label: 'Natuur & Bouw',
    blocks: [GRAS, AARDE, ZAND, BOOMSTAM, PLANKEN, BLADEREN, GLAS, IJS, SNEEUW],
  },
  {
    id: 'wool',
    label: 'Wol & Kleur',
    blocks: [WOL_WIT, WOL_ROOD, WOL_ORANJE, WOL_GEEL, WOL_GROEN, WOL_BLAUW, WOL_PAARS],
  },
  { id: 'dorp', label: 'Dorp', blocks: RARE_BLOCKS },
];

/** Tile colours for the rare blocks (the picture in the grid). */
const RARE_COLORS: Readonly<Record<number, string>> = {
  [DRAKENOOG]: 'radial-gradient(#ffe45a 10%, #2fb25f 38%, #0f4a2a 100%)',
  [LAVAKRISTAL]: 'radial-gradient(#ffd23c 10%, #ff7a14 38%, #46090c 100%)',
  [MAANSTEEN]: 'radial-gradient(#f2f6ff 12%, #aab6d2 45%, #66749a 100%)',
  [METEORIET]: 'radial-gradient(#b8ff8c 10%, #3cd23c 38%, #121412 100%)',
  [IJSDIAMANT]: 'radial-gradient(#ffffff 12%, #8ad0f6 50%, #3c8cd2 100%)',
  [BLIKSEMSTEEN]: 'radial-gradient(#fff45a 12%, #ffb414 30%, #2c2e44 70%, #2c2e44 100%)',
  [REGENBOOGKERN]: 'radial-gradient(#fff 14%, #9e54d2 20%, #3c78e6 34%, #46be56 48%, #fae03c 62%, #f89628 76%, #ec3c3c 100%)',
  [STERRENSTOF]: 'radial-gradient(#fff 8%, #ffd646 16%, #10104a 42%, #10104a 100%)',
};

export interface BlockGridOptions {
  router: PointerRouter;
  onPick: (block: number) => void;
  onOpenChange?: (open: boolean) => void;
  hotbar?: readonly number[];
  selectedSlot?: number;
  /** Rare block ids the kid has found (default none). */
  found?: readonly number[];
  onSelectSlot?: (slot: number) => void;
}

export interface BlockGrid {
  readonly root: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  setHotbar?(blocks: readonly number[], selected: number): void;
  /** Tells the Dorp tab which rare blocks are found. */
  setFound(ids: readonly number[]): void;
  destroy(): void;
}

export function createBlockGrid(options: BlockGridOptions): BlockGrid {
  const cleanups: Array<() => void> = [];
  let currentHotbar: readonly number[] = options.hotbar ?? PLACEABLE_BLOCKS.slice(0, 8);
  let currentSelected = options.selectedSlot ?? 0;
  let activeCategory: BlockCategoryId = 'all';
  let foundSet = new Set<number>(options.found ?? []);

  // 8-slot lower-bar selector row inside the modal so the kid can pick which lower-bar slot to customize (CR1)
  const slotButtons = Array.from({ length: 8 }, (_, idx) => {
    const swatch = el('span', { class: 'grid-slot-swatch' });
    const nameEl = el('span', { class: 'grid-slot-name' });
    const btn = el(
      'button',
      {
        class: 'grid-slot',
        attrs: {
          type: 'button',
          'data-testid': `grid-slot-${idx}`,
          'aria-pressed': 'false',
        },
      },
      [
        swatch,
        nameEl,
      ],
    );
    cleanups.push(
      onTap(btn, () => {
        currentSelected = idx;
        options.onSelectSlot?.(idx);
        syncHotbarRow();
      }),
    );
    return { btn, swatch, nameEl };
  });

  function syncHotbarRow() {
    slotButtons.forEach(({ btn, swatch, nameEl }, idx) => {
      const blockId = currentHotbar[idx] ?? PLACEABLE_BLOCKS[0]!;
      const info = blockInfo(blockId);
      swatch.style.background = RARE_COLORS[blockId] ?? blockColor(blockId);
      nameEl.textContent = info.name;
      btn.setAttribute('aria-pressed', String(idx === currentSelected));
      btn.setAttribute('aria-label', `Vakje ${idx + 1}: ${info.name}`);
    });
  }

  // Category filter buttons
  const catButtons = BLOCK_CATEGORIES.map((cat) => {
    const btn = el('button', {
      class: 'grid-cat',
      text: cat.label,
      attrs: {
        type: 'button',
        'data-testid': `grid-cat-${cat.id}`,
        'aria-pressed': String(cat.id === activeCategory),
      },
    });
    cleanups.push(
      onTap(btn, () => {
        activeCategory = cat.id;
        syncCategoryFilter();
      }),
    );
    return { id: cat.id, blocks: cat.blocks, btn };
  });

  const cellEntries = PLACEABLE_BLOCKS.map((id) => {
    const b = el('button', { class: 'grid-block', attrs: { type: 'button', 'data-block-id': String(id) } }, [
      el('span', { class: 'grid-swatch' }),
      el('span', { class: 'grid-name', text: blockInfo(id).name }),
    ]);
    (b.firstElementChild as HTMLElement).style.background = blockColor(id);
    cleanups.push(onTap(b, () => {
      options.onPick(id);
      close();
    }));
    return { id, b };
  });

  // Dorp tab: the 8 rare blocks. A block not found yet is a dark "?" tile that does nothing.
  const rareEntries = RARE_BLOCKS.map((id) => {
    const swatch = el('span', { class: 'grid-swatch' });
    const name = el('span', { class: 'grid-name' });
    const b = el('button', { class: 'grid-rare', attrs: { type: 'button', 'data-block-id': String(id) } }, [swatch, name]);
    cleanups.push(onTap(b, () => {
      if (!foundSet.has(id)) return;
      options.onPick(id);
      close();
    }));
    return { id, b, swatch, name };
  });
  const counter = el('div', { class: 'grid-rare-count', attrs: { 'data-testid': 'grid-rare-count' } });

  function syncRare() {
    let n = 0;
    for (const { id, b, swatch, name } of rareEntries) {
      const isFound = foundSet.has(id);
      if (isFound) n++;
      b.classList.toggle('grid-rare-locked', !isFound);
      b.setAttribute('aria-disabled', String(!isFound));
      swatch.textContent = isFound ? '' : '?';
      swatch.style.background = isFound ? (RARE_COLORS[id] ?? blockColor(id)) : '';
      name.textContent = isFound ? blockInfo(id).name : 'Een dorpeling heeft deze';
      b.setAttribute('aria-label', isFound ? blockInfo(id).name : 'Nog niet gevonden. Een dorpeling heeft deze');
    }
    counter.textContent = `${n} van de ${RARE_BLOCKS.length} gevonden`;
  }

  function syncCategoryFilter() {
    const activeSpec = catButtons.find((c) => c.id === activeCategory) ?? catButtons[0]!;
    const allowed = new Set(activeSpec.blocks);
    for (const c of catButtons) {
      c.btn.setAttribute('aria-pressed', String(c.id === activeCategory));
    }
    for (const entry of cellEntries) {
      entry.b.hidden = !allowed.has(entry.id);
    }
    const dorp = activeCategory === 'dorp';
    for (const r of rareEntries) r.b.hidden = !dorp;
    counter.hidden = !dorp;
  }

  syncHotbarRow();
  syncRare();
  syncCategoryFilter();

  const closeBtn = el('button', { class: 'grid-close', text: 'Klaar', attrs: { type: 'button' } });
  cleanups.push(onTap(closeBtn, () => close()));

  const headerRow = el('div', { class: 'grid-header-row' }, [
    el('div', { class: 'grid-title', text: 'Alle blokken — Kies voor je balk' }),
    closeBtn,
  ]);
  const slotBar = el('div', { class: 'grid-slot-bar', attrs: { 'aria-label': 'Jouw onderste balk' } }, slotButtons.map((s) => s.btn));
  const catBar = el('div', { class: 'grid-cat-bar' }, catButtons.map((c) => c.btn));

  const panel = el('div', { class: 'grid-panel scrollable' }, [
    headerRow,
    slotBar,
    catBar,
    counter,
    el('div', { class: 'grid-cells' }, [...cellEntries.map((e) => e.b), ...rareEntries.map((e) => e.b)]),
  ]);
  const root = el('div', { class: 'block-grid', attrs: { role: 'dialog', 'aria-label': 'Alle blokken' } }, [panel]);
  root.hidden = true;
  cleanups.push(options.router.addIgnoreZone(root));
  // A tap beside the panel closes it.
  cleanups.push(onTap(root, (e) => {
    if (e.target === root) close();
  }));

  function close() {
    if (!root.hidden) {
      root.hidden = true;
      options.onOpenChange?.(false);
    }
  }
  return {
    root,
    open() {
      if (root.hidden) {
        activeCategory = 'all';
        syncCategoryFilter();
        syncHotbarRow();
        root.hidden = false;
        options.onOpenChange?.(true);
      }
    },
    close,
    isOpen: () => !root.hidden,
    setHotbar(blocks, selected) {
      currentHotbar = blocks;
      currentSelected = selected;
      syncHotbarRow();
    },
    setFound(ids) {
      foundSet = new Set(ids);
      syncRare();
    },
    destroy() {
      for (const c of cleanups) c();
      root.remove();
    },
  };
}
