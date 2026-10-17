import { describe, expect, it } from 'vitest';
import { DEFAULT_QUALITY, pixelRatioFor, qualityFromSearch } from './quality';

describe('pixelRatioFor', () => {
  it('caps at 2 by default', () => {
    expect(pixelRatioFor(3, DEFAULT_QUALITY)).toBe(2);
    expect(pixelRatioFor(2, DEFAULT_QUALITY)).toBe(2);
    expect(pixelRatioFor(1, DEFAULT_QUALITY)).toBe(1);
  });
  it('follows a lowered cap', () => {
    expect(pixelRatioFor(2, { ...DEFAULT_QUALITY, pixelRatioCap: 1.5 })).toBe(1.5);
  });
  it('survives nonsense', () => {
    expect(pixelRatioFor(0, DEFAULT_QUALITY)).toBe(1);
    expect(pixelRatioFor(NaN, DEFAULT_QUALITY)).toBe(1);
  });
});

describe('qualityFromSearch', () => {
  it('gives the default without params', () => {
    expect(qualityFromSearch('')).toEqual(DEFAULT_QUALITY);
  });
  it('reads pr and fog', () => {
    expect(qualityFromSearch('?pr=1.5&fog=40')).toEqual({ pixelRatioCap: 1.5, fogNear: 20, fogFar: 40 });
  });
  it('clamps and ignores junk', () => {
    expect(qualityFromSearch('?pr=99&fog=abc').pixelRatioCap).toBe(3);
    expect(qualityFromSearch('?pr=99&fog=abc').fogFar).toBe(DEFAULT_QUALITY.fogFar);
    expect(qualityFromSearch('?fog=1').fogFar).toBe(8);
    expect(qualityFromSearch('?pr=').pixelRatioCap).toBe(2);
  });
});
