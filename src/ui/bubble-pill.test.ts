// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createBubbleHudState, type BubbleHudState } from '../monsters/bubble-hud';
import { createBubblePill } from './bubble-pill';

const state = (patch: Partial<BubbleHudState>): BubbleHudState => ({ ...createBubbleHudState(), shown: true, ...patch });
const count = (root: HTMLElement) => root.querySelectorAll('*').length;

describe('The bubble pill view (v22)', () => {
  it('AC303: nothing is drawn until the first shown state', () => {
    const slot = document.createElement('div');
    const view = createBubblePill(slot);
    view.update(state({ shown: false }));
    view.hide();
    expect(slot.children.length).toBe(0);
  });

  it('AC303: the clock shows one line with no hourglass, no arrow, no animation or colour class', () => {
    const slot = document.createElement('div');
    const view = createBubblePill(slot);
    view.update(state({ kind: 'clock', text: 'Bubbel over 3:20' }));
    const pill = slot.querySelector<HTMLElement>('.bubble-pill')!;
    expect(pill.hidden).toBe(false);
    expect(pill.textContent).not.toContain('⏳');
    expect(slot.querySelector('.bubble-pill-text')!.textContent).toBe('Bubbel over 3:20');
    expect(slot.querySelector<HTMLElement>('.bubble-pill-arrow')!.hidden).toBe(true);
    for (const kind of ['clock', 'soon', 'bubble', 'klodder', 'mole'] as const) {
      view.update(state({ kind, text: `t ${kind}`, angle: 10 }));
      expect(pill.className).toBe('bubble-pill');
    }
  });

  it('AC304: the arrow turns by one transform write and the long way round is avoided', () => {
    const slot = document.createElement('div');
    const view = createBubblePill(slot);
    view.update(state({ kind: 'bubble', text: 'Bubbel: 4 blokken', angle: 170 }));
    const arrow = slot.querySelector<HTMLElement>('.bubble-pill-arrow')!;
    expect(arrow.hidden).toBe(false);
    expect(arrow.style.transform).toBe('rotate(170deg)');
    view.update(state({ kind: 'bubble', text: 'Bubbel: 4 blokken', angle: -170 }));
    expect(arrow.style.transform).toBe('rotate(190deg)');
  });

  it('AC303: no node is made after the first render, and text goes through textContent', () => {
    const slot = document.createElement('div');
    const view = createBubblePill(slot);
    view.update(state({ kind: 'clock', text: 'Bubbel over 1:00' }));
    const n = count(slot);
    view.update(state({ kind: 'klodder', text: '<b>Klodder</b>: 2 blokken', angle: 5 }));
    view.update(state({ kind: 'mole', text: 'Mol: 7 blokken boven je', angle: 90 }));
    view.hide();
    view.update(state({ kind: 'clock', text: 'Bubbel over 0:59' }));
    expect(count(slot)).toBe(n);
    view.update(state({ kind: 'klodder', text: '<b>Klodder</b>', angle: 5 }));
    expect(slot.querySelector('b')).toBeNull();
  });

  it('AC306: hide hides the pill and a later state shows the same text again', () => {
    const slot = document.createElement('div');
    const view = createBubblePill(slot);
    view.update(state({ kind: 'clock', text: 'Bubbel over 2:00' }));
    view.hide();
    const pill = slot.querySelector<HTMLElement>('.bubble-pill')!;
    expect(pill.hidden).toBe(true);
    view.update(state({ kind: 'clock', text: 'Bubbel over 2:00' }));
    expect(pill.hidden).toBe(false);
    expect(pill.textContent).toContain('Bubbel over 2:00');
  });

  it('destroy removes the pill', () => {
    const slot = document.createElement('div');
    const view = createBubblePill(slot);
    view.update(state({ text: 'x' }));
    view.destroy();
    expect(slot.children.length).toBe(0);
  });
});
