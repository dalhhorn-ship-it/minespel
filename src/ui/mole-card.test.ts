// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { MOLE_CARD_TEXT, createMoleCard } from './mole-card';

describe('the Monstermol warning card (AC292)', () => {
  it('AC292: shows the text of the PRD and an OK of its own', () => {
    expect(MOLE_CARD_TEXT).toBe('Onder de gele streep slaapt de Monstermol. Graaf je verder? Dan wordt de Monstermol wakker!');
    const onOk = vi.fn();
    const card = createMoleCard({ onOk });
    expect(card.element.querySelector('[data-testid="mole-text"]')?.textContent).toBe(MOLE_CARD_TEXT);
    expect(card.element.querySelector('[data-testid="mole-ok"]')?.textContent).toBe('OK');
    card.destroy();
  });
});
