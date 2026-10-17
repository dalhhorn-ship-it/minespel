import { describe, expect, it } from 'vitest';
import {
  formatNumber,
  formatTenths,
  isCompleteNumber,
  numberMatches,
  parseNumberInput,
  THIN_SPACE,
  toTenths,
} from './numbers';

describe('numberMatches (AC58)', () => {
  it('accepts 3,5 3,50 03,5 and spaces around for 3.5', () => {
    for (const s of ['3,5', '3,50', '03,5', ' 3,5 ']) expect(numberMatches(s, 3.5)).toBe(true);
  });
  it('refuses 35, incomplete and dotted input', () => {
    for (const s of ['35', '', '3,', ',5', ',', '3.5', '3 5', '3,5,1', '-3,5', 'abc']) {
      expect(numberMatches(s, 3.5)).toBe(false);
    }
  });
  it('accepts whole numbers and string answers', () => {
    expect(numberMatches('12', 12)).toBe(true);
    expect(numberMatches('12,0', '12')).toBe(true);
    expect(numberMatches('0,3', '0,3')).toBe(true);
    expect(numberMatches('0,3', '0.3')).toBe(true);
    expect(numberMatches('0', 0)).toBe(true);
    expect(numberMatches('10000', 10000)).toBe(true);
  });
  it('compares 0,1 + 0,2 as exactly 0,3', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    const sum = formatTenths((toTenths(0.1) as number) + (toTenths('0,2') as number));
    expect(sum).toBe('0,3');
    expect(numberMatches('0,3', 0.1 + 0.2)).toBe(true);
  });
  it('is false for an unreadable expected value', () => {
    expect(numberMatches('1', NaN)).toBe(false);
    expect(numberMatches('1', 'x')).toBe(false);
  });
});

describe('isCompleteNumber and parseNumberInput', () => {
  it('needs a digit on both sides of the comma', () => {
    expect(isCompleteNumber('3')).toBe(true);
    expect(isCompleteNumber('3,5')).toBe(true);
    expect(isCompleteNumber('')).toBe(false);
    expect(isCompleteNumber('3,')).toBe(false);
    expect(isCompleteNumber(',5')).toBe(false);
  });
  it('parses for display', () => {
    expect(parseNumberInput('03,50')).toBe(3.5);
    expect(parseNumberInput('3,')).toBeNull();
  });
});

describe('toTenths and formatTenths', () => {
  it('converts both ways', () => {
    expect(toTenths('3,5')).toBe(35);
    expect(toTenths(12)).toBe(120);
    expect(toTenths('0,25')).toBeNull();
    expect(formatTenths(35)).toBe('3,5');
    expect(formatTenths(30)).toBe('3');
    expect(formatTenths(3)).toBe('0,3');
    expect(formatTenths(-12)).toBe('-1,2');
    expect(formatTenths(100000)).toBe(`10${THIN_SPACE}000`);
    expect(() => formatTenths(1.5)).toThrow();
  });
});

describe('formatNumber (AC121)', () => {
  it('uses a thin space for 1000 and up, never a dot', () => {
    expect(formatNumber(10000)).toBe(`10${THIN_SPACE}000`);
    expect(formatNumber(1000)).toBe(`1${THIN_SPACE}000`);
    expect(formatNumber(1234567)).toBe(`1${THIN_SPACE}234${THIN_SPACE}567`);
    expect(formatNumber(10000)).not.toContain('.');
  });
  it('leaves small numbers alone and uses a comma for decimals', () => {
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(3.5)).toBe('3,5');
    expect(formatNumber(1234.5)).toBe(`1${THIN_SPACE}234,5`);
    expect(formatNumber(0.1 + 0.2)).toBe('0,3');
    expect(formatNumber('7.25')).toBe('7,25');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(-1500)).toBe(`-1${THIN_SPACE}500`);
  });
  it('throws on junk', () => {
    expect(() => formatNumber(NaN)).toThrow();
  });
});
