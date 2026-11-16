// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_WAITING, MOLE_CUT_MS, MOLE_FOLLOW_MS, clearSpeech, say, toastLog } from './speech';

const line = () => document.querySelector<HTMLElement>('.speech-line');

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  clearSpeech();
  vi.useRealTimers();
});

describe('say', () => {
  it('shows one polite line as plain text and hides it after the time', () => {
    say('<b>Hallo!</b>', 1000);
    expect(line()?.textContent).toBe('<b>Hallo!</b>');
    expect(line()?.querySelector('b')).toBeNull();
    expect(line()?.getAttribute('aria-live')).toBe('polite');
    expect(line()?.hidden).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(line()?.hidden).toBe(true);
  });
  it('lines wait their turn, in order', () => {
    say('een', 1000);
    say('twee', 1000);
    expect(line()?.textContent).toBe('een');
    vi.advanceTimersByTime(1000);
    expect(line()?.textContent).toBe('twee');
  });
  it('at most 3 lines wait, a 5th is dropped', () => {
    expect(MAX_WAITING).toBe(3);
    for (const t of ['a', 'b', 'c', 'd', 'e']) say(t, 100);
    const seen: (string | null | undefined)[] = [line()?.textContent];
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(100);
      seen.push(line()?.hidden ? null : line()?.textContent);
    }
    expect(seen).toEqual(['a', 'b', 'c', 'd', null, null]);
  });
  it('the default time is 2.5 seconds and empty text says nothing', () => {
    say('');
    expect(line()).toBeNull();
    say('hoi');
    vi.advanceTimersByTime(2499);
    expect(line()?.hidden).toBe(false);
    vi.advanceTimersByTime(1);
    expect(line()?.hidden).toBe(true);
  });
});

describe('decision 144: the kind of a line', () => {
  it('a mole line behaves like any other line until V22b fills the channel', () => {
    say('een', 1000);
    say('mol', 1000, 'mole');
    expect(line()?.textContent).toBe('een');
    vi.advanceTimersByTime(1000);
    expect(line()?.textContent).toBe('mol');
    vi.advanceTimersByTime(1000);
    expect(line()?.hidden).toBe(true);
  });
  it('toastLog is one array (empty in a unit build, which is not an E2E build), and clearSpeech empties it', () => {
    expect(toastLog()).toEqual([]);
    expect(toastLog()).toBe(toastLog());
    clearSpeech();
    expect(toastLog()).toEqual([]);
  });
});

describe('the mole channel (AC293)', () => {
  const shown = () => (line()?.hidden ? null : line()?.textContent);
  it('AC293: mole lines keep the order of their events, each within 1 second of the one before', () => {
    say('toast', 3000);
    say('mol een', 3000, 'mole');
    say('mol twee', 3000, 'mole');
    say('mol drie', 3000, 'mole');
    vi.advanceTimersByTime(MOLE_CUT_MS);
    expect(shown()).toBe('mol een');
    vi.advanceTimersByTime(MOLE_FOLLOW_MS);
    expect(shown()).toBe('mol twee');
    vi.advanceTimersByTime(MOLE_FOLLOW_MS);
    expect(shown()).toBe('mol drie');
    vi.advanceTimersByTime(3000);
    expect(shown()).toBeNull();
  });
  it('AC293: while another line shows, a mole line waits at most 1000 ms', () => {
    say('toast', 4000);
    vi.advanceTimersByTime(500);
    say('mol', 3000, 'mole');
    expect(shown()).toBe('toast');
    vi.advanceTimersByTime(MOLE_CUT_MS - 1);
    expect(shown()).toBe('toast');
    vi.advanceTimersByTime(1);
    expect(shown()).toBe('mol');
  });
  it('AC293: a toast with under 1000 ms left is not made longer', () => {
    say('toast', 1500);
    vi.advanceTimersByTime(1200);
    say('mol', 3000, 'mole');
    vi.advanceTimersByTime(300);
    expect(shown()).toBe('mol');
  });
  it('AC293: a mole line that shows runs on at most 900 ms when the next mole line comes, so the next one shows within 1 second', () => {
    say('een', 3000, 'mole');
    say('twee', 3000, 'mole');
    vi.advanceTimersByTime(MOLE_FOLLOW_MS - 1);
    expect(shown()).toBe('een');
    vi.advanceTimersByTime(1);
    expect(shown()).toBe('twee');
    vi.advanceTimersByTime(2999);
    expect(shown()).toBe('twee');
  });
  it('AC293: a mole line that shows is not cut by a line of another kind', () => {
    say('mol', 3000, 'mole');
    say('toast', 1000);
    vi.advanceTimersByTime(2999);
    expect(shown()).toBe('mol');
    vi.advanceTimersByTime(1);
    expect(shown()).toBe('toast');
  });
  it('AC293: the old warning is gone within 1 second of a rumble line', () => {
    say('Pas op', 4000, 'mole');
    vi.advanceTimersByTime(500);
    say('rommelt', 2500, 'mole');
    vi.advanceTimersByTime(MOLE_FOLLOW_MS);
    expect(shown()).toBe('rommelt');
  });
  it('AC293: no mole line ever shows after a later mole line', () => {
    say('toast', 5000);
    say('een', 1000, 'mole');
    say('twee', 1000, 'mole');
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      const t = shown();
      if (t && seen[seen.length - 1] !== t) seen.push(t);
      vi.advanceTimersByTime(500);
    }
    expect(seen).toEqual(['toast', 'een', 'twee']);
  });
  it('AC293: over the cap of 3 the oldest waiting mole line goes, the newest mole line is kept', () => {
    say('toast', 5000);
    for (const t of ['een', 'twee', 'drie', 'vier']) say(t, 1000, 'mole');
    const seen: string[] = [];
    for (let i = 0; i < 20; i++) {
      const t = shown();
      if (t && seen[seen.length - 1] !== t) seen.push(t);
      vi.advanceTimersByTime(500);
    }
    expect(seen).toEqual(['toast', 'twee', 'drie', 'vier']);
  });
  it('AC293: other lines keep the queue of 3', () => {
    say('a', 1000);
    say('b', 1000);
    say('c', 1000);
    say('d', 1000);
    say('e', 1000);
    say('mol', 1000, 'mole');
    const seen: string[] = [];
    for (let i = 0; i < 20; i++) {
      const t = shown();
      if (t && seen[seen.length - 1] !== t) seen.push(t);
      vi.advanceTimersByTime(250);
    }
    expect(seen).toEqual(['a', 'mol', 'b', 'c']);
  });
});
