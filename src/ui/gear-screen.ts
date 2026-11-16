// The Uitrusten screen (AC261, v19): the flat picture of one knight and the wapenkast grouped by slot. A tap puts an
// item on, takes it off or moves it from another knight, at no cost. "Terug" goes back to the knight menu.
import '../styles/gear-screen.css';
import { gearById, GEAR_SLOTS, SLOT_LABELS, wornBy, type GearData, type GearItem, type GearSlot } from '../knights/gear';
import { el } from './dom';
import { gearIcon } from './gear-icon';
import { createKnightPicture } from './knight-picture';
import { onTap } from './tap';

export interface GearScreenOptions {
  knightId: string;
  /** The wapenkast and who wears what, read fresh after every change. */
  state: () => GearData;
  /** The knight ids in the order of the knight list, so "Ridder N" is the place plus 1. */
  knightIds: () => readonly string[];
  wear: (itemId: string | null, slot: GearSlot) => Promise<boolean>;
  onBack: () => void;
  now?: () => number;
}

export interface GearScreen {
  readonly element: HTMLElement;
  destroy(): void;
}

export const TEXT_EMPTY = 'Je wapenkast is nog leeg. In de Dinowinkel vind je uitrusting.';

export function createGearScreen(options: GearScreenOptions): GearScreen {
  const cleanups: Array<() => void> = [];
  const host = el('div', { class: 'gear-screen-host' });
  let alive = true;

  const numberOf = (id: string): number => options.knightIds().indexOf(id) + 1;

  function tapItem(item: GearItem, data: GearData): void {
    const mine = data.worn[options.knightId]?.[item.slot] === item.id;
    void options.wear(mine ? null : item.id, item.slot).then(() => {
      if (alive) render();
    });
  }

  function card(item: GearItem, data: GearData): HTMLElement {
    const by = wornBy(data, item.id);
    const mine = by === options.knightId;
    const status = mine ? 'Aan' : by ? `Bij Ridder ${numberOf(by)}` : '';
    const btn = el(
      'button',
      {
        class: 'gear-screen-item',
        attrs: { type: 'button', 'data-item': item.id, 'data-slot': item.slot, 'aria-pressed': String(mine) },
      },
      [
        gearIcon(item),
        el('span', { class: 'gear-screen-name', text: item.name }),
        el('span', { class: 'gear-screen-status', text: status }),
      ],
    );
    cleanups.push(onTap(btn, () => tapItem(item, options.state()), { now: options.now }));
    return btn;
  }

  function render(): void {
    while (cleanups.length > 0) cleanups.pop()?.();
    const data = options.state();
    const groups: HTMLElement[] = [];
    for (const slot of GEAR_SLOTS) {
      const items = data.owned.map((id) => gearById(id)).filter((g): g is GearItem => !!g && g.slot === slot);
      if (items.length === 0) continue;
      groups.push(
        el('section', { class: 'gear-screen-group', attrs: { 'data-slot': slot } }, [
          el('h3', { class: 'gear-screen-slot', text: SLOT_LABELS[slot] }),
          el('div', { class: 'gear-screen-items' }, items.map((i) => card(i, data))),
        ]),
      );
    }
    const back = el('button', {
      class: 'gear-screen-btn gear-screen-back',
      text: 'Terug',
      attrs: { type: 'button', 'data-action': 'back' },
    });
    cleanups.push(onTap(back, () => options.onBack(), { now: options.now }));
    const list = el('div', { class: 'gear-screen-list' }, groups.length > 0 ? groups : [el('p', { class: 'gear-screen-empty', text: TEXT_EMPTY })]);
    const n = numberOf(options.knightId);
    const card2 = el('div', { class: 'gear-screen-card', attrs: { role: 'dialog', 'aria-label': 'Uitrusten' } }, [
      el('h2', { class: 'gear-screen-title', text: n > 0 ? `Uitrusten: Ridder ${n}` : 'Uitrusten' }),
      el('div', { class: 'gear-screen-body' }, [
        el('div', { class: 'gear-screen-picture' }, [createKnightPicture(data.worn[options.knightId]) as unknown as HTMLElement]),
        list,
      ]),
      back,
    ]);
    host.replaceChildren(el('div', { class: 'gear-screen-backdrop' }, [card2]));
  }

  render();
  return {
    element: host,
    destroy() {
      alive = false;
      while (cleanups.length > 0) cleanups.pop()?.();
      host.remove();
    },
  };
}
