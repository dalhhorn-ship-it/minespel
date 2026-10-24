import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../core/rng';
import { boxCollides } from '../dinos/dino-ai';
import { DANCE_SECONDS, VILLAGER_BOX, VILLAGER_LOOKS } from '../villagers/villager';
import { AIR, STEEN, RARE_BLOCKS } from '../world/blocks';
import { VILLAGE_SITES } from '../world/village-layout';
import { World } from '../world/world';
import { createVillagerSystem, STEP_DISTANCE } from './villager-system';

const dist = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);

function setup(opts: { world?: World; player?: { x: number; y: number; z: number }; stillMode?: boolean } = {}) {
  const world = opts.world ?? new World();
  const player = { player: opts.player ?? { x: 30, y: 12, z: 20 } };
  const syncVillagers = vi.fn();
  const sys = createVillagerSystem({ world, player, renderer: { syncVillagers }, rng: createRng(7), stillMode: opts.stillMode });
  return { world, player, sys, syncVillagers };
}

describe('villager system (V11c)', () => {
  it('AC180: 8 villagers live in the villages, 3, 3 and 2, each with its own shirt colour', () => {
    const { sys } = setup();
    const list = sys.villagers();
    expect(list).toHaveLength(8);
    for (const site of VILLAGE_SITES) {
      expect(list.filter((v) => v.site === site.id)).toHaveLength(site.homes.length);
    }
    expect(VILLAGE_SITES.map((s) => s.homes.length)).toEqual([3, 3, 2]);
    expect(new Set(list.map((v) => v.look.shirt)).size).toBe(8);
    expect(new Set(list.map((v) => `${v.look.shirt}:${v.look.style}`)).size).toBe(8);
    expect(VILLAGER_LOOKS).toHaveLength(8);
    expect(list.map((v) => v.gives)).toEqual([...RARE_BLOCKS]);
  });

  it('AC180: 2 minutes on a fake clock stay within 3 blocks of home, never inside a block, player and blocks untouched', () => {
    const { world, player, sys } = setup({ player: { x: 36, y: 12, z: 22 } });
    const before = world.diff().length;
    const spot = { ...player.player };
    const rng = createRng(3);
    const moved = new Set<string>();
    for (let i = 0; i < 120 * 30; i++) {
      // Frames vary a little, like a real iPad.
      sys.step(1 / 30 + rng.next() * 0.01);
      for (const v of sys.villagers()) {
        expect(dist(v, v.home)).toBeLessThanOrEqual(3);
        expect(boxCollides(world, v.x, v.y, v.z, VILLAGER_BOX.side, VILLAGER_BOX.height)).toBe(false);
        if (dist(v, v.home) > 0.5) moved.add(v.id);
      }
    }
    expect(moved.size).toBeGreaterThan(0);
    expect(player.player).toEqual(spot);
    expect(world.diff().length).toBe(before);
  });

  it('AC180: villagers start at home on the pad of their house site', () => {
    const { sys } = setup();
    const homes = VILLAGE_SITES.flatMap((s) => s.homes);
    sys.villagers().forEach((v, i) => {
      expect(v.home).toEqual(homes[i]);
      expect([v.x, v.y, v.z]).toEqual([homes[i]?.x, homes[i]?.y, homes[i]?.z]);
    });
  });

  it('AC180: no block is placed inside a villager (isOccupied)', () => {
    const { sys } = setup();
    const v = sys.villagers()[0]!;
    expect(sys.isOccupied([v.x - 0.5, v.y, v.z - 0.5, v.x + 0.5, v.y + 1, v.z + 0.5])).toBe(true);
    expect(sys.isOccupied([v.x - 0.5, v.y + 1, v.z - 0.5, v.x + 0.5, v.y + 2, v.z + 0.5])).toBe(true);
    expect(sys.isOccupied([v.x + 5, v.y, v.z + 5, v.x + 6, v.y + 1, v.z + 6])).toBe(false);
    // A box that only touches the villager's side is not inside it.
    expect(sys.isOccupied([v.x + 0.3, v.y, v.z - 0.5, v.x + 1.3, v.y + 1, v.z + 0.5])).toBe(false);
  });

  it('AC180: after the app is closed and reopened every villager starts at its home spot', () => {
    const first = setup({ player: { x: 36, y: 12, z: 22 } });
    for (let i = 0; i < 30 * 40; i++) first.sys.step(1 / 30);
    expect(first.sys.villagers().some((v) => dist(v, v.home) > 0.3)).toBe(true);
    const again = setup({ world: first.world });
    for (const v of again.sys.villagers()) expect([v.x, v.z]).toEqual([v.home.x, v.home.z]);
  });

  it('AC180: a site without houses has its villagers on the ground there', () => {
    const world = new World();
    const west = VILLAGE_SITES.find((s) => s.id === 'west')!;
    // Flatten the whole site to a ground 3 blocks lower than the village pad, as an untouched old save could be.
    const ground = west.padY - 3;
    for (let x = west.x0 - 2; x <= west.x1 + 2; x++) {
      for (let z = west.z0 - 2; z <= west.z1 + 2; z++) {
        for (let y = 1; y < 30; y++) world.set(x, y, z, y <= ground ? STEEN : AIR);
      }
    }
    const { sys } = setup({ world, player: { x: 12, y: 12, z: 20 } });
    const mine = sys.villagers().filter((v) => v.site === 'west');
    expect(mine).toHaveLength(2);
    for (const v of mine) {
      expect(v.y).toBe(ground + 1);
      expect(boxCollides(world, v.x, v.y, v.z, VILLAGER_BOX.side, VILLAGER_BOX.height)).toBe(false);
      expect(boxCollides(world, v.x, v.y - 0.05, v.z, VILLAGER_BOX.side, VILLAGER_BOX.height)).toBe(true);
    }
  });

  it('AC180: a villager is not stepped when the player is farther than 24 blocks', () => {
    const far = setup({ player: { x: 16 + STEP_DISTANCE + 8, y: 12, z: 5 } });
    const start = far.sys.villagers().map((v) => [v.x, v.z]);
    for (let i = 0; i < 30 * 20; i++) far.sys.step(1 / 30);
    // villager 0 (noord) is 32 blocks from the player and stands still
    expect(far.sys.villagers()[0] && [far.sys.villagers()[0]!.x, far.sys.villagers()[0]!.z]).toEqual(start[0]);
    const near = setup({ player: { x: 18, y: 12, z: 20 } });
    for (let i = 0; i < 30 * 20; i++) near.sys.step(1 / 30);
    expect(dist(near.sys.villagers()[0]!, near.sys.villagers()[0]!.home)).toBeGreaterThan(0.05);
  });

  it('nearest finds the closest villager within the radius', () => {
    const { sys } = setup();
    const v = sys.villagers()[0]!;
    expect(sys.nearest({ x: v.x - 2, y: v.y, z: v.z })?.id).toBe(v.id);
    expect(sys.nearest({ x: v.x - 4, y: v.y, z: v.z })).toBeNull();
    expect(sys.nearest({ x: v.x - 4, y: v.y, z: v.z }, 6)?.id).toBe(v.id);
    expect(sys.nearest({ x: v.x, y: v.y + 10, z: v.z })).toBeNull();
  });

  it('villagers turn to a close player and wave', () => {
    const { sys } = setup({ player: { x: 18.5, y: 10, z: 6.5 } });
    for (let i = 0; i < 90; i++) sys.step(1 / 30);
    const v = sys.villagers()[0]!;
    expect(v.waving).toBe(true);
    if (!v.goal) {
      expect(v.heading).toBeCloseTo(Math.atan2(18.5 - v.x, 6.5 - v.z), 1);
    }
  });

  it('dance runs about 2 seconds, keeps the villager in place and ends by itself', () => {
    const { sys, syncVillagers } = setup({ player: { x: 36, y: 12, z: 22 } });
    expect(sys.dance('nope')).toBe(false);
    const v = sys.villagers()[2]!;
    const home = { x: v.x, z: v.z };
    expect(sys.dance(v.id)).toBe(true);
    expect(v.danceLeft).toBe(DANCE_SECONDS);
    expect(syncVillagers).toHaveBeenCalled();
    for (let i = 0; i < 30; i++) {
      sys.step(1 / 30);
      expect(v.danceLeft).toBeGreaterThan(0);
      expect(dist(v, home)).toBeLessThan(0.01);
    }
    for (let i = 0; i < 40; i++) sys.step(1 / 30);
    expect(v.danceLeft).toBe(0);
  });

  it('stillMode: villagers stand at home and only turn to the player', () => {
    const { sys } = setup({ player: { x: 18.5, y: 10, z: 4.5 }, stillMode: true });
    const v = sys.villagers()[0]!;
    for (let i = 0; i < 30 * 30; i++) sys.step(1 / 30);
    expect([v.x, v.z]).toEqual([v.home.x, v.home.z]);
    expect(v.waving).toBe(false);
    expect(v.heading).toBeCloseTo(Math.atan2(18.5 - v.x, 4.5 - v.z), 1);
    expect(sys.stillMode()).toBe(true);
  });

  it('setStillMode(true) sends wandering villagers back home', () => {
    const { sys } = setup({ player: { x: 36, y: 12, z: 22 } });
    for (let i = 0; i < 30 * 40; i++) sys.step(1 / 30);
    sys.setStillMode(true);
    for (const v of sys.villagers()) expect([v.x, v.z]).toEqual([v.home.x, v.home.z]);
  });

  it('survives bad dt', () => {
    const { sys } = setup();
    sys.step(NaN);
    sys.step(-1);
    sys.step(0);
    sys.step(10);
    for (const v of sys.villagers()) expect(Number.isFinite(v.x + v.y + v.z)).toBe(true);
  });
});
