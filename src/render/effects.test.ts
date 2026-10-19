// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GRAS, PLACEABLE_BLOCKS } from '../world/blocks';
import { BLOCK_COLORS, MAX_BITS, POP_BITS, POP_MS, createEffects } from './effects';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.textContent = '';
});

describe('pop bits', () => {
  it('every building block has a colour', () => {
    for (const id of PLACEABLE_BLOCKS) expect(BLOCK_COLORS[id]).toBeTruthy();
  });

  it('makes bits at the tap point and removes them after a moment', () => {
    const c = document.createElement('div');
    document.body.append(c);
    const fx = createEffects(c);
    fx.pop(100, 200, GRAS);
    const bits = c.querySelectorAll('.pop-bit');
    expect(bits).toHaveLength(POP_BITS);
    expect((bits[0] as HTMLElement).style.left).toBe('95px');
    vi.advanceTimersByTime(POP_MS + 100);
    expect(c.querySelectorAll('.pop-bit')).toHaveLength(0);
    fx.dispose();
    expect(c.querySelector('.pop-layer')).toBeNull();
  });

  it('never shows more than the cap, however fast the taps', () => {
    const c = document.createElement('div');
    const fx = createEffects(c);
    for (let i = 0; i < 50; i++) fx.pop(10, 10, GRAS);
    expect(c.querySelectorAll('.pop-bit').length).toBeLessThanOrEqual(MAX_BITS);
    fx.dispose();
  });
});
