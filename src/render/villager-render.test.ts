import { describe, expect, it } from 'vitest';
import { createVillagers, DANCE_SECONDS } from '../villagers/villager';
import { createVillagerSceneSync, dancePose } from './villager-render';

describe('villager-render (V11c)', () => {
  it('syncs villagers into the group, moves them and removes the ones that left', () => {
    const sync = createVillagerSceneSync();
    const list = createVillagers();
    sync.sync(list);
    expect(sync.group.children).toHaveLength(8);
    list[0]!.x = 21;
    list[0]!.heading = 1;
    sync.sync(list);
    expect(sync.group.children).toHaveLength(8);
    expect(sync.group.children[0]?.position.x).toBe(21);
    expect(sync.group.children[0]?.rotation.y).toBe(1);
    sync.sync(list.slice(0, 5));
    expect(sync.group.children).toHaveLength(5);
    sync.clear();
    expect(sync.group.children).toHaveLength(0);
    sync.dispose();
  });

  it('the dance hops, spins twice, tilts and raises the arms, on the model only', () => {
    const sync = createVillagerSceneSync();
    const list = createVillagers();
    const v = list[0]!;
    v.danceLeft = DANCE_SECONDS - 1 / 3;
    sync.sync(list);
    const root = sync.group.children[0]!;
    const body = root.children[0]!;
    expect(body.position.y).toBeGreaterThan(0.3);
    expect(root.position.y).toBe(v.y);
    expect(dancePose(DANCE_SECONDS).spin).toBeCloseTo(Math.PI * 4, 5);
    expect(dancePose(0.5).arm).toBeGreaterThan(2);
    v.danceLeft = 0;
    sync.sync(list);
    expect(body.position.y).toBe(0);
    expect(body.rotation.z).toBe(0);
  });

  it('a close player gets a wave', () => {
    const sync = createVillagerSceneSync();
    const list = createVillagers();
    list[0]!.waving = true;
    list[0]!.clock = 0.2;
    sync.sync(list);
    const arm = sync.group.children[0]!.children[0]!.children.find((c) => c.position.x > 0.3);
    expect(arm?.rotation.z).toBeGreaterThan(1.5);
  });
});
