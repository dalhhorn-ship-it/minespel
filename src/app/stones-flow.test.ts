import { describe, expect, it, vi } from 'vitest';
import { createStonesFlow, readStones } from './stones-flow';

const make = () => {
  const setStones = vi.fn();
  const say = vi.fn();
  const flow = createStonesFlow({ db: {} as IDBDatabase, say, game: { setStones }, startBlock: () => 0 });
  return { flow, setStones, say };
};

describe('the stones flow skeleton (v20 seam)', () => {
  it('AC278: a record without stones reads empty', () => {
    expect(readStones({})).toEqual({ found: [], bought: [] });
    expect(readStones({ stones: 5 })).toEqual({ found: [], bought: [] });
  });

  it('AC278: readStones drops ids that are not stones and a stone bought but not found', () => {
    expect(readStones({ stones: { found: [44, 43, 43, 9, 'x'], bought: [43, 50] } })).toEqual({ found: [43, 44], bought: [43] });
  });

  it('AC272: load tells the game, state and isBought read it, markBought tells the game again', () => {
    const { flow, setStones } = make();
    flow.load({ stones: { found: [43, 45], bought: [43] } });
    expect(setStones).toHaveBeenLastCalledWith([43, 45], [43]);
    expect(flow.isBought(43)).toBe(true);
    expect(flow.isBought(45)).toBe(false);
    flow.markBought(45);
    flow.markBought(45);
    expect(flow.state()).toEqual({ found: [43, 45], bought: [43, 45] });
    expect(setStones).toHaveBeenCalledTimes(2);
  });

  it('AC272: onMined is a safe no op in this seam: nothing is found, nothing is said', () => {
    const { flow, say, setStones } = make();
    flow.load({});
    setStones.mockClear();
    flow.onMined(1, 2, 3, 43);
    expect(flow.state()).toEqual({ found: [], bought: [] });
    expect(say).not.toHaveBeenCalled();
    expect(setStones).not.toHaveBeenCalled();
  });
});
