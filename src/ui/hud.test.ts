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
