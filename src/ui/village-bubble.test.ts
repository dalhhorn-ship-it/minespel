// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { ASK_TEXT, createVillageBubble, HELLO_TEXT } from './village-bubble';

const nodeFs = (
  globalThis as unknown as { process: { getBuiltinModule(n: string): { readFileSync(p: string, enc: string): string } } }
).process.getBuiltinModule('node:fs');

function tap(node: Element, id = 1) {
  node.dispatchEvent(new PointerEvent('pointerdown', { pointerId: id, clientX: 5, clientY: 5, bubbles: true }));
  node.dispatchEvent(new PointerEvent('pointerup', { pointerId: id, clientX: 5, clientY: 5, bubbles: true }));
}

describe('village bubble (V11d)', () => {
  it('AC181: shows "Hoi! Wil je een vraag?" for a villager and hides again', () => {
    const b = createVillageBubble({ onTap: () => {} });
    document.body.append(b.element);
    expect(b.state()).toEqual({ visible: false, text: '', villager: null, canAsk: false });
    b.show('v3', true);
    expect(b.state()).toEqual({ visible: true, text: ASK_TEXT, villager: 'v3', canAsk: true });
    expect(ASK_TEXT).toBe('Hoi! Wil je een vraag?');
    b.hide();
    expect(b.state().visible).toBe(false);
    expect(b.element.hidden).toBe(true);
  });

  it('AC181: a tap on the bubble calls onTap once, also after a double tap', () => {
    let t = 0;
    const onTap = vi.fn();
    const b = createVillageBubble({ onTap, now: () => t });
    b.show('v1', true);
    tap(b.element);
    t += 100;
    tap(b.element);
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('AC182: with no question it is a plain "Hoi!" that nothing can open', () => {
    const onTap = vi.fn();
    const b = createVillageBubble({ onTap });
    b.show('v1', false);
    expect(b.state()).toMatchObject({ visible: true, text: HELLO_TEXT, canAsk: false });
    tap(b.element);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('AC181: the bubble is an ignore zone, so a tap on it never looks or taps the world', () => {
    const zones: Element[] = [];
    const b = createVillageBubble({ onTap: () => {}, router: { addIgnoreZone: (z) => { zones.push(z); return () => {}; } } });
    expect(zones).toEqual([b.element]);
  });

  it('AC181: plain text only, no markup is made from the text', () => {
    const b = createVillageBubble({ onTap: () => {} });
    b.show('v1', true);
    expect(b.element.children.length).toBe(0);
  });

  it('AC181: the stylesheet gives a tap area of at least 44 x 44, below the top bar and inside the safe area', () => {
    const css = nodeFs.readFileSync('src/styles/village.css', 'utf8');
    const rule = css.match(/\.village-bubble \{[^}]*\}/)?.[0] ?? '';
    expect(rule).toMatch(/min-height:\s*(6\d|[7-9]\d)px/);
    expect(rule).toMatch(/min-width:\s*(1\d\d|2\d\d)px/);
    expect(rule).toContain('var(--safe-top)');
    expect(rule).toContain('var(--touch-min)');
  });
});
