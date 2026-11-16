// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { hasBannedWord } from '../core/kid-words';
import { carriedText, createLavakipCard, LAVAKIP_THANKS, missingText } from './lavakip-card';

function tap(node: Element, at = { x: 0, y: 0 }) {
  const init = { pointerId: 1, clientX: at.x, clientY: at.y, bubbles: true };
  node.dispatchEvent(new MouseEvent('pointerdown', init));
  node.dispatchEvent(new MouseEvent('pointerup', init));
}
const q = (card: { element: HTMLElement }, id: string) => card.element.querySelector(`[data-testid="${id}"]`) as HTMLElement;

function make(state: { points: number; carried: number }, extra: { onOrder?: () => Promise<unknown> | unknown } = {}) {
  let t = 0;
  const onSizzle = vi.fn();
  const onClose = vi.fn();
  const onOrder = vi.fn(
    extra.onOrder ??
      (() => {
        state.points -= 3;
        state.carried += 1;
        return true;
      }),
  );
  const card = createLavakipCard({ carried: () => state.carried, points: () => state.points, onOrder, onClose, onSizzle, now: () => (t += 1000) });
  document.body.append(card.element);
  const flush = async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  };
  return { card, onOrder, onClose, onSizzle, flush };
}

describe('Lavakip card (v23)', () => {
  it('AC314: shows the texts and the sizes at 7 points', () => {
    const { card } = make({ points: 7, carried: 0 });
    expect(q(card, 'lavakip-price').textContent).toBe('Een lavakip kost 3 punten.');
    expect(q(card, 'lavakip-order').textContent).toBe('Bestel een lavakip');
    expect(q(card, 'lavakip-count').textContent).toBe('Je hebt 0 lavakippen');
    expect(q(card, 'lavakip-hint').textContent).toBe('Tik op een dino, kip of ridder om hem te geven.');
    expect(q(card, 'lavakip-done').textContent).toBe('Klaar');
    expect(card.element.querySelector('h2')?.textContent).toBe('Lavakip-bar');
    expect(q(card, 'lavakip-order').getAttribute('aria-disabled')).toBe('false');
  });
  it('AC314: Bestel buys one, shows "1 lavakip", the thanks and the sizzle; then "Nog 2 punten nodig"', async () => {
    const s = { points: 7, carried: 0 };
    const { card, onOrder, onSizzle, flush } = make(s);
    tap(q(card, 'lavakip-order'));
    await flush();
    expect(onOrder).toHaveBeenCalledTimes(1);
    expect(q(card, 'lavakip-count').textContent).toBe('Je hebt 1 lavakip');
    expect(q(card, 'lavakip-note').textContent).toBe(LAVAKIP_THANKS);
    expect(onSizzle).toHaveBeenCalledTimes(1);
    tap(q(card, 'lavakip-order'));
    await flush();
    expect(s.points).toBe(1);
    expect(q(card, 'lavakip-note').textContent).toBe('Nog 2 punten nodig');
    expect(q(card, 'lavakip-order').getAttribute('aria-disabled')).toBe('true');
    tap(q(card, 'lavakip-order'));
    await flush();
    expect(onOrder).toHaveBeenCalledTimes(2);
  });
  it('AC314: a second tap while one is still writing does nothing', async () => {
    const s = { points: 30, carried: 0 };
    let release: (v: unknown) => void = () => undefined;
    const { card, onOrder } = make(s, { onOrder: () => new Promise((r) => (release = r)) });
    tap(q(card, 'lavakip-order'));
    tap(q(card, 'lavakip-order'));
    tap(q(card, 'lavakip-order'));
    expect(onOrder).toHaveBeenCalledTimes(1);
    release(true);
    for (let i = 0; i < 6; i++) await Promise.resolve();
    tap(q(card, 'lavakip-order'));
    expect(onOrder).toHaveBeenCalledTimes(2);
  });
  it('AC314: at 10 carried it is greyed with "Je hebt er al 10!" and does not order', () => {
    const { card, onOrder } = make({ points: 30, carried: 10 });
    expect(q(card, 'lavakip-note').textContent).toBe('Je hebt er al 10!');
    tap(q(card, 'lavakip-order'));
    expect(onOrder).not.toHaveBeenCalled();
  });
  it('AC314: a refused order shows no thanks and no sizzle', async () => {
    const { card, onSizzle, flush } = make({ points: 30, carried: 0 }, { onOrder: () => false });
    tap(q(card, 'lavakip-order'));
    await flush();
    expect(q(card, 'lavakip-note').textContent).toBe('');
    expect(onSizzle).not.toHaveBeenCalled();
  });
  it('AC313: Klaar closes the card', () => {
    const { card, onClose } = make({ points: 3, carried: 0 });
    tap(q(card, 'lavakip-done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('AC314: the words are right and kid safe', () => {
    expect(carriedText(1)).toBe('Je hebt 1 lavakip');
    expect(carriedText(2)).toBe('Je hebt 2 lavakippen');
    expect(missingText(1)).toBe('Nog 1 punt nodig');
    for (const t of [LAVAKIP_THANKS, carriedText(3), missingText(2), 'Je hebt er al 10!']) expect(hasBannedWord(t)).toBe(false);
  });
});
