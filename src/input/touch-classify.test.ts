import { describe, expect, it } from 'vitest';
import { classifyTouch } from './touch-classify';

describe('classifyTouch', () => {
  it('short and still is a tap', () => expect(classifyTouch(2, 3, 120)).toBe('tap'));
  it('9 points and 299 ms is still a tap', () => expect(classifyTouch(9, 0, 299)).toBe('tap'));
  it('10 points is a drag', () => expect(classifyTouch(10, 0, 50)).toBe('drag'));
  it('diagonal movement counts as distance', () => expect(classifyTouch(8, 8, 50)).toBe('drag'));
  it('300 ms is a drag', () => expect(classifyTouch(0, 0, 300)).toBe('drag'));
});
