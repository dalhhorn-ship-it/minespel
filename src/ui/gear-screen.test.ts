// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { wear, type GearData, type GearSlot } from '../knights/gear';
import { createGearScreen } from './gear-screen';

function tap(node: Element) {
  node.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, clientX: 1, clientY: 1 }));
  node.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true, clientX: 1, clientY: 1 }));
}
let t = 0;
const now = () => (t += 1000);

function setup(initial: GearData, knightId = 'b') {
  let data = initial;
  const wearFn = vi.fn(async (itemId: string | null, slot: GearSlot) => {
    data = wear(data, knightId, itemId, slot);
    return true;
  });
  const onBack = vi.fn();
  const screen = createGearScreen({ knightId, state: () => data, knightIds: () => ['a', 'b', 'c'], wear: wearFn, onBack, now });
  document.body.append(screen.element);
  const flush = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };
  return { screen, wearFn, onBack, flush, el: screen.element };
}
const item = (el: HTMLElement, id: string) => el.querySelector(`[data-item="${id}"]`)!;

describe('gear screen', () => {
  it('AC261: groups the owned items by slot in GEAR_SLOTS order', () => {
    const s = setup({ owned: ['pony', 'glimzwaard', 'leren-kap', 'ijzeren-helm', 'houten-schild'], worn: {} });
    const heads = [...s.el.querySelectorAll('.gear-screen-slot')].map((h) => h.textContent);
    expect(heads).toEqual(['Hoofd', 'Schild', 'Hand', 'Rijdier']);
    expect([...s.el.querySelectorAll('[data-slot="hoofd"] [data-item]')].map((n) => n.getAttribute('data-item'))).toEqual(['leren-kap', 'ijzeren-helm']);
  });
  it('AC261: an empty wapenkast shows a friendly line', () => {
    const s = setup({ owned: [], worn: {} });
    expect(s.el.querySelector('.gear-screen-empty')).not.toBeNull();
  });
  it('AC261: a tap puts an item on, another item of the slot replaces it, a tap on the worn item takes it off', async () => {
    const s = setup({ owned: ['ijzeren-helm', 'leren-kap'], worn: {} });
    tap(item(s.el, 'ijzeren-helm'));
    await s.flush();
    expect(s.wearFn).toHaveBeenLastCalledWith('ijzeren-helm', 'hoofd');
    expect(item(s.el, 'ijzeren-helm').getAttribute('aria-pressed')).toBe('true');
    expect(s.el.querySelector('[data-part="helm"]')).not.toBeNull();
    tap(item(s.el, 'leren-kap'));
    await s.flush();
    expect(item(s.el, 'ijzeren-helm').getAttribute('aria-pressed')).toBe('false');
    expect(item(s.el, 'leren-kap').getAttribute('aria-pressed')).toBe('true');
    tap(item(s.el, 'leren-kap'));
    await s.flush();
    expect(s.wearFn).toHaveBeenLastCalledWith(null, 'hoofd');
    expect(s.el.querySelector('[aria-pressed="true"]')).toBeNull();
    expect(s.el.querySelector('[data-part="helm-default"]')).not.toBeNull();
  });
  it('AC261: an item of another knight says "Bij Ridder 1" and a tap moves it here', async () => {
    const s = setup({ owned: ['glimzwaard'], worn: { a: { hand: 'glimzwaard' } } });
    expect(item(s.el, 'glimzwaard').querySelector('.gear-screen-status')!.textContent).toBe('Bij Ridder 1');
    tap(item(s.el, 'glimzwaard'));
    await s.flush();
    expect(item(s.el, 'glimzwaard').querySelector('.gear-screen-status')!.textContent).toBe('Aan');
  });
  it('AC261: Terug calls onBack', () => {
    const s = setup({ owned: [], worn: {} });
    tap(s.el.querySelector('.gear-screen-back')!);
    expect(s.onBack).toHaveBeenCalledTimes(1);
  });
});
