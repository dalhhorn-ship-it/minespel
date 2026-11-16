import { describe, expect, it, vi } from 'vitest';
import { createFeeder, FEED_TEXT, SNACK_LINE } from './feed';
import { snackStep } from './snack';

function setup(carried: number, bought = true) {
  const rec = { bought, spot: null, carried };
  const dino = { x: 5, y: 10, z: 5, heading: 0.5, vy: 0, snack: undefined as import('./snack').Snack | undefined };
  const economy = {
    state: () => ({ ...rec }),
    useOne: vi.fn(async () => {
      if (rec.carried < 1) return false;
      rec.carried -= 1;
      return true;
    }),
  };
  const labels = { show: vi.fn(() => true), hide: vi.fn(), place: vi.fn() };
  const sound = { play: vi.fn() };
  const feeder = createFeeder({
    economy,
    body: (t) => (t.id === 'd1' ? (dino as never) : null),
    labels,
    sound,
    project: () => ({ x: 1, y: 2 }),
  });
  return { rec, dino, economy, labels, sound, feeder };
}

describe('feeder', () => {
  it('AC315: one lavakip per feed, the snack starts, the words and hap show', async () => {
    const s = setup(2);
    expect(await s.feeder.feed({ kind: 'dino', id: 'd1' })).toBe(true);
    expect(s.rec.carried).toBe(1);
    expect(s.dino.snack).toBeDefined();
    expect(s.sound.play).toHaveBeenCalledWith('hap');
    expect(s.labels.show).toHaveBeenCalledWith('snack-dino-d1-words', SNACK_LINE, 'snack', 3000);
    expect(s.feeder.state().fed).toBe(1);
    expect(s.feeder.state().snacking[0]).toMatchObject({ kind: 'dino', id: 'd1' });
  });

  it('AC315: none at 0 or no bar, and the menu option is null', async () => {
    for (const s of [setup(0), setup(3, false)]) {
      expect(s.feeder.menuOption({ kind: 'dino', id: 'd1' })).toBeNull();
      expect(await s.feeder.feed({ kind: 'dino', id: 'd1' })).toBe(false);
      expect(s.dino.snack).toBeUndefined();
    }
  });

  it('AC315: the menu option says Lavakip geven and gives one on tap', async () => {
    const s = setup(1);
    const opt = s.feeder.menuOption({ kind: 'dino', id: 'd1' });
    expect(opt?.text).toBe(FEED_TEXT);
    opt?.give();
    await vi.waitFor(() => expect(s.rec.carried).toBe(0));
    expect(s.dino.snack).toBeDefined();
    expect(s.feeder.menuOption({ kind: 'dino', id: 'd1' })).toBeNull();
  });

  it('an unknown animal gets no option and costs nothing; one already snacking costs nothing', async () => {
    const s = setup(3);
    expect(s.feeder.menuOption({ kind: 'knight', id: 'x' })).toBeNull();
    expect(await s.feeder.feed({ kind: 'knight', id: 'x' })).toBe(false);
    await s.feeder.feed({ kind: 'dino', id: 'd1' });
    expect(await s.feeder.feed({ kind: 'dino', id: 'd1' })).toBe(false);
    expect(s.rec.carried).toBe(2);
  });

  it('labels follow the body and are hidden when the snack ends', async () => {
    const s = setup(1);
    await s.feeder.feed({ kind: 'dino', id: 'd1' });
    s.feeder.step(0.016);
    expect(s.labels.place).toHaveBeenCalled();
    while (snackStep(s.dino, 0.1)) {
      /* run */
    }
    s.feeder.step(0.016);
    expect(s.labels.hide).toHaveBeenCalledWith('snack-dino-d1-words');
    expect(s.feeder.state().snacking).toEqual([]);
  });

  it('AC319: with reduced motion the hearts show still for 1 second and there is no puff', async () => {
    const rec = { bought: true, spot: null, carried: 1 };
    const dino = { x: 0, y: 0, z: 0, heading: 0, vy: 0, snack: undefined as import('./snack').Snack | undefined };
    const labels = { show: vi.fn(() => true), hide: vi.fn(), place: vi.fn() };
    const feeder = createFeeder({
      economy: { state: () => rec, useOne: async () => ((rec.carried = 0), true) },
      body: () => dino as never,
      labels,
      reducedMotion: true,
    });
    await feeder.feed({ kind: 'dino', id: 'a' });
    expect(labels.show).toHaveBeenCalledWith('snack-dino-a-hearts', expect.any(String), 'snack', 1000);
    expect(labels.show).toHaveBeenCalledWith('snack-dino-a-words', SNACK_LINE, 'snack', 3000);
    expect(labels.show).not.toHaveBeenCalledWith('snack-dino-a-puff', expect.anything(), 'snack', expect.anything());
    expect(dino.snack?.still).toBe(true);
  });
});
