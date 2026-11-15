import { describe, expect, it } from 'vitest';
import {
  AIR, AARDE, BLADEREN, BOOMSTAM, GRAS, KEISTEEN, LAVA, OERSTEEN, STEEN, VEIN_BLOCKS, WAARSCHUWSTEEN, WATER, ZAND,
  isSolid,
} from './blocks';
import { LEGACY_HEIGHT, LEGACY_SEED, LEGACY_SIZE, generateLegacyTerrain, legacyCellIndex } from './terrain-legacy';
import { MOVE, V3_HEIGHT, V3_SIZE, buildTerrainV3, moveSite, startWorld, v3CellIndex } from './terrain-v3';
import { LEGACY_VILLAGE_SITES, houseCells } from './village-layout';

const world = startWorld(LEGACY_SEED);
const get = (x: number, y: number, z: number): number => world[v3CellIndex(x, y, z)] ?? AIR;
const inMiddle = (x: number, z: number): boolean =>
  x >= MOVE.x && x < MOVE.x + LEGACY_SIZE && z >= MOVE.z && z < MOVE.z + LEGACY_SIZE;
/** Ground: the highest solid block that is not a tree block (boomstam, bladeren). */
function ground(x: number, z: number): number {
  for (let y = V3_HEIGHT - 1; y > 0; y--) {
    const b = get(x, y, z);
    if (b !== AIR && isSolid(b) && b !== BOOMSTAM && b !== BLADEREN) return y;
  }
  return 0;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

describe('terrain version 3 (V15a)', () => {
  it('has the size 128 x 128 x 80, the move and the cached start world', () => {
    expect([V3_SIZE, V3_HEIGHT]).toEqual([128, 80]);
    expect(MOVE).toEqual({ x: 32, y: 10, z: 32 });
    expect(world.length).toBe(128 * 80 * 128);
    expect(startWorld(LEGACY_SEED)).toBe(world);
  });

  it('AC231: every legacy version 2 cell at y 1 to 63 is in the middle at the move, y 0 becomes steen', () => {
    const legacy = generateLegacyTerrain(LEGACY_SEED, 2);
    for (let y = 0; y < LEGACY_HEIGHT; y++)
      for (let z = 0; z < LEGACY_SIZE; z++)
        for (let x = 0; x < LEGACY_SIZE; x++) {
          const old = legacy[legacyCellIndex(x, y, z)];
          const now = get(x + MOVE.x, y + MOVE.y, z + MOVE.z);
          if (y === 0) {
            expect(old).toBe(OERSTEEN);
            expect(now).toBe(STEEN);
          } else if (now !== old) expect.fail(`cell ${x} ${y} ${z}: ${old} became ${now}`);
        }
  });

  it('AC231: the middle above the legacy top is air, and the 3 villages and the gate came along', () => {
    for (const site of LEGACY_VILLAGE_SITES) {
      const moved = moveSite(site);
      for (const c of houseCells(moved)) expect(get(c.x, c.y, c.z)).toBe(c.id);
    }
    for (let z = MOVE.z; z < MOVE.z + LEGACY_SIZE; z++)
      for (let x = MOVE.x; x < MOVE.x + LEGACY_SIZE; x++) expect(get(x, V3_HEIGHT - 1, z)).toBe(AIR);
  });

  it('AC231: the same seed gives the same world byte for byte (two uncached builds)', () => {
    const a = buildTerrainV3(LEGACY_SEED);
    const b = buildTerrainV3(LEGACY_SEED);
    expect(sameBytes(a, b)).toBe(true);
    expect(sameBytes(a, world)).toBe(true);
    expect(sameBytes(buildTerrainV3(LEGACY_SEED + 1), a)).toBe(false);
  });

  it('AC232: every column has oersteen at y 0, Waarschuwsteen at y 5 and the right stone around it', () => {
    const veins = new Set(VEIN_BLOCKS);
    const lower = new Set([STEEN, KEISTEEN, ...VEIN_BLOCKS]);
    for (let z = 0; z < V3_SIZE; z++)
      for (let x = 0; x < V3_SIZE; x++) {
        expect(get(x, 0, z)).toBe(OERSTEEN);
        expect(get(x, 5, z)).toBe(WAARSCHUWSTEEN);
        for (let y = 1; y <= 4; y++) if (!lower.has(get(x, y, z))) expect.fail(`${x} ${y} ${z} is ${get(x, y, z)}`);
        for (let y = 6; y <= 9; y++) {
          const b = get(x, y, z);
          if (b !== STEEN && b !== KEISTEEN) expect.fail(`${x} ${y} ${z} is ${b}`);
        }
      }
    for (let y = 6; y < V3_HEIGHT; y++)
      for (let z = 0; z < V3_SIZE; z++)
        for (let x = 0; x < V3_SIZE; x++) {
          const b = get(x, y, z);
          if (b === WAARSCHUWSTEEN || veins.has(b)) expect.fail(`${x} ${y} ${z} is ${b}`);
        }
    // Only y 0 and y 5 hold oersteen and Waarschuwsteen in the whole world below the legacy top.
    let oer = 0;
    for (let i = 0; i < world.length; i++) if (world[i] === OERSTEEN) oer++;
    expect(oer).toBe(V3_SIZE * V3_SIZE);
  });

  it('AC232: each vein id 43 to 50 lies in at least 2 veins of 3 to 6 touching cells', () => {
    const seen = new Set<number>();
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (const id of VEIN_BLOCKS) {
      let groups = 0;
      for (let y = 1; y <= 4; y++)
        for (let z = 0; z < V3_SIZE; z++)
          for (let x = 0; x < V3_SIZE; x++) {
            const i = v3CellIndex(x, y, z);
            if (world[i] !== id || seen.has(i)) continue;
            groups++;
            const stack = [[x, y, z]];
            seen.add(i);
            let size = 0;
            while (stack.length > 0) {
              const [cx, cy, cz] = stack.pop() as number[];
              size++;
              for (const [dx, dy, dz] of dirs) {
                const n = v3CellIndex((cx as number) + (dx as number), (cy as number) + (dy as number), (cz as number) + (dz as number));
                if (world[n] === id && !seen.has(n)) {
                  seen.add(n);
                  stack.push([(cx as number) + (dx as number), (cy as number) + (dy as number), (cz as number) + (dz as number)]);
                }
              }
            }
            expect(size).toBeGreaterThanOrEqual(3);
            expect(size).toBeLessThanOrEqual(6);
          }
      expect(groups, `vein ${id}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('AC234: no water and no lava anywhere in the version 3 world', () => {
    for (let i = 0; i < world.length; i++) {
      if (world[i] === WATER || world[i] === LAVA) expect.fail(`cell ${i}`);
    }
  });

  it('AC234: the seam is within 1 and new land neighbours are within 2 (tree blocks are not ground)', () => {
    let seam = 0;
    let land = 0;
    for (let z = 0; z < V3_SIZE; z++)
      for (let x = 0; x < V3_SIZE; x++) {
        const g = ground(x, z);
        if (inMiddle(x, z)) continue;
        for (const [dx, dz] of [[1, 0], [0, 1]] as const) {
          const nx = x + dx;
          const nz = z + dz;
          if (nx >= V3_SIZE || nz >= V3_SIZE) continue;
          const n = ground(nx, nz);
          if (inMiddle(nx, nz)) {
            seam++;
            expect(Math.abs(g - n), `seam ${x} ${z}`).toBeLessThanOrEqual(1);
          } else {
            land++;
            expect(Math.abs(g - n), `land ${x} ${z}`).toBeLessThanOrEqual(2);
          }
        }
      }
    for (let z = MOVE.z; z < MOVE.z + LEGACY_SIZE; z++)
      for (const x of [MOVE.x - 1, MOVE.x + LEGACY_SIZE]) {
        seam++;
        expect(Math.abs(ground(x, z) - ground(x < MOVE.x ? x + 1 : x - 1, z))).toBeLessThanOrEqual(1);
      }
    expect(seam).toBeGreaterThan(0);
    expect(land).toBeGreaterThan(1000);
  });

  it('AC234: new land is gras or zand on aarde, steen below', () => {
    let gras = 0;
    let zand = 0;
    for (let z = 0; z < V3_SIZE; z++)
      for (let x = 0; x < V3_SIZE; x++) {
        if (inMiddle(x, z)) continue;
        const g = ground(x, z);
        const top = get(x, g, z);
        expect([GRAS, ZAND]).toContain(top);
        if (top === GRAS) gras++;
        else zand++;
        expect([AARDE, ZAND]).toContain(get(x, g - 1, z));
        expect([AIR, BOOMSTAM, BLADEREN]).toContain(get(x, g + 1, z));
      }
    expect(gras).toBeGreaterThan(5000);
    expect(zand).toBeGreaterThan(50);
  });

  it('AC231: trees only on new land gras at least 3 from the middle and the edge, none changes the middle', () => {
    let trunks = 0;
    for (let y = 10; y < V3_HEIGHT; y++)
      for (let z = 0; z < V3_SIZE; z++)
        for (let x = 0; x < V3_SIZE; x++) {
          const b = get(x, y, z);
          if (b !== BOOMSTAM && b !== BLADEREN) continue;
          if (inMiddle(x, z)) continue;
          if (b === BOOMSTAM) {
            trunks++;
            const d = Math.max(0, MOVE.x - x, x - (MOVE.x + 63), MOVE.z - z, z - (MOVE.z + 63));
            expect(d, `trunk ${x} ${z}`).toBeGreaterThanOrEqual(3);
            expect(Math.min(x, z, V3_SIZE - 1 - x, V3_SIZE - 1 - z)).toBeGreaterThanOrEqual(3);
            let below = y;
            while (get(x, below - 1, z) === BOOMSTAM) below--;
            expect(get(x, below - 1, z)).toBe(GRAS);
          }
        }
    expect(trunks).toBeGreaterThan(80 * 3);
  });
});
