// Compelling Dinowinkel UI view (T47, docs/SHOP_PRD.md, AC20, AC110, AC149).
// Four species cards with voxel emblems, personality blurbs, affordability progress bars,
// Kopen -> Ja/Nee confirmation, 12-cap banner, and live "Mijn Dino-verzameling" showcase.

import '../styles/shop.css';
import {
  buyState,
  capReached,
  chickenBuyState,
  MAX_CHICKENS,
  MAX_SHOP_DINOS,
  MSG_CAP_REACHED,
  shopDinoCount,
  type BuyState,
} from '../core/economy';
import { EGG_HATCH_SECONDS } from '../dinos/egg';
import { DINO_KINDS, SHOP_KINDS, type DinoKindId } from '../dinos/kinds';
import { el } from './dom';
import { onTap } from './tap';

export interface ShopDinoSummary {
  id?: string;
  kind: DinoKindId;
  name?: string;
  golden?: boolean;
  mode?: 'follow' | 'stay';
}

export interface ShopEggSummary {
  id?: string;
  kind: DinoKindId;
  golden?: boolean;
  playSeconds?: number;
}

export interface ShopViewState {
  points: number;
  dinos: readonly ShopDinoSummary[];
  eggs: readonly ShopEggSummary[];
  toastMessage?: string | null;
}

export interface ShopViewOptions {
  /** null while the points are still being read. The view opens at once with a placeholder and no Kopen (AC164). */
  state: ShopViewState | null;
  onBuy: (kind: DinoKindId) => Promise<void> | void;
  onClose: () => void;
  /** Optional shortcut to override the countdown and earn coins immediately. */
  onEarnCoins?: () => void;
  now?: () => number;
}

export interface ShopView {
  readonly element: HTMLElement;
  render(nextState: ShopViewState): void;
  destroy(): void;
}

interface SpeciesMeta {
  sizeLabel: string;
  trait: string;
}

export const SPECIES_META: Record<DinoKindId, SpeciesMeta> = {
  compy: {
    sizeLabel: 'Klein (0,8 blok)',
    trait: 'Snel & nieuwsgierig! Huppelt vrolijk overal achter je aan.',
  },
  triceratops: {
    sizeLabel: 'Middel (1,6 blok)',
    trait: 'Sterk & dapper! Met drie stoere hoorns en een groot nekschild.',
  },
  stegosaurus: {
    sizeLabel: 'Groot (1,8 blok)',
    trait: 'Rustig & vriendelijk! Heeft prachtige roze rugplaten.',
  },
  brachiosaurus: {
    sizeLabel: 'Reusachtig (2,4 blok hoog)',
    trait: 'De vriendelijke reus! Kijkt met zijn lange nek over je muren heen.',
  },
  kip: {
    sizeLabel: 'Klein (0,7 blok)',
    trait: 'Tok tok! Fladdert en scharrelt gezellig rond in je wereld.',
  },
};

export function createShopView(options: ShopViewOptions): ShopView {
  const emptyState: ShopViewState = { points: 0, dinos: [], eggs: [] };
  let loaded = options.state !== null;
  let state: ShopViewState = options.state ?? emptyState;
  let confirmingKind: DinoKindId | null = null;
  let purchaseInFlight = false;
  const cleanups: Array<() => void> = [];

  const modal = el('div', {
    class: 'shop-modal pause-card scrollable',
    attrs: { role: 'dialog', 'aria-label': 'Dinowinkel' },
  });
  const root = el('div', { class: 'shop-backdrop pause-backdrop' }, [modal]);

  function clearCleanups() {
    while (cleanups.length > 0) {
      cleanups.pop()?.();
    }
  }

  function buildArtEmblem(kind: DinoKindId): HTMLElement {
    const face = el('div', { class: 'shop-art-voxel' }, [
      el('span', { class: 'shop-art-eye' }),
      el('span', { class: 'shop-art-eye' }),
    ]);
    return el(
      'div',
      {
        class: `shop-art shop-art-${kind}`,
        attrs: { 'aria-hidden': 'true' },
      },
      [face],
    );
  }

  /** Progress bar and note when locked, then Kopen or the Ja/Nee question (AC20, AC110, AC149, decision 55). */
  function buyControls(
    kindId: DinoKindId,
    name: string,
    price: number,
    bState: BuyState,
    confirmText: string,
    withBar: boolean,
  ): HTMLElement[] {
    const bottomChildren: HTMLElement[] = [];
    if (loaded && !bState.canBuy && bState.note) {
      const note = el('p', {
        class: 'shop-card-note',
        text: bState.note,
        attrs: { 'data-testid': `shop-note-${kindId}` },
      });
      if (withBar) {
        const pct = Math.min(100, Math.max(0, Math.round((state.points / price) * 100)));
        const fill = el('div', { class: 'shop-progress-fill' });
        fill.style.width = `${pct}%`;
        bottomChildren.push(
          el('div', { class: 'shop-progress-wrap' }, [el('div', { class: 'shop-progress-track' }, [fill]), note]),
        );
      } else {
        bottomChildren.push(note);
      }
    }

    // Kopen button or Ja/Nee confirmation (AC20, AC110)
    if (loaded && confirmingKind === kindId && bState.canBuy) {
      const yesBtn = el('button', {
        class: 'shop-confirm-yes',
        text: 'Ja',
        attrs: {
          type: 'button',
          'data-testid': `shop-confirm-yes-${kindId}`,
        },
      });
      const noBtn = el('button', {
        class: 'shop-confirm-no',
        text: 'Nee',
        attrs: {
          type: 'button',
          'data-testid': `shop-confirm-no-${kindId}`,
        },
      });
      yesBtn.disabled = purchaseInFlight;

      cleanups.push(
        onTap(
          yesBtn,
          () => {
            if (purchaseInFlight) return;
            purchaseInFlight = true;
            yesBtn.disabled = true;
            Promise.resolve(options.onBuy(kindId)).finally(() => {
              purchaseInFlight = false;
              confirmingKind = null;
              renderView();
            });
          },
          { now: options.now },
        ),
        onTap(
          noBtn,
          () => {
            if (purchaseInFlight) return;
            confirmingKind = null;
            renderView();
          },
          { now: options.now },
        ),
      );

      bottomChildren.push(
        el(
          'div',
          {
            class: 'shop-confirm-box',
            attrs: { 'data-testid': `shop-confirm-${kindId}` },
          },
          [
            el('p', {
              class: 'shop-confirm-text',
              text: confirmText,
            }),
            el('div', { class: 'shop-confirm-actions' }, [yesBtn, noBtn]),
          ],
        ),
      );
    } else {
      const buyBtn = el('button', {
        class: 'shop-buy-btn',
        text: 'Kopen',
        attrs: {
          type: 'button',
          'data-testid': `shop-buy-${kindId}`,
          'aria-label': `Koop ${name} voor ${price} punten`,
        },
      });
      buyBtn.disabled = !loaded || !bState.canBuy;
      if (loaded && bState.canBuy) {
        cleanups.push(
          onTap(
            buyBtn,
            () => {
              confirmingKind = kindId;
              renderView();
            },
            { now: options.now },
          ),
        );
      }
      bottomChildren.push(buyBtn);
    }
    return bottomChildren;
  }

  function renderView() {
    clearCleanups();
    modal.replaceChildren();
    root.dataset.loading = String(!loaded);

    const shopCount = shopDinoCount([...state.dinos], [...state.eggs]);
    const goldenCount =
      state.dinos.filter((d) => d.golden).length + state.eggs.filter((e) => e.golden).length;
    const isCap = capReached(shopCount);

    // Header
    const walletBar = el('div', { class: 'shop-wallet-bar' }, [
      el('div', {
        class: 'shop-wallet-pill pause-points',
        text: loaded
          ? `\u{1FA99} ${state.points} ${state.points === 1 ? 'punt' : 'punten'}`
          : '\u{1FA99} \u{2026} punten',
        attrs: { 'data-testid': 'shop-points' },
      }),
      el('div', {
        class: 'shop-herd-pill',
        text: !loaded
          ? `\u{1F995} \u{2026} dino's`
          : goldenCount > 0
            ? `\u{1F995} ${shopCount} / ${MAX_SHOP_DINOS} dino's (\u{2B50} +${goldenCount} gouden)`
            : `\u{1F995} ${shopCount} / ${MAX_SHOP_DINOS} dino's`,
        attrs: { 'data-testid': 'shop-herd-count' },
      }),
    ]);

    if (options.onEarnCoins) {
      const earnBtn = el('button', {
        class: 'shop-earn-btn',
        text: 'Nu oefenen \u{1FA99}',
        attrs: { type: 'button', 'data-testid': 'shop-earn-coins' },
      });
      cleanups.push(
        onTap(
          earnBtn,
          () => {
            options.onEarnCoins?.();
          },
          { now: options.now },
        ),
      );
      walletBar.append(earnBtn);
    }

    const closeBtn = el('button', {
      class: 'shop-close-btn pause-btn pause-btn-primary',
      text: 'Sluiten',
      attrs: { type: 'button' },
    });
    cleanups.push(onTap(closeBtn, () => options.onClose(), { now: options.now }));

    const header = el('div', { class: 'shop-header pause-header' }, [
      el('div', { class: 'shop-title-wrap' }, [
        el('h2', { class: 'shop-title pause-title', text: 'Dinowinkel' }),
      ]),
      walletBar,
      closeBtn,
    ]);
    modal.append(header);

    // Optional celebration toast or 12-cap banner (AC149)
    if (state.toastMessage) {
      modal.append(
        el('p', {
          class: 'shop-banner shop-banner-toast',
          text: state.toastMessage,
          attrs: { 'data-testid': 'shop-toast' },
        }),
      );
    }
    if (isCap) {
      modal.append(
        el('p', {
          class: 'shop-banner shop-banner-cap',
          text: MSG_CAP_REACHED,
          attrs: { 'data-testid': 'shop-cap-banner' },
        }),
      );
    }

    // 4 Species Cards
    const grid = el('div', { class: 'shop-grid' });
    for (const kind of SHOP_KINDS) {
      const bState = buyState(state.points, shopCount, kind.id);
      const meta = SPECIES_META[kind.id];
      const ownedOfKind =
        state.dinos.filter((d) => d.kind === kind.id).length +
        state.eggs.filter((e) => e.kind === kind.id).length;

      const cardClasses = [
        'shop-card',
        bState.canBuy ? 'shop-card-affordable' : 'shop-card-greyed',
      ].join(' ');

      const chips: HTMLElement[] = [
        el('span', { class: 'shop-chip', text: meta.sizeLabel }),
      ];
      if (ownedOfKind > 0) {
        chips.push(
          el('span', {
            class: 'shop-chip shop-chip-owned',
            text: `In je kudde: ${ownedOfKind}`,
          }),
        );
      }

      const info = el('div', { class: 'shop-card-info' }, [
        el('div', { class: 'shop-card-title-row' }, [
          el('h3', { class: 'shop-card-name', text: kind.name }),
          el('span', {
            class: 'shop-card-price',
            text: `${kind.price} punten`,
          }),
        ]),
        el('div', { class: 'shop-card-meta' }, chips),
      ]);

      const topRow = el('div', { class: 'shop-card-top' }, [
        buildArtEmblem(kind.id),
        info,
      ]);

      const bottomChildren = buyControls(
        kind.id,
        kind.name,
        kind.price,
        bState,
        `Wil je een ${kind.name}-ei kopen voor ${kind.price} punten?`,
        true,
      );

      const card = el(
        'article',
        {
          class: cardClasses,
          attrs: {
            'data-dino-card': kind.id,
            'aria-disabled': String(!bState.canBuy),
          },
        },
        [topRow, ...bottomChildren],
      );
      grid.append(card);
    }
    modal.append(grid);

    // Kippenhok: 5 points a chicken, at most 10 (decision 55). Bought like an egg: Kopen, then Ja or Nee.
    const chickenCount = state.dinos.filter((d) => d.kind === 'kip').length;
    const cState = chickenBuyState(state.points, chickenCount);
    const chickenCoop = el(
      'section',
      {
        class: `shop-card ${cState.canBuy ? 'shop-card-affordable' : 'shop-card-greyed'} shop-chicken-coop`,
        attrs: { 'aria-label': 'Kippenhok', 'data-testid': 'shop-chicken-coop' },
      },
      [
        el('div', { class: 'shop-card-top' }, [
          buildArtEmblem('kip'),
          el('div', { class: 'shop-card-info' }, [
            el('div', { class: 'shop-card-title-row' }, [
              el('h3', { class: 'shop-card-name', text: '\u{1F414} Kippenhok' }),
              el('span', { class: 'shop-card-price', text: `${DINO_KINDS.kip.price} punten per kip` }),
            ]),
            el('div', { class: 'shop-card-meta' }, [
              el('span', { class: 'shop-chip', text: SPECIES_META.kip.sizeLabel }),
              el('span', {
                class: 'shop-chip shop-chip-owned',
                text: `Kippen: ${chickenCount} van de ${MAX_CHICKENS}`,
                attrs: { 'data-testid': 'shop-chicken-count' },
              }),
            ]),
          ]),
        ]),
        el(
          'div',
          { class: 'shop-coop-buy' },
          buyControls(
            'kip',
            DINO_KINDS.kip.name,
            DINO_KINDS.kip.price,
            cState,
            `Wil je een kip kopen voor ${DINO_KINDS.kip.price} punten?`,
            false,
          ),
        ),
      ],
    );
    modal.append(chickenCoop);

    // Live "Mijn Dino-verzameling" showcase
    const collectionItems: HTMLElement[] = [];
    for (const egg of state.eggs) {
      const sp = DINO_KINDS[egg.kind]?.name ?? egg.kind;
      const left = Math.max(1, Math.ceil(EGG_HATCH_SECONDS - (egg.playSeconds ?? 0)));
      collectionItems.push(
        el('span', {
          class: `shop-collection-item ${egg.golden ? 'shop-collection-item-golden' : ''}`,
          text: `\u{1F95A} ${sp}-ei (broedt nog ${left} s)`,
        }),
      );
    }
    for (const dino of state.dinos) {
      const sp = DINO_KINDS[dino.kind]?.name ?? dino.kind;
      const label = dino.name ? `${dino.name} (${sp})` : sp;
      const star = dino.golden ? '\u{2B50} ' : dino.kind === 'kip' ? '\u{1F414} ' : '\u{1F995} ';
      collectionItems.push(
        el('span', {
          class: `shop-collection-item ${dino.golden ? 'shop-collection-item-golden' : ''}`,
          text: `${star}${label}`,
        }),
      );
    }

    const collectionSection = el(
      'section',
      {
        class: 'shop-collection',
        attrs: { 'aria-label': 'Mijn Dino-verzameling', 'data-testid': 'shop-collection' },
      },
      [
        el('h3', {
          class: 'shop-collection-title',
          text: `Mijn Dino-verzameling (${state.dinos.length} dieren, ${state.eggs.length} eieren)`,
        }),
        collectionItems.length > 0
          ? el('div', { class: 'shop-collection-list' }, collectionItems)
          : el('p', {
              class: 'shop-card-note',
              text: 'Je hebt nog geen dino-eieren gekocht. Verdien munten en kies je eerste dino!',
            }),
      ],
    );
    modal.append(collectionSection);
  }

  renderView();

  return {
    element: root,
    render(nextState) {
      state = nextState;
      loaded = true;
      renderView();
    },
    destroy() {
      clearCleanups();
      root.remove();
    },
  };
}
