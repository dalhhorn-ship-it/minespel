import { describe, expect, it, vi } from 'vitest';
import { createDino } from '../dinos/dino-ai';
import { createKnightBody } from './knight-ai';
import { computeGuards, createGuardSet, GUARD_EVERY_MS, MARK_TAP_MS, type GuardAnimal } from './guard-set';
import type { KnightMode, KnightState } from './knight-types';
import type { ActorLabels } from '../ui/actor-labels';

const Y = 11;
function knight(id: string, mode: KnightMode, x: number, z: number): KnightState {
  const body = createKnightBody({ x, y: Y, z });
  return { id, mode, spot: mode === 'follow' ? null : { x, y: Y, z }, boughtFor: 0, body, chase: null, saluteClockMs: 0, visible: true };
}
let n = 0;
function animal(x: number, z: number, patch: Partial<GuardAnimal> = {}): GuardAnimal {
  return { ...createDino({ kind: 'compy', golden: false, x, y: Y, z }, true), id: `a${n++}`, ...patch };
}
const run = (ks: KnightState[], animals: GuardAnimal[]) => {
  const out = new Map<string, string>();
  computeGuards(ks, animals, out, []);
  return out;
};

describe('AC331: who a guard knight guards', () => {
  it('AC331: 7 animals in his area give exactly the 4 nearest to his spot', () => {
    const animals = [1, 2, 3, 4, 5, 6, 7].map((d) => animal(50 + d * 0.9, 50));
    const out = run([knight('k', 'guard', 50, 50)], animals);
    expect([...out.keys()].sort()).toEqual(animals.slice(0, 4).map((a) => a.id).sort());
  });
  it('AC331: an animal at 9 blocks, a follower and a called dino are never guarded', () => {
    const far = animal(59, 50);
    const follower = animal(51, 50, { mode: 'follow' });
    const called = animal(52, 50, { called: 5 });
    const ok = animal(53, 50);
    const out = run([knight('k', 'guard', 50, 50)], [far, follower, called, ok]);
    expect([...out.keys()]).toEqual([ok.id]);
  });
  it('AC331: 3 knights 2 apart with 15 animals guard exactly 12 and no animal twice', () => {
    const animals = Array.from({ length: 15 }, (_, i) => animal(50 + (i % 5), 50 + Math.floor(i / 5)));
    const ks = [knight('a', 'guard', 50, 50), knight('b', 'guard', 52, 50), knight('c', 'guard', 54, 50)];
    const out = run(ks, animals);
    expect(out.size).toBe(12);
    for (const k of ks) expect([...out.values()].filter((v) => v === k.id)).toHaveLength(4);
  });
  it('AC331: Blijf hier, Volg mij, Jaag monsters weg and a knight switched off guard nobody', () => {
    const animals = [animal(51, 50), animal(52, 50)];
    const off = knight('o', 'guard', 50, 50);
    off.visible = false;
    expect(run([knight('s', 'stay', 50, 50), knight('f', 'follow', 50, 50), knight('c', 'chase', 50, 50), off], animals).size).toBe(0);
  });
});

describe('AC331: the 1000 ms tick', () => {
  function setup(animals: GuardAnimal[]) {
    const ks = [knight('k', 'guard', 50, 50)];
    const source = vi.fn(() => animals);
    const set = createGuardSet({ knights: () => ks, animals: source });
    return { set, source, ks };
  }
  it('AC331: nothing is computed between two ticks', () => {
    const { set, source } = setup([animal(51, 50)]);
    set.step(1 / 30);
    expect(source).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 20; i++) set.step(1 / 30);
    expect(source).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 20; i++) set.step(1 / 30);
    expect(source).toHaveBeenCalledTimes(2);
  });
  it('AC331: an animal that walks out or goes on Volg mij is replaced within 2000 ms', () => {
    const a = animals4();
    const spare = animal(55, 50);
    const { set } = setup([...a, spare]);
    set.step(1 / 30);
    expect(set.guardedBy(spare.id)).toBeNull();
    a[0]!.x = 70;
    a[1]!.mode = 'follow';
    for (let ms = 0; ms < 2000; ms += 100) set.step(0.1);
    expect(set.guardedBy(a[0]!.id)).toBeNull();
    expect(set.guardedBy(a[1]!.id)).toBeNull();
    expect(set.guardedBy(spare.id)).toBe('k');
    expect(set.state()).toHaveLength(3);
  });
  it('AC331: with no animal source nobody is guarded', () => {
    const set = createGuardSet({ knights: () => [knight('k', 'guard', 50, 50)] });
    set.step(GUARD_EVERY_MS / 1000);
    expect(set.state()).toEqual([]);
  });
});

function animals4(): GuardAnimal[] {
  return [51, 52, 53, 54].map((x) => animal(x, 50));
}

describe('AC333: the shield marks', () => {
  function fakeLabels() {
    const shown = new Set<string>();
    const labels = {
      show: vi.fn((key: string) => { shown.add(key); return true; }),
      hide: vi.fn((key: string) => { shown.delete(key); }),
      place: vi.fn(), step: vi.fn(), setRunning: vi.fn(), count: () => shown.size, has: (k: string) => shown.has(k),
    } as unknown as ActorLabels;
    return { labels, shown };
  }
  function setup(mole: { on: boolean }) {
    const ks = [knight('k', 'guard', 50, 50), knight('s', 'stay', 50, 50)];
    const animals = [...animals4(), animal(54.5, 50)];
    const { labels, shown } = fakeLabels();
    const set = createGuardSet({
      knights: () => ks, animals: () => animals, labels, moleAround: () => mole.on,
      pose: () => ({ x: 50, y: 12, z: 45, yaw: 0, pitch: 0 }), viewport: () => ({ width: 1024, height: 768 }),
    });
    return { set, shown, animals };
  }
  const tick = (set: ReturnType<typeof setup>['set'], ms: number) => { for (let t = 0; t < ms; t += 50) set.step(0.05); };

  it('AC333: with a free or away mole exactly the guarded animals show a mark', () => {
    const { set, shown, animals } = setup({ on: true });
    tick(set, 1100);
    expect(shown.size).toBe(4);
    for (const a of animals) expect(shown.has(`shield-${a.id}`)).toBe(set.guardedBy(a.id) !== null);
  });
  it('AC333: with no mole no mark shows, and a tap on a guarding knight shows them for 5 s (plus or minus 0.5)', () => {
    const mole = { on: false };
    const { set, shown } = setup(mole);
    tick(set, 1100);
    expect(shown.size).toBe(0);
    set.tapped('s');
    tick(set, 200);
    expect(shown.size).toBe(0);
    set.tapped('k');
    tick(set, 200);
    expect(shown.size).toBe(4);
    tick(set, MARK_TAP_MS - 700);
    expect(shown.size).toBe(4);
    tick(set, 1000);
    expect(shown.size).toBe(0);
  });
  it('AC333: a mole that comes shows the marks within 100 ms, one that goes hides them', () => {
    const mole = { on: false };
    const { set, shown } = setup(mole);
    tick(set, 1100);
    mole.on = true;
    tick(set, 150);
    expect(shown.size).toBe(4);
    mole.on = false;
    tick(set, 150);
    expect(shown.size).toBe(0);
  });
});
