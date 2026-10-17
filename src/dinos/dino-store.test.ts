import { afterEach, describe, expect, it } from 'vitest';
import { addEgg, createDinoStore, getActiveDinoStore, setActiveDinoStore, cleanDinoName } from './dino-store';

afterEach(() => setActiveDinoStore(null));

describe('dino store', () => {
  it('starts empty (AC12)', () => {
    const s = createDinoStore();
    expect(s.dinos).toHaveLength(0);
    expect(s.eggs).toHaveLength(0);
    expect(s.toRecord()).toEqual({ dinos: [], eggs: [] });
  });

  it('addEgg makes an unplaced egg and tells the listeners', () => {
    const s = createDinoStore();
    let n = 0;
    s.subscribe(() => n++);
    const e = s.addEgg('compy', true);
    expect(e.egg.golden).toBe(true);
    expect(Number.isNaN(e.egg.x)).toBe(true);
    expect(n).toBe(1);
  });

  it('hatch swaps the egg for a baby dino of the same kind and spot', () => {
    const s = createDinoStore();
    const e = s.addEgg('stegosaurus');
    e.egg.x = 5; e.egg.y = 6; e.egg.z = 7;
    const d = s.hatch(e.id)!;
    expect(s.eggs).toHaveLength(0);
    expect(s.dinos).toEqual([d]);
    expect(d.state).toMatchObject({ kind: 'stegosaurus', x: 5, y: 6, z: 7, growth: 0, mode: 'follow' });
    expect(s.hatch(e.id)).toBeNull();
  });

  it('names are cut to 12 characters', () => {
    expect(cleanDinoName('  Dino   Dikkie de Grote ')).toBe('Dino Dikkie ');
    expect(cleanDinoName(5)).toBe('');
    const s = createDinoStore();
    const e = s.addEgg('compy');
    e.egg.x = 1; e.egg.y = 5; e.egg.z = 1;
    const d = s.hatch(e.id)!;
    s.rename(d.id, 'Superlangenaam123');
    expect(d.name).toHaveLength(12);
  });

  it('saves and loads dinos and eggs, with names and modes (AC18)', () => {
    const a = createDinoStore();
    const egg = a.addEgg('triceratops');
    egg.egg.x = 3; egg.egg.y = 5; egg.egg.z = 4; egg.egg.playSeconds = 2;
    const e2 = a.addEgg('compy', true);
    e2.egg.x = 9; e2.egg.y = 5; e2.egg.z = 9;
    const d = a.hatch(e2.id)!;
    a.rename(d.id, 'Rex');
    a.setMode(d.id, 'stay');
    d.state.growth = 5;
    const b = createDinoStore();
    b.load(JSON.parse(JSON.stringify(a.toRecord())));
    expect(b.eggs[0]!.egg).toMatchObject({ kind: 'triceratops', x: 3, playSeconds: 2 });
    expect(b.dinos[0]).toMatchObject({ name: 'Rex' });
    expect(b.dinos[0]!.state).toMatchObject({ kind: 'compy', golden: true, mode: 'stay', x: 9 });
    expect(b.dinos[0]!.state.growth).toBe(2);
  });

  it('a bad record is fixed, not thrown on, and unplaced things stay for the system to place', () => {
    const s = createDinoStore();
    s.load({
      dinos: [{ kind: 'nope' }, null, 5, { kind: 'compy', x: 'a', y: 1, z: 1, name: 42, mode: 'dance' }],
      eggs: [{ kind: 'brachiosaurus', x: 9999, y: 5, z: 3, playSeconds: -4 }, 'x'],
    });
    expect(s.dinos).toHaveLength(1);
    expect(s.dinos[0]!.name).toBe('');
    expect(s.dinos[0]!.state.mode).toBe('follow');
    expect(Number.isNaN(s.dinos[0]!.state.x)).toBe(true);
    expect(s.eggs).toHaveLength(1);
    expect(s.eggs[0]!.egg.playSeconds).toBe(0);
    expect(Number.isNaN(s.eggs[0]!.egg.x)).toBe(true);
    s.load(undefined);
    expect(s.dinos).toHaveLength(0);
  });

  it('ids stay unique after a load and a hatch', () => {
    const s = createDinoStore();
    s.load({ dinos: [{ kind: 'compy', x: 1, y: 5, z: 1 }], eggs: [{ kind: 'compy', x: 2, y: 5, z: 2 }] });
    const e = s.eggs[0]!;
    const d = s.hatch(e.id)!;
    expect(new Set([s.dinos[0]!.id, d.id]).size).toBe(2);
  });

  it('addEgg export uses the active store, or waits for one', () => {
    addEgg('compy', false);
    const s = createDinoStore();
    expect(s.eggs).toHaveLength(0);
    setActiveDinoStore(s);
    expect(getActiveDinoStore()).toBe(s);
    expect(s.eggs).toHaveLength(1);
    addEgg('brachiosaurus', true);
    expect(s.eggs.map((e) => e.egg.kind)).toEqual(['compy', 'brachiosaurus']);
    expect(s.eggs[1]!.egg.golden).toBe(true);
    addEgg('bogus' as never);
    expect(s.eggs).toHaveLength(2);
  });

  it('only clear() removes things', () => {
    const s = createDinoStore();
    s.addEgg('compy');
    s.rename(999, 'x');
    s.setMode(999, 'stay');
    expect(s.eggs).toHaveLength(1);
    s.clear();
    expect(s.eggs).toHaveLength(0);
  });
});
