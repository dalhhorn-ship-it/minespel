// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createCountdownView } from './countdown';

describe('countdown view (T41)', () => {
  it('renders "Leerpauze over M:SS" and updates text', () => {
    const view = createCountdownView({ initialMs: 300_000 });
    expect(view.getText()).toBe('Leerpauze over 5:00');
    expect(view.isWarningActive()).toBe(false);

    view.update(65_000);
    expect(view.getText()).toBe('Leerpauze over 1:05');
    expect(view.isWarningActive()).toBe(false);
  });

  it('activates warning state in the last 30 seconds when enabled (AC25)', () => {
    const view = createCountdownView({ initialMs: 31_000, warningEnabled: true });
    expect(view.isWarningActive()).toBe(false);

    view.update(30_000);
    expect(view.getText()).toBe('Leerpauze over 0:30');
    expect(view.isWarningActive()).toBe(true);

    view.setWarningEnabled(false);
    expect(view.isWarningActive()).toBe(false);

    view.setWarningEnabled(true);
    expect(view.isWarningActive()).toBe(true);

    view.update(0);
    expect(view.getText()).toBe('Leerpauze over 0:00');
    expect(view.isWarningActive()).toBe(false);
  });
});
