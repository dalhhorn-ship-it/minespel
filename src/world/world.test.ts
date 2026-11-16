import { describe, expect, it } from 'vitest';
import { AIR, GRAS, BLADEREN, BOOMSTAM, KEISTEEN, OBSIDIAAN, OERSTEEN, PLACEABLE_BLOCKS, VUURSTEEN, ZAND, isSolid } from './blocks';
import { CELL_COUNT, START_SPOT, WORLD_HEIGHT, WORLD_SIZE, cellIndex, generateTerrain } from './terrain';
import { createRng } from '../core/rng';
import { World } from './world';
import { mineBlock, placeBlock } from './build';
import { VILLAGE_SITES, houseCells, siteHasHouses } from './village-layout';

/** Cell for cell equality. `toEqual` on 1.3 million cells is slow, and a failing `expect` would print them. */
function sameCells(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function topSolid(w: World, x: number, z: number): number {
  for (let y = WORLD_HEIGHT - 1; y >= 0; y--) if (isSolid(w.get(x, y, z))) return y;
  return -1;
}

describe('terrain', () => {
  it('is the same for the same seed and differs for another', () => {
    // Compared as bytes: toEqual on 1.3 million cells is slow.
    expect(sameCells(generateTerrain(5), generateTerrain(5))).toBe(true);
    expect(sameCells(generateTerrain(5), generateTerrain(6))).toBe(false);
    expect(generateTerrain().length).toBe(CELL_COUNT);
    expect(CELL_COUNT).toBe(WORLD_SIZE * WORLD_HEIGHT * WORLD_SIZE);
  });

  it('has oersteen on y = 0 everywhere and nowhere else', () => {
    const w = new World();
    let other = 0;
    for (let z = 0; z < WORLD_SIZE; z++)
      for (let x = 0; x < WORLD_SIZE; x++) {
        expect(w.get(x, 0, z)).toBe(OERSTEEN);
        for (let y = 1; y < WORLD_HEIGHT; y++) if (w.get(x, y, z) === OERSTEEN) other++;
      }
    expect(other).toBe(0);
  });

  it('has the expected kinds of ground including 4 obsidian blocks for the gate floor (CR2)', () => {
    const counts = new Map<number, number>();
    for (const b of generateTerrain()) counts.set(b, (counts.get(b) ?? 0) + 1);
    for (const id of [GRAS, ZAND, BOOMSTAM, BLADEREN, KEISTEEN, VUURSTEEN]) {
      expect(counts.get(id) ?? 0).toBeGreaterThan(0);
    }
    expect(counts.get(OBSIDIAAN)).toBe(4);
  });

  it('has gentle hills (not flat, not steep)', () => {
    const w = new World();
    const heights: number[] = [];
    for (let z = 0; z < WORLD_SIZE; z++) for (let x = 0; x < WORLD_SIZE; x++) heights.push(topSolid(w, x, z));
    expect(Math.max(...heights)).toBeGreaterThan(Math.min(...heights));
    expect(Math.max(...heights)).toBeLessThan(WORLD_HEIGHT - 1);
  });

  it('puts the start spot on the ground in the middle with air above', () => {
    const w = new World();
    const x = Math.floor(START_SPOT.x);
    const z = Math.floor(START_SPOT.z);
    expect(x).toBe(Math.floor(WORLD_SIZE / 2));
    expect(isSolid(w.get(x, START_SPOT.y - 1, z))).toBe(true);
    expect(w.get(x, START_SPOT.y, z)).toBe(AIR);
    expect(w.get(x, START_SPOT.y + 1, z)).toBe(AIR);
  });
});

describe('World', () => {
  it('AC230: the world is 128 x 128 x 80 and an edge cell is in bounds, the next one is not', () => {
    const w = new World();
    expect(w.inBounds(127, 79, 127)).toBe(true);
    expect(w.inBounds(128, 0, 0)).toBe(false);
    expect(w.inBounds(0, 80, 0)).toBe(false);
    expect(w.set(128, 5, 5, 1)).toBe(false);
  });

  /** The old way: scan every cell against the start world. */
  const startCopy = generateTerrain();
  function fullScan(w: World): number[] {
    const out: number[] = [];
    for (let y = 0; y < WORLD_HEIGHT; y++)
      for (let z = 0; z < WORLD_SIZE; z++)
        for (let x = 0; x < WORLD_SIZE; x++) {
          const i = cellIndex(x, y, z);
          const b = w.get(x, y, z);
          if (b !== startCopy[i]) out.push(i * 256 + b);
        }
    return out;
  }

  it('AC230: the fast diff() equals a full scan after 500 random sets, resets and applyDiff', () => {
    const rng = createRng(77);
    const w = new World();
    const randomSets = (n: number) => {
      for (let k = 0; k < n; k++) {
        const x = rng.int(0, WORLD_SIZE - 1);
        const y = rng.int(0, WORLD_HEIGHT - 1);
        const z = rng.int(0, WORLD_SIZE - 1);
        // Sometimes back to the start block: then the cell is not in the diff.
        const same = rng.next() < 0.2;
        w.set(x, y, z, same ? (startCopy[cellIndex(x, y, z)] as number) : rng.int(0, 20));
      }
    };
    randomSets(200);
    expect(Array.from(w.diff())).toEqual(fullScan(w));
    const saved = w.diff();
    randomSets(150);
    expect(Array.from(w.diff())).toEqual(fullScan(w));
    w.applyDiff(saved);
    expect(Array.from(w.diff())).toEqual(Array.from(saved));
    expect(Array.from(w.diff())).toEqual(fullScan(w));
    randomSets(150);
    expect(Array.from(w.diff())).toEqual(fullScan(w));
    w.reset();
    expect(w.diff()).toHaveLength(0);
    expect(fullScan(w)).toEqual([]);
    randomSets(50);
    expect(Array.from(w.diff())).toEqual(fullScan(w));
  });

  it('two worlds from the same seed are equal', () => {
    expect(new World().diff()).toEqual(new World().diff());
    expect(new World().diff()).toHaveLength(0);
  });

  it('all 32 placeable blocks can be set and read back', () => {
    const w = new World();
    expect(PLACEABLE_BLOCKS).toHaveLength(32);
    PLACEABLE_BLOCKS.forEach((id, i) => {
      expect(w.set(i, WORLD_HEIGHT - 1, 0, id)).toBe(true);
      expect(w.get(i, WORLD_HEIGHT - 1, 0)).toBe(id);
    });
  });

  it('reads air and refuses writes outside the world', () => {
    const w = new World();
    expect(w.get(-1, 5, 0)).toBe(AIR);
    expect(w.get(0, WORLD_HEIGHT, 0)).toBe(AIR);
    expect(w.get(WORLD_SIZE, 5, 0)).toBe(AIR);
    expect(w.set(WORLD_SIZE, 5, 0, GRAS)).toBe(false);
    expect(w.set(0, -1, 0, GRAS)).toBe(false);
    expect(w.diff()).toHaveLength(0);
  });

  it('diff round trip: changes survive, other cells stay', () => {
    const w = new World();
    const top = topSolid(w, 10, 10);
    w.set(10, top, 10, AIR);
    w.set(10, top + 1, 10, PLACEABLE_BLOCKS[5] ?? GRAS);
    w.set(WORLD_SIZE - 1, WORLD_HEIGHT - 1, WORLD_SIZE - 1, PLACEABLE_BLOCKS[15] ?? GRAS);
    const diff = w.diff();
    expect(diff).toHaveLength(3);

    const copy = World.fromDiff(diff);
    expect(copy.diff()).toEqual(diff);
    expect(copy.get(10, top, 10)).toBe(AIR);
    expect(copy.get(10, top + 1, 10)).toBe(PLACEABLE_BLOCKS[5]);
    expect(copy.get(WORLD_SIZE - 1, WORLD_HEIGHT - 1, WORLD_SIZE - 1)).toBe(PLACEABLE_BLOCKS[15]);
    expect(copy.get(20, 3, 20)).toBe(w.get(20, 3, 20));
  });

  it('a change set back to the start block is not in the diff', () => {
    const w = new World();
    const top = topSolid(w, 12, 12);
    const original = w.get(12, top, 12);
    w.set(12, top, 12, AIR);
    expect(w.diff()).toHaveLength(1);
    w.set(12, top, 12, original);
    expect(w.diff()).toHaveLength(0);
  });

  it('applyDiff replaces earlier edits, reset goes back to the start', () => {
    const w = new World();
    w.set(1, WORLD_HEIGHT - 1, 1, GRAS);
    w.applyDiff([]);
    expect(w.get(1, WORLD_HEIGHT - 1, 1)).toBe(AIR);
    w.set(1, WORLD_HEIGHT - 1, 1, GRAS);
    w.reset();
    expect(w.diff()).toHaveLength(0);
  });

  it('ignores diff entries outside the world', () => {
    const w = new World();
    w.applyDiff([CELL_COUNT * 256 + 3]);
    expect(w.diff()).toHaveLength(0);
  });

  it('diff entries fit in a Uint32', () => {
    expect(CELL_COUNT * 256).toBeLessThan(2 ** 32);
  });
});

describe('villages in the world (v11)', () => {
  const has = (w: World) => VILLAGE_SITES.map((s) => siteHasHouses((x, y, z) => w.get(x, y, z), s));

  it('AC178: a new world has all 3 villages at the same spots every time', () => {
    const a = new World();
    const b = new World();
    expect(a.terrainVersion).toBe(3);
    expect(has(a)).toEqual([true, true, true]);
    for (const s of VILLAGE_SITES) for (const c of houseCells(s)) expect(b.get(c.x, c.y, c.z)).toBe(c.id);
  });

  it('AC178: "Wereld opnieuw beginnen" (reset) brings every village back', () => {
    const w = new World();
    for (const c of houseCells(VILLAGE_SITES[0]!)) w.set(c.x, c.y, c.z, AIR);
    expect(has(w)[0]).toBe(false);
    w.reset();
    expect(has(w)).toEqual([true, true, true]);
    expect(w.diff()).toHaveLength(0);
  });

  it('AC178: a house block can be mined (Hakken) and built on (Bouwen) like any block', () => {
    const w = new World();
    const site = VILLAGE_SITES[0]!;
    const h = site.houses[0]!;
    // Stand outside the house, in front of a wall, and mine the wall block next to the door.
    const wall = { x: h.x + 1, y: site.padY + 1, z: h.z + 4 };
    const before = w.get(wall.x, wall.y, wall.z);
    expect(before).not.toBe(AIR);
    const mined = mineBlock(w, { ox: wall.x + 0.5, oy: wall.y + 0.5, oz: wall.z + 2.5, dx: 0, dy: 0, dz: -1 });
    expect(mined).toEqual({ ok: true, ...wall, block: before });
    expect(w.get(wall.x, wall.y, wall.z)).toBe(AIR);
    // Build on the roof from above.
    const roofY = site.padY + 4;
    const placed = placeBlock(w, { ox: h.x + 2.5, oy: roofY + 3, oz: h.z + 2.5, dx: 0, dy: -1, dz: 0 }, GRAS, { x: 0.5, y: 40, z: 0.5 });
    expect(placed.ok).toBe(true);
    expect(w.get(h.x + 2, roofY + 1, h.z + 2)).toBe(GRAS);
  });
});


describe('hidden cell overlay (v18, decision 135)', () => {
  // The spot of 0.7.0 (40, 40) moved into the middle of the big world.
  const at = { x: 72, z: 72 };
  const y = () => topSolid(new World(), at.x, at.z);

  it('AC218: a hidden cell reads air, the block stays and diff() is unchanged', () => {
    const w = new World();
    const top = y();
    const real = w.get(at.x, top, at.z);
    const before = w.diff();
    expect(w.hide(at.x, top, at.z)).toBe(true);
    expect(w.get(at.x, top, at.z)).toBe(AIR);
    expect(w.isHidden(at.x, top, at.z)).toBe(true);
    expect(w.hiddenCount()).toBe(1);
    expect(w.diff()).toEqual(before);
    expect(w.isUnchanged(at.x, top, at.z)).toBe(true);
    expect(w.hide(at.x, top, at.z)).toBe(false);
    expect(w.unhide(at.x, top, at.z)).toBe(true);
    expect(w.get(at.x, top, at.z)).toBe(real);
    expect(w.unhide(at.x, top, at.z)).toBe(false);
  });
  it('AC218: set on a hidden cell clears it and the kid block wins', () => {
    const w = new World();
    const top = y();
    w.hide(at.x, top, at.z);
    w.set(at.x, top, at.z, ZAND);
    expect(w.isHidden(at.x, top, at.z)).toBe(false);
    expect(w.get(at.x, top, at.z)).toBe(ZAND);
    expect(w.isUnchanged(at.x, top, at.z)).toBe(false);
  });
  it('AC218: reset and applyDiff clear every hidden cell', () => {
    const w = new World();
    const top = y();
    w.hide(at.x, top, at.z);
    w.hide(at.x + 1, top, at.z);
    w.reset();
    expect(w.hiddenCount()).toBe(0);
    w.hide(at.x, top, at.z);
    w.applyDiff([]);
    expect(w.hiddenCount()).toBe(0);
  });
  it('AC218: hiddenCells lists the cells and out of bounds is refused', () => {
    const w = new World();
    const top = y();
    w.hide(at.x, top, at.z);
    expect(w.hiddenCells()).toEqual([{ x: at.x, y: top, z: at.z }]);
    expect(w.hide(-1, 0, 0)).toBe(false);
    expect(w.isUnchanged(-1, 0, 0)).toBe(true);
  });
});
