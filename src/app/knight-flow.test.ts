// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { KnightState } from '../knights/knight-types';
import { createKnightFlow } from './knight-flow';

describe('knight flow stub', () => {
  it('says the arrival and the salute lines', () => {
    const say = vi.fn();
    const flow = createKnightFlow({ say });
    flow.onEvent('arrived', {} as KnightState);
    flow.onEvent('salute', {} as KnightState);
    expect(say.mock.calls).toEqual([['Ridder tot je dienst!'], ['Hallo!']]);
  });
  it('the menu is a safe no op until V17d', () => {
    expect(() => createKnightFlow().openMenu({} as KnightState)).not.toThrow();
  });
});
