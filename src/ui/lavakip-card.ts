// The order card of the Lavakip-bar (v23, decision 144): Bestel, the count, the greyed states, the `sis` sizzle and
// "Alsjeblieft, een warme lavakip!". It goes in the kid overlay, so the loop and the play timer stop while it is open.
// Plain text only (textContent). A second tap on Bestel while one is still writing does nothing.
import '../styles/lavakip-card.css';
import { LAVAKIP_MAX, LAVAKIP_PRICE } from '../lavakip/lavakip-types';
import { el } from './dom';
import { onTap, REPEAT_MS } from './tap';

export interface LavakipCardOptions {
  /** Lavakip carried now, and the points of the kid. */
  carried: () => number;
  points: () => number;
  /** Bestel: orders one lavakip. A result of `false` means nothing was bought. */
  onOrder: () => Promise<unknown> | unknown;
  onClose: () => void;
  /** Plays the soft `sis` sizzle after a good order (boot passes `sound.play('sis')`). */
  onSizzle?: () => void;
  now?: () => number;
  doc?: Document;
}

export interface LavakipCard {
  readonly element: HTMLElement;
  /** Reads the points and the carried count again (the points may have changed since the card was made). */
  refresh(): void;
  destroy(): void;
}

export const LAVAKIP_THANKS = 'Alsjeblieft, een warme lavakip!';

/** "Je hebt 0 lavakippen", "Je hebt 1 lavakip". */
export function carriedText(n: number): string {
  return n === 1 ? 'Je hebt 1 lavakip' : `Je hebt ${n} lavakippen`;
}

/** "Nog 1 punt nodig", "Nog 2 punten nodig". */
export function missingText(n: number): string {
  return n === 1 ? 'Nog 1 punt nodig' : `Nog ${n} punten nodig`;
}

export function createLavakipCard(options: LavakipCardOptions): LavakipCard {
  const doc = options.doc;
  const pic = el('div', { class: 'lavakip-pic', attrs: { 'aria-hidden': 'true', 'data-testid': 'lavakip-pic' } }, [el('span', { class: 'lavakip-flame' }, [], doc)], doc);
  const price = el('p', { class: 'lavakip-price', text: `Een lavakip kost ${LAVAKIP_PRICE} punten.`, attrs: { 'data-testid': 'lavakip-price' } }, [], doc);
  const order = el('button', { class: 'lavakip-order', text: 'Bestel een lavakip', attrs: { type: 'button', 'data-testid': 'lavakip-order' } }, [], doc);
  const note = el('p', { class: 'lavakip-note', attrs: { 'data-testid': 'lavakip-note', 'aria-live': 'polite' } }, [], doc);
  const count = el('p', { class: 'lavakip-count', attrs: { 'data-testid': 'lavakip-count' } }, [], doc);
  const hint = el('p', { class: 'lavakip-hint', text: 'Tik op een dino, kip of ridder om hem te geven.', attrs: { 'data-testid': 'lavakip-hint' } }, [], doc);
  const done = el('button', { class: 'lavakip-done', text: 'Klaar', attrs: { type: 'button', 'data-testid': 'lavakip-done' } }, [], doc);
  const title = el('h2', { class: 'lavakip-title', text: 'Lavakip-bar' }, [], doc);
  const card = el(
    'div',
    { class: 'lavakip-card', attrs: { role: 'dialog', 'aria-label': 'Lavakip-bar', 'data-testid': 'lavakip-card-body' } },
    [title, pic, price, order, note, count, hint, done],
    doc,
  );
  const root = el('div', { class: 'lavakip-backdrop', attrs: { role: 'dialog', 'aria-label': 'Lavakip-bar', 'data-testid': 'lavakip-card' } }, [card], doc);

  let tick = 0;
  let busy = false;
  let gone = false;
  /** The reason Bestel is greyed, or null. */
  function reason(): string | null {
    if (options.carried() >= LAVAKIP_MAX) return `Je hebt er al ${LAVAKIP_MAX}!`;
    const points = options.points();
    if (points < LAVAKIP_PRICE) return missingText(LAVAKIP_PRICE - points);
    return null;
  }
  function render(thanks: boolean): void {
    const why = reason();
    count.textContent = carriedText(options.carried());
    order.classList.toggle('lavakip-grey', why !== null);
    order.setAttribute('aria-disabled', why !== null ? 'true' : 'false');
    note.textContent = why ?? (thanks ? LAVAKIP_THANKS : '');
    note.classList.toggle('lavakip-thanks', why === null && thanks);
  }
  render(false);

  const stopOrder = onTap(
    order,
    () => {
      if (busy || reason() !== null) return;
      busy = true;
      let started: Promise<unknown>;
      try {
        started = Promise.resolve(options.onOrder());
      } catch (e) {
        started = Promise.reject(e);
      }
      started.then(
          (result) => {
            busy = false;
            if (gone) return;
            const ok = result !== false;
            render(ok);
            if (ok) options.onSizzle?.();
          },
          () => {
            busy = false;
            if (!gone) render(false);
          },
      );
    },
    // Bestel has its own guard (`busy`), so every real tap counts: the clock jumps past the double tap window each time.
    { now: () => (tick += REPEAT_MS + 1) },
  );
  const stopDone = onTap(done, () => options.onClose(), { now: options.now });
  return {
    element: root,
    refresh() {
      if (!gone && !busy) render(false);
    },
    destroy() {
      gone = true;
      stopOrder();
      stopDone();
      root.remove();
    },
  };
}
