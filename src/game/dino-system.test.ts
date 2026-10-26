// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createDinoStore } from '../dinos/dino-store';
import { EGG_HATCH_SECONDS } from '../dinos/egg';
import { createNullRenderer } from '../render/renderer';
import { START_SPOT } from '../world/terrain';
import { World } from '../world/world';
import { createDinoSystem, isBoxOccupiedByDinoOrEgg, pickDinoAtAim } from './dino-system';
import { createPlayerController } from './player-controller';

describe('dino-system (T42)', () => {
  function setup() {
    const world = new World();
    const player = createPlayerController({
      world,
      stick: { vector: () => ({ x: 0, y: 0 }) },
      look: { consumeDelta: () => ({ dx: 0, dy: 0 }) },
    });
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    const renderer = createNullRenderer({ canvas });
    const store = createDinoStore({
      world,
      getPlayerSpot: () => ({
        x: player.player.x,
        y: player.player.y,
        z: player.player.z,
      }),
    });
    const tapped: string[] = [];
    const system = createDinoSystem({
      world,
      player,
      store,
      renderer,
      container,
      viewport: () => ({ width: 1024, height: 768 }),
      onDinoTapped: (d) => tapped.push(d.id),
    });
    return { world, player, store, system, tapped, container };
  }

  it('hatches an egg after EGG_HATCH_SECONDS of play time (AC150)', async () => {
    const { store, system } = setup();
    await store.addEgg('compy', false);
    expect(store.eggs()).toHaveLength(1);
    expect(store.dinos()).toHaveLength(0);

    system.step(2);
    expect(store.eggs()).toHaveLength(1);
    expect(store.dinos()).toHaveLength(0);

    system.step(EGG_HATCH_SECONDS - 1.5);
    expect(store.eggs()).toHaveLength(0);
    expect(store.dinos()).toHaveLength(1);
    expect(store.dinos()[0]?.kind).toBe('compy');
    system.dispose();
  });

  it('blocks placing a block on a cell occupied by a dino or egg (AC6)', async () => {
    const { store, system } = setup();
    const egg = await store.addEgg('triceratops', false);
    const cellX = Math.floor(egg.x);
    const cellY = Math.floor(egg.y);
    const cellZ = Math.floor(egg.z);
    expect(
      system.isOccupied([cellX, cellY, cellZ, cellX + 1, cellY + 1, cellZ + 1]),
    ).toBe(true);
    expect(
      isBoxOccupiedByDinoOrEgg([0, 25, 0, 1, 26, 1], store.dinos(), store.eggs()),
    ).toBe(false);
    system.dispose();
  });

  it('hits a dino in front of a block when tapped (AC104) and brings follow dinos on teleport (AC106)', async () => {
    const { world, player, store, system } = setup();
    const egg = await store.addEgg('triceratops', false);
    const dino = store.hatchEgg(egg.id)!;
    // Place dino directly in front of player (yaw 0 looks along +z)
    dino.x = player.player.x;
    dino.y = player.player.y;
    dino.z = player.player.z + 2;

    const hit = pickDinoAtAim(world, store.dinos(), {
      ox: player.player.x,
      oy: player.player.y + 0.5,
      oz: player.player.z,
      dx: 0,
      dy: 0,
      dz: 1,
    });
    expect(hit?.id).toBe(dino.id);

    // The eye inside the dino: that dino never takes the tap, so Hakken and Bouwen keep working (decision 112).
    dino.z = player.player.z;
    expect(
      pickDinoAtAim(world, store.dinos(), {
        ox: player.player.x, oy: player.player.y + 0.5, oz: player.player.z, dx: 0, dy: 0, dz: 1,
      }),
    ).toBeNull();

    // Move dino far away, then teleport player home -> follow dino pops next to START_SPOT
    dino.x = 10;
    dino.z = 10;
    dino.mode = 'follow';
    system.onPlayerTeleported({ x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z });
    expect(Math.hypot(dino.x - START_SPOT.x, dino.z - START_SPOT.z)).toBeLessThan(3.5);
    system.dispose();
  });
});
