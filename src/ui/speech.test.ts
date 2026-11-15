// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_WAITING, clearSpeech, say } from './speech';

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
