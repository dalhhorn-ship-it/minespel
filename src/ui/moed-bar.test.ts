// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createMoedBar } from './moed-bar';

describe('Moed bar (AC216)', () => {
  it('AC216: shows at a point, fills with the fraction and hides again', () => {
    const bar = createMoedBar();
    const node = document.querySelector<HTMLElement>('.moed-bar')!;
    expect(node.hidden).toBe(true);
    bar.update({ x: 100, y: 50 }, 0.25);
    expect(node.hidden).toBe(false);
    expect(node.querySelector<HTMLElement>('i')!.style.width).toBe('25%');
    bar.update({ x: 100, y: 50 }, 1);
    expect(node.querySelector<HTMLElement>('i')!.style.width).toBe('100%');
    bar.update(null, 0);
    expect(node.hidden).toBe(true);
    bar.dispose();
    expect(document.querySelector('.moed-bar')).toBeNull();
  });
});
