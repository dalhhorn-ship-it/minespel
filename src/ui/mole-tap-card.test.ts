// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createMoleTapCard, MOLE_TAP_TEXT } from './mole-tap-card';

const nodeFs = (
  globalThis as unknown as { process: { getBuiltinModule(n: string): { readFileSync(p: string, enc: string): string } } }
).process.getBuiltinModule('node:fs');
const css = nodeFs.readFileSync('src/styles/mole-tap-card.css', 'utf8');

function tap(node: Element) {
  node.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  node.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

/** The pixel value of a property inside the first rule that has this selector. */
function px(selector: string, prop: string): number {
  const rule = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  const m = new RegExp(`${prop}:\\s*(\\d+)px`).exec(rule);
  return m ? Number(m[1]) : 0;
}

describe('mole tap card (v22, AC298)', () => {
  it('AC298: says "Zzz... de Monstermol slaapt in zijn hok." as plain text in a dialog, with one OK and no link', () => {
    const card = createMoleTapCard({ onOk: vi.fn() });
    expect(MOLE_TAP_TEXT).toBe('Zzz... de Monstermol slaapt in zijn hok.');
    expect(card.element.querySelector('[role="dialog"]')).not.toBeNull();
    expect(card.element.querySelector('[data-testid="mole-tap-text"]')?.textContent).toBe(MOLE_TAP_TEXT);
    expect(card.element.querySelectorAll('button')).toHaveLength(1);
    expect(card.element.querySelector('button')?.textContent).toBe('OK');
    expect(card.element.querySelectorAll('a, img, script').length).toBe(0);
  });

  it('AC298: OK calls onOk on a tap', () => {
    const onOk = vi.fn();
    const card = createMoleTapCard({ onOk });
    tap(card.element.querySelector('[data-testid="mole-tap-ok"]') as Element);
    expect(onOk).toHaveBeenCalledTimes(1);
  });

  it('AC298: the OK is at least 56 x 56 points by the shipped stylesheet', () => {
    expect(px('.mole-tap-ok', 'min-height')).toBeGreaterThanOrEqual(56);
    expect(px('.mole-tap-ok', 'min-width')).toBeGreaterThanOrEqual(56);
  });

  it('AC298: destroy removes the card', () => {
    const card = createMoleTapCard({ onOk: vi.fn() });
    document.body.append(card.element);
    card.destroy();
    expect(card.element.isConnected).toBe(false);
  });
});
