import { describe, expect, it } from 'vitest';
import { get, openDb } from './db';
import { readLavakip, updateLavakip } from './lavakip-store';
import { createRecords } from './records';

let n = 0;
const fresh = () => openDb({ name: `lavakip-db-${n++}` });

describe('lavakip store (decision 144)', () => {
  it('AC318: no record reads as the default, and a bad value too', async () => {
    const db = await fresh();
    expect(await createRecords(db).get('lavakip')).toEqual({ bought: false, spot: null, carried: 0 });
    for (const bad of [undefined, null, 7, 'x', [1]]) expect(readLavakip(bad)).toEqual({ bought: false, spot: null, carried: 0 });
    expect(readLavakip({ bought: true, spot: { x: 1, y: 2, z: 'q' }, carried: 99 })).toEqual({ bought: true, spot: null, carried: 10 });
    db.close();
  });
  it('AC318: two writers in a row both land, one transaction each', async () => {
    const db = await fresh();
    await Promise.all([
      updateLavakip(db, (r) => ({ ...r, bought: true, spot: { x: 5, y: 6, z: 7 } })),
      updateLavakip(db, (r) => ({ ...r, carried: r.carried + 3 })),
    ]);
    expect(await get(db, 'kv', 'lavakip')).toEqual({ bought: true, spot: { x: 5, y: 6, z: 7 }, carried: 3 });
    db.close();
  });
  it('AC318: a throw in change leaves the record as it was', async () => {
    const db = await fresh();
    await updateLavakip(db, (r) => ({ ...r, carried: 2 }));
    await expect(updateLavakip(db, () => { throw new Error('no'); })).rejects.toThrow('no');
    expect(await get(db, 'kv', 'lavakip')).toEqual({ bought: false, spot: null, carried: 2 });
    db.close();
  });
});
