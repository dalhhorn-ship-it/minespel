// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createSettingsScreen, HELP_VIEW_DISTANCE } from './settings-screen';
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

const nodeFs = (
  globalThis as unknown as { process: { getBuiltinModule(n: string): { readFileSync(p: string, enc: string): string } } }
).process.getBuiltinModule('node:fs');

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

describe('Volume, version and Alles wissen (v3)', () => {
  const slider = (root: HTMLElement) => root.querySelector('[data-testid="volume-setting"]') as HTMLInputElement;
  const buttonText = (root: HTMLElement) => [...root.querySelectorAll('button')].map((b) => b.textContent);
  const byText = (root: HTMLElement, t: string) => [...root.querySelectorAll('button')].find((b) => b.textContent === t);

  it('AC192: Volume shows 70 on a new game and saves the chosen value as 0 to 1', () => {
    const { screen, onUpdateSettings } = make(defaultKv('settings'));
    const s = slider(screen.element);
    expect(s.min).toBe('0');
    expect(s.max).toBe('100');
    expect(s.value).toBe('70');
    s.value = '40';
    s.dispatchEvent(new Event('change'));
    expect(onUpdateSettings.mock.calls[0]?.[0]).toMatchObject({ volume: 0.4 });
    expect(slider(screen.element).value).toBe('40');
  });

  it('AC192: a saved Volume of 0 shows 0', () => {
    expect(slider(make({ ...defaultKv('settings'), volume: 0 }).screen.element).value).toBe('0');
  });

  it('AC135: the version shows at the bottom', () => {
    const root = make(defaultKv('settings')).screen.element;
    const last = root.lastElementChild as HTMLElement;
    expect(last.getAttribute('data-testid')).toBe('app-version');
    expect(last.textContent).toBe(`Versie ${__APP_VERSION__}`);
  });

  function makeWipe(onWipeAll: () => Promise<void> | void) {
    let tick = 0;
    return createSettingsScreen({
      settings: defaultKv('settings'),
      isBreakActive: false,
      onUpdateSettings: () => undefined,
      onStartBreakNow: () => undefined,
      onEndBreakNow: () => undefined,
      onChangePin: () => undefined,
      onWipeAll,
      now: () => (tick += 1000),
    });
  }

  it('AC193: two confirms with different words, and Annuleren at either step changes nothing', () => {
    const onWipeAll = vi.fn();
    const root = makeWipe(onWipeAll).element;
    tap(byText(root, 'Alles wissen'));
    expect(buttonText(root)).toContain('Ja, ga verder');
    tap(byText(root, 'Annuleren'));
    expect(buttonText(root)).toContain('Alles wissen');
    tap(byText(root, 'Alles wissen'));
    tap(byText(root, 'Ja, ga verder'));
    expect(buttonText(root)).toContain('Ja, wis alles echt');
    expect(buttonText(root)).not.toContain('Ja, ga verder');
    tap(byText(root, 'Annuleren'));
    expect(onWipeAll).not.toHaveBeenCalled();
    expect(buttonText(root)).toContain('Alles wissen');
  });

  it('AC193: only the second confirm wipes', () => {
    const onWipeAll = vi.fn();
    const root = makeWipe(onWipeAll).element;
    tap(byText(root, 'Alles wissen'));
    tap(byText(root, 'Ja, ga verder'));
    expect(onWipeAll).not.toHaveBeenCalled();
    tap(byText(root, 'Ja, wis alles echt'));
    expect(onWipeAll).toHaveBeenCalledTimes(1);
  });

  it('AC193: a failed wipe says nothing changed', async () => {
    const root = makeWipe(() => Promise.reject(new Error('x'))).element;
    tap(byText(root, 'Alles wissen'));
    tap(byText(root, 'Ja, ga verder'));
    tap(byText(root, 'Ja, wis alles echt'));
    await vi.waitFor(() => expect(root.textContent).toContain('Er is niets veranderd'));
  });
});

describe('Kijkafstand (v15, AC243)', () => {
  const choices = (root: HTMLElement) => [...root.querySelectorAll('[data-view-distance]')];
  const pressedView = (root: HTMLElement) =>
    choices(root).filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.getAttribute('data-view-distance'));

  it('AC243: the row shows Ver and Dichtbij with the exact help line, and Ver is on without a saved value', () => {
    const { screen } = make(defaultKv('settings'));
    const row = screen.element.querySelector('[data-testid="view-setting"]') as HTMLElement;
    expect(row.textContent).toContain('Kijkafstand');
    expect(choices(row).map((b) => b.textContent)).toEqual(['Ver', 'Dichtbij']);
    expect(row.textContent).toContain('Dichtbij maakt het spel sneller op een oudere iPad. Je kijkt dan minder ver.');
    expect(HELP_VIEW_DISTANCE).toBe('Dichtbij maakt het spel sneller op een oudere iPad. Je kijkt dan minder ver.');
    expect(pressedView(screen.element)).toEqual(['ver']);
    const old = defaultKv('settings') as SettingsRecord;
    delete old.viewDistance;
    expect(pressedView(make(old).screen.element)).toEqual(['ver']);
  });

  it('AC243: tapping Dichtbij saves it and keeps the other settings, tapping Ver goes back', () => {
    const { screen, onUpdateSettings } = make(defaultKv('settings'));
    tap(screen.element.querySelector('[data-view-distance="dichtbij"]'));
    expect(onUpdateSettings.mock.calls[0]?.[0]).toMatchObject({ viewDistance: 'dichtbij', questionsPerBreak: 5 });
    expect(pressedView(screen.element)).toEqual(['dichtbij']);
    tap(screen.element.querySelector('[data-view-distance="ver"]'));
    expect(onUpdateSettings.mock.calls[1]?.[0]).toMatchObject({ viewDistance: 'ver' });
  });

  it('AC243: the tap area is at least 44 points (the stylesheet rule)', () => {
    const m = /\.parent-view-choice\s*\{[^}]*min-height:\s*(\d+)px/.exec(nodeFs.readFileSync('src/styles/parent.css', 'utf8'));
    expect(Number(m?.[1])).toBeGreaterThanOrEqual(44);
  });
});
