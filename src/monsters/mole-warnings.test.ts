import { describe, expect, it, vi } from 'vitest';
import { WAARSCHUWSTEEN } from '../world/blocks';
import { createMoleWarnings, WARN_TEXT } from './mole-warnings';

function setup() {
  const say = vi.fn();
  const showCard = vi.fn();
  return { say, showCard, w: createMoleWarnings({ say, showCard }) };
}

describe('mole warnings (AC244)', () => {
  it('AC244: y 6 and y 7 toast at most once per 60 000 ms of play time', () => {
    const { say, w } = setup();
    w.onMined(6, 3);
    expect(say).toHaveBeenCalledTimes(1);
    expect(say.mock.calls[0]?.[0]).toBe(WARN_TEXT);
    w.onMined(7, 3);
    w.onPlayElapsed(59_000);
    w.onMined(6, 3);
    expect(say).toHaveBeenCalledTimes(1);
    w.onPlayElapsed(1000);
    w.onMined(7, 3);
    expect(say).toHaveBeenCalledTimes(2);
  });
  it('AC244: other heights give no toast', () => {
    const { say, w } = setup();
    for (const y of [1, 4, 5, 8, 20]) w.onMined(y, 3);
    expect(say).not.toHaveBeenCalled();
  });
  it('AC244: the card shows on every Waarschuwsteen, with no gap', () => {
    const { showCard, say, w } = setup();
    w.onMined(5, WAARSCHUWSTEEN);
    w.onMined(5, WAARSCHUWSTEEN);
    expect(showCard).toHaveBeenCalledTimes(2);
    expect(say).not.toHaveBeenCalled();
  });
  it('AC244: a reset brings the first toast back at once', () => {
    const { say, w } = setup();
    w.onMined(6, 3);
    w.reset();
    w.onMined(6, 3);
    expect(say).toHaveBeenCalledTimes(2);
  });
});
