// @vitest-environment jsdom
// The Uitrusting row of the Dinowinkel (V19b, AC258 to AC260, AC266).
import { describe, expect, it, vi } from 'vitest';
import { createKnightsSection } from './shop-knights';
import { createGearSection } from './shop-gear';

function tap(el: Element) {
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}
const q = (root: Element, id: string) => root.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

function make(state: { points: number; knightCount: number; owned: string[] }, onBuy = vi.fn()) {
  const host = document.createElement('div');
  document.body.append(host);
  const draw = () => host.replaceChildren(section.render(state, true));
  const section = createGearSection({ onBuy, onChange: draw });
  draw();
  return { host, onBuy, draw };
}

describe('Uitrusting row', () => {
  it('AC258 AC281: 21 cards in price order with name, slot, price and picture', () => {
    const { host } = make({ points: 100, knightCount: 1, owned: [] });
    const cards = [...host.querySelectorAll('.shop-gear-card')];
    expect(cards.map((c) => c.querySelector('.shop-card-name')?.textContent)).toEqual([
      'Leren kap', 'Houten schild', 'Houten zwaard', 'Riddercape', 'Kietelveer', 'Snelle laarzen', 'IJzeren helm', 'Banier',
      'IJzeren schild', 'Maliënkolder', 'Koningscape', 'Pluimhelm', 'Glimzwaard', 'Pony', 'Koningsbanier', 'Drakenschild',
      'Glanzend harnas', 'Bubbelstaf', 'Gouden helm', 'Strijdpaard', 'Rij-triceratops',
    ]);
    expect(cards.map((c) => c.querySelector('.shop-card-price')?.textContent)).toEqual([
      '10 punten', '10 punten', '10 punten', '15 punten', '20 punten', '20 punten', '25 punten', '25 punten',
      '30 punten', '30 punten', '40 punten', '45 punten', '50 punten', '50 punten', '55 punten', '60 punten',
      '70 punten', '75 punten', '80 punten', '90 punten', '120 punten',
    ]);
    expect(cards[20]!.textContent).toContain('Rijdier');
    expect(cards.every((c) => c.querySelector('.gear-icon'))).toBe(true);
  });

  it('AC259: Kopen then Ja buys once even with many taps, Nee buys nothing', async () => {
    const { host, onBuy } = make({ points: 100, knightCount: 1, owned: [] });
    tap(q(host, 'shop-buy-gear-pony')!);
    tap(q(host, 'shop-confirm-no-gear-pony')!);
    expect(onBuy).not.toHaveBeenCalled();
    tap(q(host, 'shop-buy-gear-pony')!);
    const yes = q(host, 'shop-confirm-yes-gear-pony')!;
    for (let i = 0; i < 10; i++) tap(yes);
    await vi.waitFor(() => expect(onBuy).toHaveBeenCalledTimes(1));
    expect(onBuy).toHaveBeenCalledWith('pony');
  });

  it('AC259: 49 points greys the Pony with "Nog 1 punt nodig"', () => {
    const { host } = make({ points: 49, knightCount: 1, owned: [] });
    expect(q(host, 'shop-note-gear-pony')!.textContent).toBe('Nog 1 punt nodig');
    expect((q(host, 'shop-buy-gear-pony') as HTMLButtonElement).disabled).toBe(true);
    expect(q(host, 'shop-note-gear-glimzwaard')!.textContent).toBe('Nog 1 punt nodig');
    expect(q(host, 'shop-note-gear-leren-kap')).toBeNull();
  });

  it('AC260: owned shows "In je wapenkast", no knight shows "Koop eerst een ridder"', () => {
    const a = make({ points: 100, knightCount: 1, owned: ['pony'] });
    expect(q(a.host, 'shop-note-gear-pony')!.textContent).toBe('In je wapenkast');
    expect(q(a.host, 'shop-buy-gear-pony')).toBeNull();
    const b = make({ points: 100, knightCount: 0, owned: [] });
    for (const btn of b.host.querySelectorAll('.shop-buy-btn')) expect((btn as HTMLButtonElement).disabled).toBe(true);
    expect(b.host.querySelectorAll('.shop-card-note')).toHaveLength(21);
    expect(q(b.host, 'shop-note-gear-pony')!.textContent).toBe('Koop eerst een ridder');
  });
});

describe('trade in line', () => {
  function trade(gearCount: number) {
    const host = document.createElement('div');
    const draw = () => host.replaceChildren(section.render({ points: 0, knights: [{ id: 'k1', gearCount }] }, true));
    const section = createKnightsSection({ onBuy: () => {}, onTradeIn: () => {}, onChange: draw });
    draw();
    tap(q(host, 'shop-knight-trade-k1')!);
    return host;
  }
  it('AC266: shows the line only when he wears something', () => {
    expect(trade(3).textContent).toContain('Zijn uitrusting gaat terug in de wapenkast.');
    expect(trade(0).textContent).not.toContain('wapenkast');
  });
});
