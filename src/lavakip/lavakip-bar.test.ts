import { describe, expect, it, vi } from 'vitest';
import { createTargetList } from '../monsters/targets';
import { BAR_TAP_REACH, createLavakipBar } from './lavakip-bar';
import type { LavakipEconomy } from './lavakip-economy';
import type { LavakipRecord } from './lavakip-types';

const SPOT = { x: 100, y: 20, z: 100 };

function make(record: LavakipRecord, pose = { x: 101, y: 21.6, z: 94, yaw: 0, pitch: 0 }) {
  const economy = {
    state: () => record,
    placeHere: vi.fn(() => Promise.resolve(true)),
    order: vi.fn(() => Promise.resolve(true)),
    moveHome: vi.fn(() => Promise.resolve()),
  } as unknown as LavakipEconomy;
  const syncActors = vi.fn();
  const openCard = vi.fn();
  const bar = createLavakipBar({
    economy,
    renderer: { syncActors },
    viewport: () => ({ width: 1000, height: 700 }),
    player: { pose: () => pose },
    openCard,
  });
  return { bar, economy, syncActors, openCard, record, pose };
}
const bought: LavakipRecord = { bought: true, spot: SPOT, carried: 0 };

describe('Lavakip-bar system (v23)', () => {
  it('AC313: nothing shows and no tap opens it while no bar is bought', () => {
    const s = make({ bought: false, spot: null, carried: 0 });
    s.bar.step(1);
    expect(s.syncActors).toHaveBeenLastCalledWith('props', []);
    expect(s.bar.screenPoint()).toBeNull();
    expect(s.bar.handleTap?.(500, 350)).toBe(false);
    expect(s.bar.keepOut(100, 19, 100)).toBe(false);
  });
  it('AC312: one props actor stands at the spot, once', () => {
    const s = make(bought);
    s.bar.step(0.1);
    s.bar.step(0.1);
    expect(s.syncActors).toHaveBeenCalledTimes(1);
    expect(s.syncActors).toHaveBeenCalledWith('props', [expect.objectContaining({ id: 'bar', model: 'lavakip-bar', x: 100.5, y: 20, z: 100.5 })]);
  });
  it('AC313: a tap on the truck within 12 opens the card, a tap elsewhere or 20 away does not', () => {
    const near = make(bought);
    const at = near.bar.screenPoint()!;
    expect(at).not.toBeNull();
    expect(near.bar.handleTap?.(at.x, at.y)).toBe(true);
    expect(near.openCard).toHaveBeenCalledTimes(1);
    expect(near.bar.handleTap?.(5, 5)).toBe(false);
    const far = make(bought, { x: 101, y: 21.6, z: 80, yaw: 0, pitch: 0 });
    const p = far.bar.screenPoint()!;
    expect(BAR_TAP_REACH).toBe(12);
    expect(far.bar.handleTap?.(p.x, p.y)).toBe(false);
    expect(far.openCard).not.toHaveBeenCalled();
  });
  it('AC313: the truck is never occupied, so the kid and the animals walk through it', () => {
    const s = make(bought);
    expect(s.bar.isOccupied?.([99, 20, 99, 103, 22, 104])).toBe(false);
  });
  it('AC313: keepOut is true under the footprint and within 1 block, false at 2', () => {
    const { bar } = make(bought);
    for (let x = 100; x < 102; x++) for (let z = 100; z < 103; z++) for (let y = 19; y <= 23; y++) expect(bar.keepOut(x, y, z)).toBe(true);
    for (let x = 99; x <= 102; x++) for (let z = 99; z <= 103; z++) expect(bar.keepOut(x, 19, z)).toBe(true);
    for (const [x, z] of [[98, 100], [103 + 0, 100], [100, 97], [100, 104], [98, 98], [104, 104]] as const) expect(bar.keepOut(x, 19, z)).toBe(false);
    expect(bar.keepOut(103, 19, 100)).toBe(false);
    expect(bar.keepOut(100, 14, 100)).toBe(false);
  });
  it('AC313: the bar is a near sound target', () => {
    const { bar } = make(bought);
    const list = createTargetList();
    bar.collectTargets(list);
    expect(list.count).toBe(1);
    expect(list.items[0]).toMatchObject({ id: 'bar', kind: 'bar', x: 101, y: 20, z: 101.5 });
  });
  it('AC312: placeHere and order go to the economy, and the new spot shows', async () => {
    const rec: LavakipRecord = { bought: true, spot: { ...SPOT }, carried: 0 };
    const s = make(rec);
    s.bar.step(0.1);
    rec.spot = { x: 50, y: 20, z: 50 };
    expect(await s.bar.placeHere()).toBe(true);
    s.bar.step(0.1);
    expect(s.syncActors).toHaveBeenLastCalledWith('props', [expect.objectContaining({ x: 50.5, z: 50.5 })]);
    expect(await s.bar.order()).toBe(true);
    expect(s.economy.order).toHaveBeenCalledTimes(1);
  });
});
