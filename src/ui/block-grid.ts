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
  ZANDSTEEN, RARE_BLOCKS, AMETHIST, KRISTAL, LICHTSTEEN, REGENBOOGSTEEN, ROBIJN, SAFFIER, SMARAGD,
  STERRENSTEEN, blockInfo,
} from '../world/blocks';
import { STONES, stoneById } from '../world/stones';
import { el } from './dom';
import { onTap } from './tap';

export type BlockCategoryId = 'all' | 'fire-gate' | 'stones' | 'nature' | 'wool' | 'dorp' | 'diep';

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
  { id: 'diep', label: 'Diep', blocks: STONES.map((s) => s.id) },
];

/** Tile colours for the rare blocks (the picture in the grid). */
const RARE_COLORS: Readonly<Record<number, string>> = {
  [SMARAGD]: 'radial-gradient(#d8ffe6 12%, #3deb82 40%, #16784a 100%)',
  [ROBIJN]: 'radial-gradient(#ffd0d8 12%, #fa3c5a 40%, #820e24 100%)',
  [SAFFIER]: 'radial-gradient(#d0e2ff 12%, #4682ff 40%, #183090 100%)',
  [AMETHIST]: 'radial-gradient(#f0d2ff 12%, #be6efa 40%, #4a1e78 100%)',
  [KRISTAL]: 'radial-gradient(#ffffff 15%, #aae8f8 55%, #60bee2 100%)',
  [LICHTSTEEN]: 'radial-gradient(#ffffeb 15%, #fff4aa 45%, #ffe26e 100%)',
  [REGENBOOGSTEEN]: 'linear-gradient(135deg, #ec3c3c, #f89628, #fae03c, #46be56, #3c78e6, #9e54d2)',
  [STERRENSTEEN]: 'radial-gradient(#fff 8%, #ffee78 14%, #18144a 40%, #18144a 100%)',
};

/** The picture of a stone: grey steen with bright specks in the stone colour. Empty for any other block. */
export function stoneBackground(id: number): string | undefined {
  const stone = stoneById(id);
  if (!stone) return undefined;
  const c = `rgb(${stone.colour.join(' ')})`;
  const speck = (x: number, y: number) => `radial-gradient(circle at ${x}% ${y}%, ${c} 0 9%, transparent 11%)`;
  return `${speck(22, 25)}, ${speck(68, 18)}, ${speck(45, 52)}, ${speck(80, 70)}, ${speck(25, 78)}, #8a8f98`;
}

export interface BlockGridOptions {
  router: PointerRouter;
  onPick: (block: number) => void;
  onOpenChange?: (open: boolean) => void;
  hotbar?: readonly number[];
  selectedSlot?: number;
  /** Rare block ids the kid has found (default none). */
  found?: readonly number[];
  onSelectSlot?: (slot: number) => void;
  /** True for a stone that is not bought: its hotbar slot shows empty (v20). */
  isLocked?: (block: number) => boolean;
}

export interface BlockGrid {
  readonly root: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  setHotbar?(blocks: readonly number[], selected: number): void;
  /** Tells the Dorp tab which rare blocks are found. */
  setFound(ids: readonly number[]): void;
  /** Tells the Diep tab which stones are found and bought (v20). */
  setStones(found: readonly number[], bought: readonly number[]): void;
  destroy(): void;
}

export function createBlockGrid(options: BlockGridOptions): BlockGrid {
  const cleanups: Array<() => void> = [];
  let currentHotbar: readonly number[] = options.hotbar ?? PLACEABLE_BLOCKS.slice(0, 8);
  let currentSelected = options.selectedSlot ?? 0;
  let activeCategory: BlockCategoryId = 'all';
  let foundSet = new Set<number>(options.found ?? []);
  let stonesFound = new Set<number>();
  let stonesBought = new Set<number>();

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
      const empty = options.isLocked?.(blockId) === true;
      const name = empty ? 'leeg' : info.name;
      swatch.style.background = empty ? '' : RARE_COLORS[blockId] ?? stoneBackground(blockId) ?? blockColor(blockId);
      nameEl.textContent = name;
      btn.setAttribute('aria-pressed', String(idx === currentSelected));
      btn.setAttribute('aria-label', `Vakje ${idx + 1}: ${name}`);
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

  // Diep tab: the 8 stones in price order. Not found is "?", found but not bought has a lock; both do nothing.
  const stoneEntries = STONES.map(({ id, name: stoneName }) => {
    const swatch = el('span', { class: 'grid-swatch' });
    const name = el('span', { class: 'grid-name' });
    const b = el('button', { class: 'grid-stone', attrs: { type: 'button', 'data-block-id': String(id) } }, [swatch, name]);
    cleanups.push(onTap(b, () => {
      if (!stonesBought.has(id)) return;
      options.onPick(id);
      close();
    }));
    return { id, stoneName, b, swatch, name };
  });
  const stoneCounter = el('div', { class: 'grid-rare-count', attrs: { 'data-testid': 'grid-stone-count' } });

  function syncStones() {
    let n = 0;
    for (const { id, stoneName, b, swatch, name } of stoneEntries) {
      const isFound = stonesFound.has(id);
      const isBought = stonesBought.has(id);
      if (isBought) n++;
      b.classList.toggle('grid-rare-locked', !isFound);
      b.classList.toggle('grid-stone-buy', isFound && !isBought);
      b.setAttribute('aria-disabled', String(!isBought));
      swatch.textContent = !isFound ? '?' : isBought ? '' : '\u{1F512}';
      swatch.style.background = isFound ? stoneBackground(id) ?? '' : '';
      name.textContent = !isFound ? 'Ergens diep onder de grond' : isBought ? stoneName : 'Koop in de Dinowinkel';
      b.setAttribute(
        'aria-label',
        !isFound ? 'Nog niet gevonden. Ergens diep onder de grond' : isBought ? stoneName : `${stoneName}. Koop in de Dinowinkel`,
      );
    }
    stoneCounter.textContent = `${n} van de ${STONES.length} gekocht`;
  }

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
    const diep = activeCategory === 'diep';
    for (const r of stoneEntries) r.b.hidden = !diep;
    stoneCounter.hidden = !diep;
  }

  syncHotbarRow();
  syncRare();
  syncStones();
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
    stoneCounter,
    el('div', { class: 'grid-cells' }, [...cellEntries.map((e) => e.b), ...rareEntries.map((e) => e.b), ...stoneEntries.map((e) => e.b)]),
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
    setStones(found, bought) {
      stonesFound = new Set(found);
      stonesBought = new Set(bought);
      syncStones();
    },
    destroy() {
      for (const c of cleanups) c();
      root.remove();
    },
  };
}
