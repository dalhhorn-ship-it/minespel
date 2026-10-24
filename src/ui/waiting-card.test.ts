// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createWaitingCard, FAILED_TEXT, WAITING_TEXT } from './waiting-card';

const nodeFs = (
  globalThis as unknown as { process: { getBuiltinModule(n: string): { readFileSync(p: string, enc: string): string } } }
).process.getBuiltinModule('node:fs');
const css = nodeFs.readFileSync('src/styles/waiting-card.css', 'utf8');

function tap(node: Element) {
  node.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  node.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

describe('waiting card (R1b)', () => {
  it('is a dialog with plain "Even geduld..." text and a Terug button', () => {
    const card = createWaitingCard({ onBack: vi.fn() });
    expect(card.element.querySelector('[role="dialog"]')).not.toBeNull();
    expect(card.element.querySelector('.waiting-text')?.textContent).toBe(WAITING_TEXT);
    expect(card.element.querySelector('button')?.textContent).toBe('Terug');
    expect(card.element.querySelectorAll('a, img, script').length).toBe(0);
  });

  it('Terug calls onBack on a tap', () => {
    const onBack = vi.fn();
    const card = createWaitingCard({ onBack });
    tap(card.element.querySelector('button') as Element);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('showFailure and the failed option give the friendly cannot-load text', () => {
    const card = createWaitingCard({ onBack: vi.fn() });
    card.showFailure();
    expect(card.element.querySelector('.waiting-text')?.textContent).toBe(FAILED_TEXT);
    expect(createWaitingCard({ onBack: vi.fn(), failed: true }).element.textContent).toContain(FAILED_TEXT);
  });

  it('the shipped stylesheet makes Terug at least 56px tall', () => {
    const rule = /\.waiting-back\s*{[^}]*}/.exec(css)?.[0] ?? '';
    const min = Number(/min-height:\s*(\d+)px/.exec(rule)?.[1]);
    expect(min).toBeGreaterThanOrEqual(56);
  });

  it('destroy removes the card', () => {
    const host = document.createElement('div');
    const card = createWaitingCard({ onBack: vi.fn() });
    host.append(card.element);
    card.destroy();
    expect(host.children.length).toBe(0);
  });
});
