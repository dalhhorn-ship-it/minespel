// The old save builder (tests/fixtures/move/old-saves.ts) against the 0.7.0 code that is still in place (V15a).
// V15b switched the world size, so the 0.7.0 `World` class is gone: the diff cases now replay the same `set` calls on
// a legacy array and scan it (the 0.7.0 `World.diff()` rule: every cell that differs from the start world).
import { describe, expect, it } from 'vitest';
import { deserializeDino, deserializeEgg, serializeDino, serializeEgg } from '../../src/dinos/dino-store';
import { createDino } from '../../src/dinos/dino-ai';
import { createEgg } from '../../src/dinos/egg';
import { KNIGHT_MODES, defaultKv, type KnightRecord } from '../../src/storage/schema';
import { AIR, PLANKEN, SMARAGD, isPlaceable } from '../../src/world/blocks';
import { LEGACY_SEED, generateLegacyTerrain, legacyCellIndex } from '../../src/world/terrain-legacy';
import { WORLD_SEED } from '../../src/world/terrain';
import { inRegion, siteRegion, LEGACY_VILLAGE_SITES } from '../../src/world/village-layout';
import { hutChanges, legacyDiff, save040, save070 } from '../fixtures/move/old-saves';

function worldDiffAfter(version: 1 | 2, changes: readonly (readonly number[])[]): Uint32Array {
  const start = generateLegacyTerrain(WORLD_SEED, version);
  const blocks = start.slice();
  for (const [x, y, z, id] of changes) blocks[legacyCellIndex(x as number, y as number, z as number)] = id as number;
  const out: number[] = [];
  for (let i = 0; i < blocks.length; i++) if (blocks[i] !== start[i]) out.push(i * 256 + (blocks[i] as number));
  return Uint32Array.from(out);
}

describe('old save builder', () => {
  it('uses the same seed as the game', () => {
    expect(LEGACY_SEED).toBe(WORLD_SEED);
  });

  it('AC235: the 0.7.0 world diff equals World.diff() of the 0.7.0 code after the same set calls', () => {
    const s = save070();
    const expected = worldDiffAfter(2, s.changes);
    expect(Array.from(s.world.diff)).toEqual(Array.from(expected));
    expect(s.world.terrainVersion).toBe(2);
    expect(s.world.diff.length).toBeGreaterThan(40);
  });

  it('AC235: the 0.4.0 world diff equals World.diff() against terrain version 1 and has no terrainVersion', () => {
    const s = save040();
    expect(Array.from(s.world.diff)).toEqual(Array.from(worldDiffAfter(1, s.changes)));
    expect('terrainVersion' in s.world).toBe(false);
  });

  it('AC235: the 0.7.0 save holds the hut, 6 holes and a smaragd', () => {
    const s = save070();
    const base = generateLegacyTerrain(LEGACY_SEED, 2);
    const w = generateLegacyTerrain(LEGACY_SEED, 2);
    for (const e of s.world.diff) w[Math.floor(e / 256)] = e % 256;
    const get = (x: number, y: number, z: number): number => w[legacyCellIndex(x, y, z)] as number;
    let planken = 0;
    let holes = 0;
    let smaragd = 0;
    for (const e of s.world.diff) {
      const b = e % 256;
      if (b === PLANKEN) planken++;
      if (b === SMARAGD) smaragd++;
      if (b === AIR && base[Math.floor(e / 256)] !== AIR) holes++;
    }
    expect(smaragd).toBe(1);
    expect(planken).toBeGreaterThan(40);
    // 6 holes plus the door and the hut interior cleared of any grass or tree.
    expect(holes).toBeGreaterThanOrEqual(6);
    // The hut stands clear of every site.
    for (const c of hutChanges(base, 38, 18)) {
      for (const site of LEGACY_VILLAGE_SITES) expect(inRegion(siteRegion(site), c[0], c[2])).toBe(false);
    }
    // The door: 2 cells high in the middle of the front wall.
    const floor = hutChanges(base, 38, 18)[0]?.[1] as number;
    expect(get(40, floor + 1, 22)).toBe(AIR);
    expect(get(40, floor + 2, 22)).toBe(AIR);
    expect(get(40, floor + 3, 22)).toBe(PLANKEN);
    expect(get(38, floor + 1, 18)).toBe(PLANKEN);
  });

  it('AC236: the 0.4.0 save has the hut clear of every site and one change inside site oost', () => {
    const s = save040();
    const base = generateLegacyTerrain(LEGACY_SEED, 1);
    const oost = LEGACY_VILLAGE_SITES.find((x) => x.id === 'oost');
    expect(oost).toBeDefined();
    const inside = Array.from(s.world.diff).filter((e) => {
      const i = Math.floor(e / 256);
      const x = i % 64;
      const z = Math.floor(i / 64) % 64;
      return inRegion(siteRegion(oost as never), x, z);
    });
    expect(inside).toHaveLength(1);
    const i = Math.floor((inside[0] as number) / 256);
    expect(base[i]).not.toBe((inside[0] as number) % 256);
    for (const e of s.world.diff) {
      const i2 = Math.floor(e / 256);
      if (i2 === i) continue;
      const x = i2 % 64;
      const z = Math.floor(i2 / 64) % 64;
      for (const site of LEGACY_VILLAGE_SITES) expect(inRegion(siteRegion(site), x, z)).toBe(false);
    }
  });

  it('legacyDiff keeps the last change of a cell, drops cells equal to the base and sorts', () => {
    const base = generateLegacyTerrain(LEGACY_SEED, 2);
    const i = legacyCellIndex(5, 40, 5);
    const d = legacyDiff(base, [[6, 40, 5, PLANKEN], [5, 40, 5, PLANKEN], [5, 40, 5, AIR], [7, 40, 5, PLANKEN]]);
    expect(Array.from(d)).toEqual([legacyCellIndex(6, 40, 5) * 256 + PLANKEN, legacyCellIndex(7, 40, 5) * 256 + PLANKEN]);
    expect(base[i]).toBe(AIR);
  });

  it('AC235: dino, egg and chicken records have the 0.7.0 shape (the keys serializeDino and serializeEgg write)', () => {
    const s = save070();
    const sample = serializeDino({ ...createDino({ kind: 'compy', golden: false, x: 1, y: 2, z: 3 }, true), id: 'a', name: 'b' });
    const eggSample = serializeEgg({ ...createEgg('compy', false, 1, 2, 3, 0), id: 'e' });
    const dinos = s.dinos.dinos;
    expect(dinos).toHaveLength(8);
    expect(dinos.filter((d) => d.kind === 'kip')).toHaveLength(3);
    const real = dinos.filter((d) => d.kind !== 'kip');
    expect(real).toHaveLength(5);
    expect(real.filter((d) => d.mode === 'follow')).toHaveLength(2);
    expect(real.filter((d) => d.mode === 'stay')).toHaveLength(3);
    for (const d of dinos) {
      expect(Object.keys(d).sort()).toEqual(Object.keys(sample).sort());
      const back = deserializeDino(d, 0);
      expect(back).not.toBeNull();
      expect(serializeDino(back as never)).toEqual(d);
    }
    expect(s.dinos.eggs).toHaveLength(2);
    for (const e of s.dinos.eggs) {
      expect(Object.keys(e).sort()).toEqual(Object.keys(eggSample).sort());
      expect(serializeEgg(deserializeEgg(e, 0) as never)).toEqual(e);
    }
    expect(s.dinos.staySwitched).toBe(true);
  });

  it('AC235: the 2 knights are a stay and a guard knight with spots (the KnightRecord shape)', () => {
    const s = save070();
    expect(s.monsters.knights).toHaveLength(2);
    expect(s.monsters.knights.map((k) => k.mode)).toEqual(['stay', 'guard']);
    for (const k of s.monsters.knights) {
      const rec: KnightRecord = k;
      expect(Object.keys(rec).sort()).toEqual(['boughtFor', 'id', 'mode', 'spot']);
      expect(KNIGHT_MODES).toContain(rec.mode);
      expect(Object.keys(rec.spot as object).sort()).toEqual(['x', 'y', 'z']);
    }
  });

  it('AC235: player, settings, economy, village, bubble clock and hotbar have the 0.7.0 shapes', () => {
    const s = save070();
    expect(Object.keys(s.player).sort()).toEqual(Object.keys(defaultKv('player')).sort());
    expect(s.player.hotbar).toHaveLength(8);
    expect(s.player.hotbar.every((b) => isPlaceable(b))).toBe(true);
    for (const k of Object.keys(defaultKv('settings'))) expect(s.settings).toHaveProperty(k);
    expect(s.economy.points).toBeGreaterThan(0);
    expect(Object.keys(s.village).sort()).toEqual(Object.keys(defaultKv('village')).sort());
    expect(s.village.found.length).toBeGreaterThan(0);
    expect(Object.keys(s.monsters).sort()).toEqual(Object.keys(defaultKv('monsters')).sort());
    expect(s.monsters.bubbleClockMs).toBeGreaterThan(0);
    // Everything stands inside the legacy world.
    for (const p of [s.player, ...s.dinos.dinos, ...s.dinos.eggs]) {
      expect(p.x as number).toBeGreaterThan(0);
      expect(p.x as number).toBeLessThan(64);
      expect(p.z as number).toBeGreaterThan(0);
      expect(p.z as number).toBeLessThan(64);
    }
  });
});
