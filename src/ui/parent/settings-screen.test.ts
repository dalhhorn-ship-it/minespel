// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createSettingsScreen } from './settings-screen';
import { defaultKv, type SettingsRecord } from '../../storage/schema';

function tap(el: Element | null | undefined) {
  if (!el) throw new Error('missing element');
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}

function make(settings: SettingsRecord) {
  const onUpdateSettings = vi.fn();
  let tick = 0;
  const screen = createSettingsScreen({
    settings,
    isBreakActive: false,
    onUpdateSettings,
    onStartBreakNow: () => undefined,
    onEndBreakNow: () => undefined,
    onChangePin: () => undefined,
    now: () => (tick += 1000),
  });
  return { screen, onUpdateSettings };
}
const pressed = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-points-mode]')]
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.getAttribute('data-points-mode'));

describe('Punten setting (v10)', () => {
  it('AC172: shows three choices with a short line each and Normaal chosen on a new game', () => {
    const { screen } = make(defaultKv('settings'));
    const root = screen.element;
    expect(root.textContent).toContain('Punten');
    const buttons = [...root.querySelectorAll('[data-points-mode]')];
    expect(buttons.map((b) => b.getAttribute('data-points-mode'))).toEqual(['makkelijk', 'normaal', 'moeilijk']);
    for (const b of buttons) expect(b.querySelector('.parent-points-line')?.textContent?.length).toBeGreaterThan(5);
    expect(pressed(root)).toEqual(['normaal']);
  });

  it('AC172: a save from 0.3.0 with no pointsMode shows Normaal', () => {
    const old = defaultKv('settings') as SettingsRecord;
    delete old.pointsMode;
    expect(pressed(make(old).screen.element)).toEqual(['normaal']);
  });

  it('AC172: tapping Moeilijk saves it and keeps the other settings', () => {
    const { screen, onUpdateSettings } = make(defaultKv('settings'));
    tap(screen.element.querySelector('[data-points-mode="moeilijk"]'));
    expect(onUpdateSettings).toHaveBeenCalledTimes(1);
    expect(onUpdateSettings.mock.calls[0]?.[0]).toMatchObject({ pointsMode: 'moeilijk', questionsPerBreak: 5 });
    expect(pressed(screen.element)).toEqual(['moeilijk']);
  });
});
