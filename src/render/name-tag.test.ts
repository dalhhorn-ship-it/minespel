import { describe, expect, it } from 'vitest';
import { NAME_FONT_PX, NAME_MAX_LENGTH, cleanName, layoutNameTag } from './name-tag';

const measure = (t: string): number => t.length * 20;

describe('name tag layout', () => {
  it('cleans the name: trims, squeezes spaces, cuts at 12', () => {
    expect(cleanName('  Rex   de  Dino ')).toBe('Rex de Dino');
    expect(Array.from(cleanName('Superlangedinonaam'))).toHaveLength(NAME_MAX_LENGTH);
  });

  it('gives no tag for an empty name', () => {
    expect(layoutNameTag('   ', measure)).toBeNull();
  });

  it('grows with the text and centres it', () => {
    const a = layoutNameTag('Bo', measure)!;
    const b = layoutNameTag('Bobbeltje', measure)!;
    expect(b.width).toBeGreaterThan(a.width);
    expect(a.fontPx).toBe(NAME_FONT_PX);
    expect(a.textX).toBe(a.width / 2);
    expect(a.textY).toBe(a.height / 2);
    expect(a.width).toBe(40 + 40);
  });

  it('keeps the world aspect equal to the canvas aspect', () => {
    const l = layoutNameTag('Rex', measure)!;
    expect(l.worldWidth / l.worldHeight).toBeCloseTo(l.width / l.height, 6);
    expect(l.radius).toBe(l.height / 2);
  });

  it('measures the cleaned text', () => {
    const l = layoutNameTag('  Rex ', measure)!;
    expect(l.text).toBe('Rex');
    expect(l.width).toBe(60 + 40);
  });
});
