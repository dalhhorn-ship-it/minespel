// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createPauseMenu } from './pause-menu';

function tap(el: Element) {
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

describe('pause menu (T44)', () => {
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
