// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createPauseMenu } from './pause-menu';

function tap(el: Element) {
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

describe('pause menu (T44)', () => {
  it('the card can be scrolled by finger on a short screen', () => {
    const menu = createPauseMenu({
      points: 1,
      onResume: vi.fn(),
      onTeleportHome: vi.fn(),
      onShop: vi.fn(),
      onLesboek: vi.fn(),
      onPractice: vi.fn(),
    });
    expect(menu.element.querySelector('.pause-card')?.classList.contains('scrollable')).toBe(true);
  });

  it('shows points total and triggers callbacks for Terug naar de wereld, Ik zit vast, Dinowinkel, Lesboek, Extra oefenen, and Ouders', () => {
    const onResume = vi.fn();
    const onTeleportHome = vi.fn();
    const onShop = vi.fn();
    const onLesboek = vi.fn();
    const onPractice = vi.fn();
    const onParent = vi.fn();

    const menu = createPauseMenu({
      points: 14,
      onResume,
      onTeleportHome,
      onShop,
      onLesboek,
      onPractice,
      onParent,
    });

    expect(menu.element.textContent).toContain('14 punten');

    const buttons = Array.from(menu.element.querySelectorAll('button'));
    const byText = (label: string) => buttons.find((b) => b.textContent === label)!;

    tap(byText('Terug naar de wereld'));
    expect(onResume).toHaveBeenCalledTimes(1);

    tap(byText('Ik zit vast'));
    expect(onTeleportHome).toHaveBeenCalledTimes(1);

    tap(byText('Dinowinkel'));
    expect(onShop).toHaveBeenCalledTimes(1);

    tap(byText('Lesboek'));
    expect(onLesboek).toHaveBeenCalledTimes(1);

    tap(byText('Extra oefenen'));
    expect(onPractice).toHaveBeenCalledTimes(1);

    tap(byText('Ouders'));
    expect(onParent).toHaveBeenCalledTimes(1);

    menu.destroy();
  });
});

describe('pause menu points placeholder (AC163)', () => {
  it('shows a placeholder while the points are unknown, then the real total', () => {
    const menu = createPauseMenu({
      points: null,
      onResume: vi.fn(),
      onTeleportHome: vi.fn(),
      onShop: vi.fn(),
      onLesboek: vi.fn(),
      onPractice: vi.fn(),
    });
    const badge = () => menu.element.querySelector('[data-testid="pause-points"]')?.textContent;
    expect(badge()).toContain('\u{2026}');
    expect(badge()).not.toMatch(/\d/);
    // Every button is there and works before the points are known.
    expect(menu.element.querySelectorAll('.pause-btn').length).toBeGreaterThanOrEqual(5);
    menu.setPoints(7);
    expect(badge()).toContain('7 punten');
  });
});
