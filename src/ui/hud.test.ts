// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { PointerRouter } from '../input/pointer-router';
import { createHud } from './hud';

function tap(el: Element) {
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

const router = { addIgnoreZone: () => () => undefined } as unknown as PointerRouter;

describe('world HUD parent lock (decision 53)', () => {
  it('shows a small icon only lock next to Pauze, not a labelled Ouders button', () => {
    const onParent = vi.fn();
    const hud = createHud({ router, onJump: vi.fn(), onMode: vi.fn(), onPause: vi.fn(), onParent });
    const lock = hud.root.querySelector('[data-testid="parent-controls-btn"]');
    expect(lock).not.toBeNull();
    expect(lock?.classList.contains('lock-icon-btn')).toBe(true);
    expect(lock?.textContent).toBe('\u{1F512}');
    expect(lock?.getAttribute('aria-label')).toBe('Ouders');
    expect(hud.root.textContent).not.toContain('Ouders');
    // A separate element from Pauze, so the two never overlap.
    const pause = Array.from(hud.root.querySelectorAll('button')).find((b) => b.textContent === 'Pauze');
    expect(pause).toBeDefined();
    expect(pause).not.toBe(lock);
    tap(lock!);
    expect(onParent).toHaveBeenCalledTimes(1);
    hud.destroy();
  });

  it('shows no lock when there is no parent handler', () => {
    const hud = createHud({ router, onJump: vi.fn(), onMode: vi.fn(), onPause: vi.fn() });
    expect(hud.root.querySelector('[data-testid="parent-controls-btn"]')).toBeNull();
    hud.destroy();
  });
});

describe('world HUD Winkel button (AC160, AC161)', () => {
  it('shows a "Winkel" button next to Pauze with the same classes and size rule, and opens the shop on a tap', () => {
    const onShop = vi.fn();
    const hud = createHud({ router, onJump: vi.fn(), onMode: vi.fn(), onPause: vi.fn(), onShop, onParent: vi.fn() });
    const winkel = hud.root.querySelector<HTMLElement>('[data-testid="hud-winkel"]');
    expect(winkel).not.toBeNull();
    expect(winkel?.classList.contains('hud-winkel')).toBe(true);
    expect(winkel?.classList.contains('hud-btn')).toBe(true);
    expect(winkel?.textContent).toBe('\u{1F95A} Winkel');
    const pause = hud.root.querySelector<HTMLElement>('.hud-pause');
    expect(pause).not.toBeNull();
    // Same group, Winkel directly before Pauze.
    expect(winkel?.parentElement).toBe(pause?.parentElement);
    expect(winkel?.nextElementSibling).toBe(pause);
    tap(winkel!);
    expect(onShop).toHaveBeenCalledTimes(1);
    hud.destroy();
  });

  it('is an ignore zone, so a touch on it never looks or taps the world', () => {
    const zones: Element[] = [];
    const r = { addIgnoreZone: (z: Element) => (zones.push(z), () => undefined) } as unknown as PointerRouter;
    const hud = createHud({ router: r, onJump: vi.fn(), onMode: vi.fn(), onPause: vi.fn(), onShop: vi.fn() });
    expect(zones).toContain(hud.root.querySelector('[data-testid="hud-winkel"]'));
    hud.destroy();
  });

  it('shows no Winkel button without a shop handler', () => {
    const hud = createHud({ router, onJump: vi.fn(), onMode: vi.fn(), onPause: vi.fn() });
    expect(hud.root.querySelector('[data-testid="hud-winkel"]')).toBeNull();
    hud.destroy();
  });

  it('Pauze and Winkel still act when the finger rolls 15 points, Spring does not (iPad finger roll)', () => {
    const onPause = vi.fn();
    const onShop = vi.fn();
    const onJump = vi.fn();
    const hud = createHud({ router, onJump, onMode: vi.fn(), onPause, onShop });
    const roll = (el: Element) => {
      el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
      el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 20, clientY: 5, bubbles: true }));
    };
    roll(hud.root.querySelector('.hud-pause')!);
    roll(hud.root.querySelector('.hud-winkel')!);
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onShop).toHaveBeenCalledTimes(1);
    roll(hud.root.querySelector('.hud-jump')!);
    expect(onJump).not.toHaveBeenCalled();
    hud.destroy();
  });
});
