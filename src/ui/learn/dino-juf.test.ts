import { describe, expect, it } from 'vitest';
import { createDinoJuf } from './dino-juf';

describe('dino juf', () => {
  it('is decoration only and changes mood', () => {
    const j = createDinoJuf();
    expect(j.element.getAttribute('aria-hidden')).toBe('true');
    expect(j.mood()).toBe('happy');
    const before = j.element.querySelector('.juf-mouth')?.getAttribute('d');
    j.setMood('think');
    expect(j.mood()).toBe('think');
    expect(j.element.className).toContain('juf-think');
    expect(j.element.querySelector('.juf-mouth')?.getAttribute('d')).not.toBe(before);
  });
});
