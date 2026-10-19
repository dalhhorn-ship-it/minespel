// @vitest-environment jsdom
// The Dinowinkel opens at once, even when saved data never answers, and nothing can be bought before the points are read (AC164).
import { describe, expect, it, vi } from 'vitest';
import type { Records } from '../storage/records';
import { defaultKv } from '../storage/schema';
import { createShopFlow } from './shop-flow';
import type { ScreenManager } from './screens';

function tap(el: Element) {
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

function fakeScreens() {
  let shown: HTMLElement | null = null;
  const screens = {
    showKidOverlay: vi.fn((n: HTMLElement | null) => {
      shown = n;
    }),
    showWorld: vi.fn(() => {
      shown = null;
    }),
  } as unknown as ScreenManager;
  return { screens, shown: () => shown };
}

/** A records whose reads wait until the test lets them through. */
function gatedRecords(points: number) {
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const records = {
    get: vi.fn(async (name: string) => {
      await gate;
      if (name === 'economy') return { ...defaultKv('economy'), points };
      return defaultKv(name as 'dinos');
    }),
    put: vi.fn(async () => {}),
    update: vi.fn(),
  } as unknown as Records;
  return { records, release };
}

describe('Dinowinkel opens at once (AC164)', () => {
  it('shows the shop with a points placeholder while the read never finishes', () => {
    const { screens, shown } = fakeScreens();
    const records = { get: vi.fn(() => new Promise(() => {})), put: vi.fn(), update: vi.fn() } as unknown as Records;
    const flow = createShopFlow({ screens, records });
    void flow.open(); // not awaited: the read hangs
    const el = shown();
    expect(el).not.toBeNull();
    expect(el?.querySelector('[data-testid="shop-points"]')?.textContent).toContain('\u{2026}');
    expect(el?.getAttribute('data-loading')).toBe('true');
  });

  it('has no tappable Kopen button before the points are read, and tapping does nothing', () => {
    const { screens, shown } = fakeScreens();
    const records = { get: vi.fn(() => new Promise(() => {})), put: vi.fn(), update: vi.fn() } as unknown as Records;
    const flow = createShopFlow({ screens, records });
    void flow.open();
    const buttons = Array.from(shown()!.querySelectorAll<HTMLButtonElement>('.shop-buy-btn'));
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) {
      expect(b.disabled).toBe(true);
      tap(b);
    }
    expect(shown()?.querySelector('.shop-confirm-box')).toBeNull();
    expect(shown()?.querySelector('.shop-confirm-yes')).toBeNull();
    expect(records.put).not.toHaveBeenCalled();
  });

  it('fills in the points and enables Kopen once the read finishes', async () => {
    const { screens, shown } = fakeScreens();
    const { records, release } = gatedRecords(200);
    const flow = createShopFlow({ screens, records });
    const opened = flow.open();
    expect(shown()?.querySelector('[data-testid="shop-points"]')?.textContent).toContain('\u{2026}');
    release();
    await opened;
    expect(shown()?.querySelector('[data-testid="shop-points"]')?.textContent).toContain('200 punten');
    expect(shown()?.getAttribute('data-loading')).toBe('false');
    const buy = shown()!.querySelector<HTMLButtonElement>('[data-testid="shop-buy-triceratops"]')!;
    expect(buy.disabled).toBe(false);
  });

  it('Sluiten works before the points are read and goes back to the world', () => {
    const { screens, shown } = fakeScreens();
    const records = { get: vi.fn(() => new Promise(() => {})), put: vi.fn(), update: vi.fn() } as unknown as Records;
    const flow = createShopFlow({ screens, records });
    void flow.open();
    tap(shown()!.querySelector('.shop-close-btn')!);
    expect(screens.showWorld).toHaveBeenCalledTimes(1);
    expect(shown()).toBeNull();
  });
});
