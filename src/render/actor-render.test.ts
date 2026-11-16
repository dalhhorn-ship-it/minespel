import { describe, expect, it } from 'vitest';
import { createActorSceneSync, type ActorView } from './actor-render';

const knight = (id: string, x = 0): ActorView => ({ id, model: 'knight', x, y: 1, z: 2, heading: 0.5 });

describe('actor scene sync', () => {
  it('builds one model per id, keeps it, moves it and turns it', () => {
    const sync = createActorSceneSync();
    sync.sync('knights', [knight('a', 3)]);
    const root = sync.group.children[0]!.children[0]!;
    expect([root.position.x, root.position.y, root.position.z, root.rotation.y]).toEqual([3, 1, 2, 0.5]);
    sync.sync('knights', [knight('a', 4)]);
    expect(sync.group.children[0]!.children[0]).toBe(root);
    expect(root.position.x).toBe(4);
  });
  it('removes a model when its id is gone, and keeps the groups apart', () => {
    const sync = createActorSceneSync();
    sync.sync('knights', [knight('a'), knight('b')]);
    expect(sync.group.children[0]!.children).toHaveLength(2);
    sync.sync('knights', [knight('b')]);
    expect(sync.group.children[0]!.children).toHaveLength(1);
    sync.sync('monsters', []);
    expect(sync.group.children[0]!.children).toHaveLength(1);
  });
  it('V18a: Klodder and the bubble are drawn by their own models and removed when gone', () => {
    const sync = createActorSceneSync();
    sync.sync('monsters', [
      { id: 'klodder', model: 'klodder', x: 0, y: 0, z: 0, heading: 0 },
      { id: 'bubble', model: 'bubble', x: 1, y: 2, z: 3, heading: 0, scale: 2 },
    ]);
    expect(sync.group.children[0]!.children).toHaveLength(2);
    sync.sync('monsters', []);
    expect(sync.group.children[0]!.children).toHaveLength(0);
  });
  it('dispose empties everything', () => {
    const sync = createActorSceneSync();
    sync.sync('knights', [knight('a')]);
    sync.dispose();
    expect(sync.group.children).toHaveLength(0);
  });
  it('AC264: a knight is built again when his look changes, and not when it stays', () => {
    const sync = createActorSceneSync();
    sync.sync('knights', [{ ...knight('a'), look: 'pony' }]);
    const first = sync.group.children[0]!.children[0]!;
    sync.sync('knights', [{ ...knight('a'), look: 'pony' }]);
    expect(sync.group.children[0]!.children[0]).toBe(first);
    sync.sync('knights', [{ ...knight('a'), look: 'pony+riddercape' }]);
    expect(sync.group.children[0]!.children).toHaveLength(1);
    expect(sync.group.children[0]!.children[0]).not.toBe(first);
    sync.sync('knights', [{ ...knight('a'), look: '' }]);
    expect(sync.group.children[0]!.children).toHaveLength(1);
  });
  it('decision 144: the props group draws the lavakip-bar model and removes it when gone', () => {
    const sync = createActorSceneSync();
    sync.sync('props', [{ id: 'bar', model: 'lavakip-bar', x: 5, y: 6, z: 7, heading: 0 }]);
    const group = sync.group.children[0]!;
    expect(group.children).toHaveLength(1);
    const meshes: unknown[] = [];
    group.children[0]!.traverse((o) => { if ((o as { isMesh?: boolean }).isMesh) meshes.push(o); });
    expect(meshes.length).toBeGreaterThanOrEqual(1);
    expect(meshes.length).toBeLessThanOrEqual(4);
    expect(group.children[0]!.position.x).toBe(5);
    sync.sync('props', []);
    expect(group.children).toHaveLength(0);
  });
});
