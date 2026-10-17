import { describe, expect, it } from 'vitest';
import { numberToDutch } from './dutch-numbers';

describe('numberToDutch', () => {
  it.each([
    [0, 'nul'],
    [1, 'een'],
    [7, 'zeven'],
    [12, 'twaalf'],
    [19, 'negentien'],
    [20, 'twintig'],
    [21, 'eenentwintig'],
    [22, 'tweeëntwintig'],
    [23, 'drieëntwintig'],
    [34, 'vierendertig'],
    [99, 'negenennegentig'],
    [100, 'honderd'],
    [101, 'honderdeen'],
    [215, 'tweehonderdvijftien'],
    [999, 'negenhonderdnegenennegentig'],
    [1000, 'duizend'],
    [2024, 'tweeduizendvierentwintig'],
    [9999, 'negenduizendnegenhonderdnegenennegentig'],
  ])('%i is %s', (n, words) => {
    expect(numberToDutch(n)).toBe(words);
  });

  it('refuses out of range numbers', () => {
    expect(() => numberToDutch(-1)).toThrow(RangeError);
    expect(() => numberToDutch(10000)).toThrow(RangeError);
    expect(() => numberToDutch(1.5)).toThrow(RangeError);
  });
});
