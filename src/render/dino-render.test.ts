import { describe, expect, it } from 'vitest';
import type { WorldDino, WorldEgg } from '../dinos/dino-store';
import { createDino } from '../dinos/dino-ai';
import { createEgg, GROW_SECONDS } from '../dinos/egg';
import { createDinoSceneSync } from './dino-render';

describe('dino-render (T42)', () => {
  it('syncs dinos and eggs into the scene group and updates positions and growth scale', () => {
    const sync = createDinoSceneSync();
    const egg: WorldEgg = {
      ...createEgg('compy', false, 10, 5, 12, 1),
      id: 'egg-1',
    };
    sync.sync([], [egg]);
    expect(sync.group.children).toHaveLength(1);
    expect(sync.group.children[0]?.position.x).toBe(10);

    const baby: WorldDino = {
      ...createDino({ kind: 'triceratops', golden: true, x: 14, y: 5, z: 16 }, false),
      id: 'dino-1',
      name: 'Trix',
    };
    sync.sync([baby], []);
    expect(sync.group.children).toHaveLength(1);
    expect(sync.group.children[0]?.position.x).toBe(14);

    baby.growth = GROW_SECONDS;
    baby.x = 15;
    sync.sync([baby], []);
    expect(sync.group.children[0]?.position.x).toBe(15);

    sync.dispose();
    expect(sync.group.children).toHaveLength(0);
  });
});
