import { describe, expect, it } from 'vitest';
import { AIR, BLADEREN, BOOMSTAM, GRAS, OBSIDIAAN, PLANKEN, STEEN, VUUR } from './blocks';
import { GATE_FLOOR_X, GATE_Z, gateFill } from './gate';
import { GROUND_Y, MID, START_SPOT, WORLD_HEIGHT, WORLD_SIZE } from './terrain';
import { World } from './world';

const [F1, F2, F3, F4] = GATE_FLOOR_X as [number, number, number, number];
const G = GROUND_Y;

function pillar(w: World, x: number, n: number, block = OBSIDIAAN, z = GATE_Z, g = G) {
  for (let i = 1; i <= n; i++) w.set(x, g + i, z, block);
}
const key = (c: { x: number; y: number; z: number }) => `${c.x},${c.y},${c.z}`;
const opening = (h: number) => {
  const out: string[] = [];
  for (const x of [F2, F3]) for (let y = G + 1; y <= G + h; y++) out.push(`${x},${y},${GATE_Z}`);
  return out.sort();
};

describe('the gate spot in the fixed world (AC159)', () => {
  it('has obsidiaan at F1 to F4, flush with the ground, 4 in front of the start', () => {
    const w = new World();
    expect(G).toBe(START_SPOT.y - 1);
    expect(GATE_Z).toBe(MID + 4);
    expect(GATE_FLOOR_X).toEqual([MID + 1, MID, MID - 1, MID - 2]);
    for (const x of GATE_FLOOR_X) {
      expect(w.get(x, G, GATE_Z)).toBe(OBSIDIAAN);
      expect(w.get(x, G + 1, GATE_Z)).toBe(AIR);
      expect(w.get(x, G - 1, GATE_Z)).not.toBe(AIR);
    }
  });

  it('has flat ground and no trees around it', () => {
    const w = new World();
    for (let z = MID + 3; z <= MID + 5; z++) {
      for (let x = MID - 3; x <= MID + 2; x++) {
        if (z !== GATE_Z || !GATE_FLOOR_X.includes(x)) expect(w.get(x, G, z)).toBe(GRAS);
        for (let y = G + 1; y < WORLD_HEIGHT; y++) expect(w.get(x, y, z)).toBe(AIR);
      }
    }
  });

  it('no tree trunk or leaves in the area, over many seeds', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const w = new World(seed);
      for (let z = MID + 3; z <= MID + 5; z++)
        for (let x = MID - 3; x <= MID + 2; x++)
          for (let y = 0; y < WORLD_HEIGHT; y++) {
            const id = w.get(x, y, z);
            expect(id === BOOMSTAM || id === BLADEREN).toBe(false);
          }
    }
    expect(WORLD_SIZE).toBeGreaterThan(MID + 5);
  });

  it('is back after the world is reset', () => {
    const w = new World();
    for (const x of GATE_FLOOR_X) w.set(x, G, GATE_Z, AIR);
    w.reset();
    for (const x of GATE_FLOOR_X) expect(w.get(x, G, GATE_Z)).toBe(OBSIDIAAN);
  });
});

describe('gateFill', () => {
  it('nothing happens for the plain start world', () => {
    expect(gateFill(new World())).toEqual([]);
  });

  it('AC160: pillars of 2 and vuur at G+1 above F2 fill the 4 opening cells', () => {
    const w = new World();
    pillar(w, F1, 2);
    pillar(w, F4, 2);
    w.set(F2, G + 1, GATE_Z, VUUR);
    expect(gateFill(w).map(key).sort()).toEqual(opening(2).filter((k) => k !== `${F2},${G + 1},${GATE_Z}`));
  });

  it('AC161: pillars of 3 and 2 fill G+1 to G+2 only', () => {
    const w = new World();
    pillar(w, F1, 3);
    pillar(w, F4, 2);
    w.set(F3, G + 2, GATE_Z, VUUR);
    const cells = gateFill(w);
    expect(cells.map(key).sort()).toEqual(opening(2).filter((k) => k !== `${F3},${G + 2},${GATE_Z}`));
    expect(cells.some((c) => c.y === G + 3)).toBe(false);
  });

  it('AC162: vuur first, then the pillar is finished, fills the opening', () => {
    const w = new World();
    pillar(w, F1, 2);
    pillar(w, F4, 1);
    w.set(F2, G + 1, GATE_Z, VUUR);
    expect(gateFill(w)).toEqual([]);
    w.set(F4, G + 2, GATE_Z, OBSIDIAAN);
    expect(gateFill(w)).toHaveLength(3);
  });

  it('AC162: a pillar of 1, a missing floor cell or a steen pillar fills nothing', () => {
    const base = () => {
      const w = new World();
      pillar(w, F1, 2);
      pillar(w, F4, 2);
      w.set(F2, G + 1, GATE_Z, VUUR);
      return w;
    };
    const one = base();
    one.set(F1, G + 2, GATE_Z, AIR);
    expect(gateFill(one)).toEqual([]);
    const missing = base();
    missing.set(F3, G, GATE_Z, GRAS);
    expect(gateFill(missing)).toEqual([]);
    const steen = base();
    steen.set(F4, G + 2, GATE_Z, STEEN);
    expect(gateFill(steen)).toEqual([]);
    const gap = base();
    gap.set(F1, G + 1, GATE_Z, AIR);
    gap.set(F1, G + 2, GATE_Z, OBSIDIAAN);
    expect(gateFill(gap)).toEqual([]);
    const noFire = base();
    noFire.set(F2, G + 1, GATE_Z, AIR);
    expect(gateFill(noFire)).toEqual([]);
  });

  it('AC163: planken and occupied cells are skipped, and fill later when free', () => {
    const w = new World();
    pillar(w, F1, 2);
    pillar(w, F4, 2);
    w.set(F2, G + 1, GATE_Z, VUUR);
    w.set(F3, G + 1, GATE_Z, PLANKEN);
    const busyCell = `${F3},${G + 2},${GATE_Z}`;
    const busy = (box: number[]) => `${box[0]},${box[1]},${box[2]}` === busyCell;
    expect(gateFill(w, busy).map(key)).toEqual([`${F2},${G + 2},${GATE_Z}`]);
    expect(gateFill(w).map(key)).toEqual([`${F2},${G + 2},${GATE_Z}`, busyCell]);
  });

  it('the same frame built elsewhere fills nothing', () => {
    const w = new World();
    const z = GATE_Z + 4;
    const g = G;
    for (const x of GATE_FLOOR_X) w.set(x, g, z, OBSIDIAAN);
    pillar(w, F1, 2, OBSIDIAAN, z);
    pillar(w, F4, 2, OBSIDIAAN, z);
    w.set(F2, g + 1, z, VUUR);
    expect(gateFill(w)).toEqual([]);
    // Shifted along x: the real floor is broken
    const w2 = new World();
    for (const x of GATE_FLOOR_X) w2.set(x - 3, G, GATE_Z, OBSIDIAAN);
    pillar(w2, F1 - 3, 2);
    pillar(w2, F4 - 3, 2);
    w2.set(F2 - 3, G + 1, GATE_Z, VUUR);
    w2.set(F2, G, GATE_Z, AIR);
    expect(gateFill(w2)).toEqual([]);
  });

  it('pillars 20 high: one quick call', () => {
    const w = new World();
    pillar(w, F1, 20);
    pillar(w, F4, 20);
    w.set(F2, G + 1, GATE_Z, VUUR);
    const t0 = performance.now();
    const cells = gateFill(w);
    expect(performance.now() - t0).toBeLessThan(5);
    expect(cells).toHaveLength(39);
  });
});
