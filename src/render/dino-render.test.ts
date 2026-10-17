import { describe, expect, it } from 'vitest';
import { createDinoStore } from '../dinos/dino-store';
import { createDinoRender } from './dino-render';

function filled() {
  const store = createDinoStore();
  const e = store.addEgg('compy');
  e.egg.x = 3; e.egg.y = 5; e.egg.z = 4;
  const e2 = store.addEgg('triceratops', true);
  e2.egg.x = 8; e2.egg.y = 5; e2.egg.z = 8;
  const d = store.hatch(e2.id)!;
  return { store, d };
}

describe('dino render', () => {
  it('makes a node for every placed dino and egg, and skips unplaced ones', () => {
    const { store } = filled();
    store.addEgg('compy'); // not placed yet
    const r = createDinoRender(document);
    r.sync(store.dinos, store.eggs, 0.016);
    expect(r.count()).toEqual({ dinos: 1, eggs: 1 });
  });

  it('moves the node to the dino and grows a baby to full size', () => {
    const { store, d } = filled();
    const r = createDinoRender(document);
    r.sync(store.dinos, store.eggs, 0.016);
    const node = r.layer.children.find((c) => c.position.x === 8)!;
    expect(node.position.z).toBe(8);
    const model = node.children[0]!;
    expect(model.scale.x).toBeCloseTo(0.5);
    d.state.growth = 2;
    d.state.x = 9;
    d.state.heading = 1;
    r.sync(store.dinos, store.eggs, 0.016);
    expect(node.position.x).toBe(9);
    expect(node.rotation.y).toBe(1);
    expect(model.scale.x).toBeCloseTo(1);
  });

  it('removes the node of an egg that hatched', () => {
    const { store } = filled();
    const r = createDinoRender(document);
    r.sync(store.dinos, store.eggs, 0.016);
    store.hatch(store.eggs[0]!.id);
    r.sync(store.dinos, store.eggs, 0.016);
    expect(r.count()).toEqual({ dinos: 2, eggs: 0 });
  });

  it('clouds come and go, at most 10 at once', () => {
    const r = createDinoRender(document);
    for (let i = 0; i < 15; i++) r.burst(i % 2 ? 'hearts' : 'puff', 1, 5, 1);
    expect(r.layer.children).toHaveLength(10);
    r.sync([], [], 1);
    expect(r.layer.children).toHaveLength(0);
  });

  it('dispose empties the layer', () => {
    const { store } = filled();
    const r = createDinoRender(document);
    r.sync(store.dinos, store.eggs, 0.016);
    r.dispose();
    expect(r.layer.children).toHaveLength(0);
  });
});
