import { describe, expect, it } from 'vitest';
import { el } from '../ui/dom';
import { createScreenManager, type ScreenKind } from './screens';

describe('screens (T41)', () => {
  it('switches between world, kid-overlay, learn, exam and parent and returns to where the kid was', () => {
    const host = el('div');
    const seen: ScreenKind[] = [];
    const worldActive: boolean[] = [];
    const screens = createScreenManager({
      host,
      onWorldActiveChange: (a) => worldActive.push(a),
    });
    screens.subscribe((k) => seen.push(k));
    expect(screens.current()).toBe('world');

    screens.showKidOverlay(el('div', { text: 'Pauze' }));
    expect(screens.current()).toBe('kid-overlay');
    expect(worldActive.at(-1)).toBe(false);

    // Opening parent over a break returns to the break when closed (PRD 4.12).
    screens.showLearn(el('div', { text: 'Leerpauze' }));
    expect(screens.current()).toBe('learn');
    screens.showParent(el('div', { text: 'Ouders' }));
    expect(screens.current()).toBe('parent');
    expect(screens.underlyingKidScreen()).toBe('learn');

    screens.showParent(null);
    expect(screens.current()).toBe('learn');

    screens.showLearn(null);
    expect(screens.current()).toBe('world');
    expect(worldActive.at(-1)).toBe(true);
    screens.destroy();
  });
});
