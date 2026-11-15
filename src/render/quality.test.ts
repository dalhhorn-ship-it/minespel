import { describe, expect, it } from 'vitest';
import { DEFAULT_QUALITY, pixelRatioFor, qualityForView, qualityFromSearch, viewDistanceOf } from './quality';

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
    expect(qualityFromSearch('?pr=1.5&fog=40')).toEqual({ pixelRatioCap: 1.5, fogNear: 20, fogFar: 40, near: false, drawRadius: null });
  });
  it('AC240: near mode is off by default and on with ?near=1 only', () => {
    expect(DEFAULT_QUALITY.near).toBe(false);
    expect(qualityFromSearch('').near).toBe(false);
    expect(qualityFromSearch('?near=1').near).toBe(true);
    expect(qualityFromSearch('?near=0').near).toBe(false);
    expect(qualityFromSearch('?near=yes').near).toBe(false);
    expect(qualityFromSearch('?near=1&fog=40')).toEqual({ pixelRatioCap: 2, fogNear: 20, fogFar: 40, near: true, drawRadius: null });
  });
  it('clamps and ignores junk', () => {
    expect(qualityFromSearch('?pr=99&fog=abc').pixelRatioCap).toBe(3);
    expect(qualityFromSearch('?pr=99&fog=abc').fogFar).toBe(DEFAULT_QUALITY.fogFar);
    expect(qualityFromSearch('?fog=1').fogFar).toBe(8);
    expect(qualityFromSearch('?pr=').pixelRatioCap).toBe(2);
  });
});

describe('Kijkafstand (AC243)', () => {
  it('AC243: missing or unknown reads Ver, and Ver is today\'s view', () => {
    expect(viewDistanceOf({})).toBe('ver');
    expect(viewDistanceOf(null)).toBe('ver');
    expect(viewDistanceOf({ viewDistance: 'ver' })).toBe('ver');
    expect(viewDistanceOf({ viewDistance: 'mooi' })).toBe('ver');
    expect(viewDistanceOf({ viewDistance: 'dichtbij' })).toBe('dichtbij');
    expect(qualityForView('ver')).toEqual(DEFAULT_QUALITY);
  });
  it('AC243: Dichtbij ends the fog at 40 blocks and draws 3 chunks, and keeps the other knobs', () => {
    const q = qualityForView('dichtbij', qualityFromSearch('?pr=1.5'));
    expect(q.fogFar).toBe(40);
    expect(q.drawRadius).toBe(3);
    expect(q.pixelRatioCap).toBe(1.5);
  });
});
