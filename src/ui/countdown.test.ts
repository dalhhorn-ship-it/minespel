import { describe, expect, it } from 'vitest';
import { createCountdownView } from './countdown';

describe('countdown view', () => {
  it('shows the label and grows only in the last 30 seconds with warnings on', () => {
    const slot = document.createElement('div');
    const v = createCountdownView(slot);
    const node = slot.querySelector('.countdown') as HTMLElement;
    v.update(252_000, true);
    expect(node.textContent).toBe('Leerpauze over 4:12');
    expect(node.classList.contains('countdown-warning')).toBe(false);
    v.update(30_000, true);
    expect(node.classList.contains('countdown-warning')).toBe(true);
    v.update(30_000, false);
    expect(node.classList.contains('countdown-warning')).toBe(false);
    v.update(0, true);
    expect(node.textContent).toBe('Leerpauze over 0:00');
    expect(node.classList.contains('countdown-warning')).toBe(false);
    v.destroy();
    expect(slot.querySelector('.countdown')).toBeNull();
  });
});
