import { describe, expect, it } from 'vitest';
import { createFakeClock } from './clock';
import {
  createCountdown,
  createExamTimer,
  createHeartbeat,
  createPlayTimer,
  formatCountdown,
  isTickTime,
  isWarning,
  playTimerLabel,
  timerMatrix,
  type ScreenKind,
  type TimerSituation,
} from './timers';

const base: TimerSituation = { screen: 'world', portrait: false, tooSmall: false, visible: true };

describe('timerMatrix', () => {
  it('world: play runs', () => {
    expect(timerMatrix(base)).toEqual({ play: true, exam: false });
  });

  it('overlays and learning stop play (AC23)', () => {
    for (const screen of ['kid-overlay', 'learn'] as ScreenKind[]) {
      expect(timerMatrix({ ...base, screen })).toEqual({ play: false, exam: false });
    }
  });

  it('exam runs the exam timer until the last answer', () => {
    expect(timerMatrix({ ...base, screen: 'exam' })).toEqual({ play: false, exam: true });
    expect(timerMatrix({ ...base, screen: 'exam', examFinished: true })).toEqual({ play: false, exam: false });
  });

  it('parent stops both (AC23, AC112)', () => {
    expect(timerMatrix({ ...base, screen: 'parent' })).toEqual({ play: false, exam: false });
  });

  it('portrait, too small and background stop everything on every screen (AC23, AC112)', () => {
    const screens: ScreenKind[] = ['world', 'kid-overlay', 'learn', 'exam', 'parent'];
    for (const screen of screens) {
      for (const bad of [{ portrait: true }, { tooSmall: true }, { visible: false }]) {
        expect(timerMatrix({ ...base, screen, ...bad })).toEqual({ play: false, exam: false });
      }
    }
  });
});

describe('heartbeat', () => {
  it('counts normal gaps, not the first tick', () => {
    const c = createFakeClock(1000);
    const h = createHeartbeat(c);
    expect(h.tick()).toBe(0);
    c.advance(1000);
    expect(h.tick()).toBe(1000);
    c.advance(5000);
    expect(h.tick()).toBe(5000);
  });

  it('does not count a gap over 5 seconds (AC113)', () => {
    const c = createFakeClock(0);
    const h = createHeartbeat(c);
    h.tick();
    c.advance(60_000);
    expect(h.tick()).toBe(0);
    c.advance(1000);
    expect(h.tick()).toBe(1000);
  });

  it('does not count when the clock goes back', () => {
    const c = createFakeClock(100_000);
    const h = createHeartbeat(c);
    h.tick();
    c.set(50_000);
    expect(h.tick()).toBe(0);
  });

  it('reset makes the next tick count 0', () => {
    const c = createFakeClock(0);
    const h = createHeartbeat(c);
    h.tick();
    c.advance(1000);
    h.reset();
    expect(h.tick()).toBe(0);
  });

  it('no timer loses a 60 second jump (AC113)', () => {
    const c = createFakeClock(0);
    const h = createHeartbeat(c);
    const play = createPlayTimer(5);
    h.tick();
    c.advance(60_000);
    play.advance(h.tick());
    expect(play.remainingMs()).toBe(300_000);
  });
});

describe('countdown and timers', () => {
  it('play timer: 5:00 default, 4:00 after 60 s (AC22)', () => {
    const c = createFakeClock(0);
    const h = createHeartbeat(c);
    const play = createPlayTimer(5);
    expect(playTimerLabel(play.remainingMs())).toBe('Leerpauze over 5:00');
    h.tick();
    for (let i = 0; i < 60; i++) {
      c.advance(1000);
      play.advance(h.tick());
    }
    expect(playTimerLabel(play.remainingMs())).toBe('Leerpauze over 4:00');
  });

  it('advance reports expiry once and never goes below 0', () => {
    const t = createCountdown(3000);
    expect(t.advance(2000)).toBe(false);
    expect(t.advance(5000)).toBe(true);
    expect(t.remainingMs()).toBe(0);
    expect(t.expired()).toBe(true);
    expect(t.advance(1000)).toBe(false);
  });

  it('ignores zero and negative advances', () => {
    const t = createCountdown(3000);
    t.advance(-500);
    t.advance(0);
    t.advance(NaN);
    expect(t.remainingMs()).toBe(3000);
  });

  it('restores a saved time (AC24) and clamps bad saves', () => {
    expect(createPlayTimer(5, 150_000).remainingMs()).toBe(150_000);
    expect(createPlayTimer(5, null).remainingMs()).toBe(300_000);
    expect(createPlayTimer(5, 999_999_999).remainingMs()).toBe(300_000);
    expect(createPlayTimer(5, -5).remainingMs()).toBe(0);
    expect(createPlayTimer(5, NaN).remainingMs()).toBe(300_000);
  });

  it('reset starts over', () => {
    const t = createPlayTimer(1);
    t.advance(60_000);
    t.reset();
    expect(t.remainingMs()).toBe(60_000);
    t.reset(10_000);
    expect(t.remainingMs()).toBe(10_000);
  });

  it('exam timer: none without a limit, saved time kept', () => {
    expect(createExamTimer(null)).toBeNull();
    expect(createExamTimer(0)).toBeNull();
    expect(createExamTimer(10)?.remainingMs()).toBe(600_000);
    expect(createExamTimer(10, 123_000)?.remainingMs()).toBe(123_000);
  });

  it('formats and flags warnings', () => {
    expect(formatCountdown(252_000)).toBe('4:12');
    expect(formatCountdown(251_001)).toBe('4:12');
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-5)).toBe('0:00');
    expect(formatCountdown(9_000)).toBe('0:09');
    expect(isWarning(30_000)).toBe(true);
    expect(isWarning(30_001)).toBe(false);
    expect(isWarning(0)).toBe(false);
    expect(isTickTime(10_000)).toBe(true);
    expect(isTickTime(10_001)).toBe(false);
  });
});
