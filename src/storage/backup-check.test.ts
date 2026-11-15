import { describe, expect, it } from 'vitest';
import { backupV060, backupV070 } from '../../tests/fixtures/move/old-saves';
import { MSG_BAD_VALUES, MSG_NEWER, MSG_NOT_JSON, MSG_TOO_BIG, MSG_WRONG_APP, checkBackup } from './backup-check';

const FIXTURES = import.meta.glob('../../tests/fixtures/backups/*', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const fixture = (name: string): string => FIXTURES[`../../tests/fixtures/backups/${name}`] ?? '';
const load = fixture;

describe('checkBackup', () => {
  it('AC131: an older shape (0.4.0 world, malus rows, no fluit, no pointsMode) passes and is kept as it is', () => {
    const r = checkBackup(load('v050-old-shapes.json'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.appVersion).toBe('0.4.0');
    expect(r.data.createdAt).toBe('2026-10-30T09:15:00.000Z');
    expect((r.data.kv.world as { terrainVersion?: number }).terrainVersion).toBeUndefined();
    expect((r.data.kv.world as { diff: Uint32Array }).diff).toBeInstanceOf(Uint32Array);
    expect((r.data.kv.economy as { fluit?: boolean }).fluit).toBeUndefined();
    expect(r.data.stores.ledger.map((l) => l.kind)).toEqual(['malus', 'break']);
  });

  it('AC130: a file that is cut off or not JSON gives a friendly message', () => {
    expect(checkBackup(load('bad-cut-off.txt'))).toEqual({ ok: false, message: MSG_NOT_JSON });
    expect(checkBackup(load('bad-not-json.txt'))).toEqual({ ok: false, message: MSG_NOT_JSON });
    expect(checkBackup('')).toEqual({ ok: false, message: MSG_NOT_JSON });
  });

  it('AC130: wrong JSON or a wrong app name is refused', () => {
    expect(checkBackup('[1,2,3]')).toEqual({ ok: false, message: MSG_WRONG_APP });
    expect(checkBackup('{"hello":1}')).toEqual({ ok: false, message: MSG_WRONG_APP });
    expect(checkBackup(load('bad-wrong-app.json'))).toEqual({ ok: false, message: MSG_WRONG_APP });
  });

  it('AC130: a newer format or a newer save version says "nieuwere versie"', () => {
    expect(checkBackup(load('bad-newer-format.json'))).toEqual({ ok: false, message: MSG_NEWER });
    expect(checkBackup(load('bad-newer-schema.json'))).toEqual({ ok: false, message: MSG_NEWER });
    expect(MSG_NEWER).toContain('Dit bestand is van een nieuwere versie');
  });

  it('AC195: a file over 20 MB is refused', () => {
    expect(checkBackup('x'.repeat(20 * 1024 * 1024 + 1))).toEqual({ ok: false, message: MSG_TOO_BIG });
    // Multi byte characters count as bytes, not as characters.
    expect(checkBackup('é'.repeat(11 * 1024 * 1024))).toEqual({ ok: false, message: MSG_TOO_BIG });
  });

  for (const name of [
    'bad-name-html.json', 'bad-name-link.json', 'bad-name-long.json', 'bad-points-negative.json',
    'bad-too-many-dinos.json', 'bad-too-many-chickens.json',
  ]) {
    it(`AC195: ${name} is refused with a friendly message`, () => {
      expect(checkBackup(load(name))).toEqual({ ok: false, message: MSG_BAD_VALUES });
    });
  }

  it('AC195: the limits are exact (25 shop dinos and 10 chickens pass, 12 characters pass)', () => {
    const o = JSON.parse(load('v050-old-shapes.json'));
    o.kv.dinos.dinos = [
      ...Array.from({ length: 25 }, (_, i) => ({ kind: 'rex', name: `Dino${String.fromCharCode(97 + i)}` })),
      ...Array.from({ length: 10 }, () => ({ kind: 'kip', name: 'Kip' })),
      { kind: 'rex', golden: true, name: 'Abcdefghijkl' },
    ];
    expect(checkBackup(JSON.stringify(o)).ok).toBe(true);
  });

  it('AC195: settings, rare blocks, world diff, log ids and unknown names are checked', () => {
    interface Loose {
      createdAt?: string;
      kv: { settings: { volume: unknown }; economy: { points: unknown }; world: { diff: unknown } } & Record<string, unknown>;
      stores: { ledger: unknown[]; progress: unknown[] } & Record<string, unknown>;
    }
    const mutate = (f: (o: Loose) => unknown) => {
      const o = JSON.parse(load('v050-old-shapes.json')) as Loose;
      f(o);
      return checkBackup(JSON.stringify(o)).ok;
    };
    expect(mutate(() => {})).toBe(true);
    expect(mutate((o) => (o.kv.settings.volume = 1.5))).toBe(false);
    expect(mutate((o) => (o.kv.settings.volume = -0.1))).toBe(false);
    expect(mutate((o) => (o.kv.economy.points = 1.5))).toBe(false);
    expect(mutate((o) => (o.kv.village = { found: [34, 41], cooldownMs: 5, lastVillager: null }))).toBe(true);
    expect(mutate((o) => (o.kv.village = { found: [33], cooldownMs: 5, lastVillager: null }))).toBe(false);
    expect(mutate((o) => (o.kv.village = { found: [42], cooldownMs: 5, lastVillager: null }))).toBe(false);
    expect(mutate((o) => (o.kv.world.diff = { $u32: '!!!' }))).toBe(false);
    expect(mutate((o) => (o.kv.world.diff = { $u32: 'AAAA' }))).toBe(false); // 3 bytes
    expect(mutate((o) => (o.kv.world.diff = [1, 2]))).toBe(false);
    expect(mutate((o) => ((o.stores.ledger[0] as { id: unknown }).id = 'a'))).toBe(false);
    expect(mutate((o) => (o.stores.ledger[0] = 5))).toBe(false);
    expect(mutate((o) => (o.kv.gate = { salt: 'x', pinHash: 'y' }))).toBe(false);
    expect(mutate((o) => (o.kv.worldV1 = { diff: { $u32: '' } }))).toBe(false);
    expect(mutate((o) => (o.stores.kv = []))).toBe(false);
    expect(mutate((o) => (o.stores.progress = [['a']]))).toBe(false);
    expect(mutate((o) => delete o.createdAt)).toBe(false);
  });

  it('AC130: a diff entry outside the world is refused (none dropped)', () => {
    const o = JSON.parse(load('v050-old-shapes.json'));
    // 0xFFFFFFFF as a little endian u32: cell index far outside the world.
    o.kv.world.diff = { $u32: '/////w==' };
    expect(checkBackup(JSON.stringify(o)).ok).toBe(false);
  });

  it('never throws, whatever comes in', () => {
    for (const t of ['null', '1', '"x"', '{"app":"dino-blokwereld","format":1}', '{"app":"dino-blokwereld","format":1,"schemaVersion":1,"createdAt":"2026-01-01","appVersion":"","kv":{"world":{"diff":{"$u32":5}}},"stores":{}}']) {
      expect(checkBackup(t).ok).toBe(false);
    }
    expect(checkBackup(undefined as unknown as string).ok).toBe(false);
  });

  describe('AC209 AC226: the monsters record and the three switches', () => {
    const base = JSON.parse(load('v070-monsters.json')) as { kv: Record<string, Record<string, unknown>> };
    const withKv = (name: string, value: unknown): string => JSON.stringify({ ...base, kv: { ...base.kv, [name]: value } });
    const knight = (id: string, mode = 'follow', spot: unknown = null) => ({ id, mode, spot, boughtFor: 30 });
    const monsters = (over: Record<string, unknown>) => withKv('monsters', { knights: [], bubbleClockMs: 0, hintShown: false, ...over });
    const refused = { ok: false, message: MSG_BAD_VALUES };

    it('a file made with 0.7.0 passes and keeps both knights', () => {
      const r = checkBackup(load('v070-monsters.json'));
      expect(r.ok).toBe(true);
      if (r.ok) expect((r.data.kv.monsters as { knights: unknown[] }).knights).toHaveLength(2);
    });
    it('a file from 0.6.0 without monsters passes', () => {
      const r = checkBackup(load('v060-no-monsters.json'));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.data.kv.monsters).toBeUndefined();
    });
    it('4 knights are refused, 3 pass', () => {
      expect(checkBackup(monsters({ knights: [knight('a'), knight('b'), knight('c')] })).ok).toBe(true);
      expect(checkBackup(monsters({ knights: [knight('a'), knight('b'), knight('c'), knight('d')] }))).toEqual(refused);
    });
    it('an unknown mode is refused', () => {
      expect(checkBackup(monsters({ knights: [knight('a', 'vlieg')] }))).toEqual(refused);
    });
    it('an id that is not a string, is empty or is over 40 characters is refused', () => {
      expect(checkBackup(monsters({ knights: [knight('x'.repeat(41))] }))).toEqual(refused);
      expect(checkBackup(monsters({ knights: [knight('x'.repeat(40))] })).ok).toBe(true);
      expect(checkBackup(monsters({ knights: [{ ...knight('a'), id: 5 }] }))).toEqual(refused);
      expect(checkBackup(monsters({ knights: [knight('')] }))).toEqual(refused);
    });
    it('a spot outside the world is refused, a spot inside and null pass', () => {
      expect(checkBackup(monsters({ knights: [knight('a', 'stay', { x: 10, y: 12, z: 10 })] })).ok).toBe(true);
      expect(checkBackup(monsters({ knights: [knight('a', 'stay', { x: 200, y: 12, z: 10 })] }))).toEqual(refused);
      expect(checkBackup(monsters({ knights: [knight('a', 'stay', { x: -1, y: 12, z: 10 })] }))).toEqual(refused);
      expect(checkBackup(monsters({ knights: [knight('a', 'stay', { x: 1, y: 'hoog', z: 10 })] }))).toEqual(refused);
    });
    it('a clock below 0 or over 600 000 is refused, 0 and 600 000 pass', () => {
      expect(checkBackup(monsters({ bubbleClockMs: -1 }))).toEqual(refused);
      expect(checkBackup(monsters({ bubbleClockMs: 600_001 }))).toEqual(refused);
      expect(checkBackup(monsters({ bubbleClockMs: 0 })).ok).toBe(true);
      expect(checkBackup(monsters({ bubbleClockMs: 600_000 })).ok).toBe(true);
    });
    it('a hint flag that is not a boolean is refused', () => {
      expect(checkBackup(monsters({ hintShown: 'ja' }))).toEqual(refused);
    });
    it('two knights with one id are refused', () => {
      expect(checkBackup(monsters({ knights: [knight('a'), knight('a')] }))).toEqual(refused);
    });
    it('the three switches must be booleans when present', () => {
      for (const key of ['monstersEnabled', 'knightsEnabled', 'bubbleEnabled']) {
        expect(checkBackup(withKv('settings', { ...base.kv.settings, [key]: 'aan' }))).toEqual(refused);
        expect(checkBackup(withKv('settings', { ...base.kv.settings, [key]: false })).ok).toBe(true);
      }
    });
  });

  describe('AC243: Kijkafstand in the backup', () => {
    const base = JSON.parse(load('v070-monsters.json')) as { kv: Record<string, Record<string, unknown>> };
    const withKv = (name: string, value: unknown): string => JSON.stringify({ ...base, kv: { ...base.kv, [name]: value } });
    it('AC243: viewDistance is optional, ver and dichtbij pass, anything else is refused', () => {
      expect(checkBackup(withKv('settings', { ...base.kv.settings, viewDistance: 'dichtbij' })).ok).toBe(true);
      expect(checkBackup(withKv('settings', { ...base.kv.settings, viewDistance: 'ver' })).ok).toBe(true);
      expect(checkBackup(withKv('settings', { ...base.kv.settings, viewDistance: 'kort' })).ok).toBe(false);
      const without = { ...base.kv.settings } as Record<string, unknown>;
      delete without.viewDistance;
      expect(checkBackup(withKv('settings', without)).ok).toBe(true);
  });
  });

  describe('AC238: bounds and terrain version per backup format', () => {
    const refused = { ok: false, message: MSG_BAD_VALUES };
    type Spot = { x: number; y: number; z: number };
    type File = { format: number; schemaVersion: number; kv: Record<string, Record<string, unknown>> };
    const u32 = (n: number): { $u32: string } => {
      const b = new Uint8Array(4);
      new DataView(b.buffer).setUint32(0, n, true);
      return { $u32: btoa(String.fromCharCode(...b)) };
    };
    /** A format 2 file inside the big world, made from the 0.7.0 fixture. */
    const v080 = (): File => {
      const f = JSON.parse(load('v070-monsters.json')) as File;
      f.format = 2;
      f.schemaVersion = 2;
      f.kv.world = { diff: u32((70 * 128 + 60) * 256 + 1), terrainVersion: 3 };
      f.kv.player = { ...f.kv.player, x: 72.5, y: 12, z: 100.5 };
      f.kv.monsters = { ...f.kv.monsters, knights: [{ id: 'k', mode: 'guard', spot: { x: 127, y: 79, z: 128 }, boughtFor: 30 }] };
      return f;
    };
    const check = (f: unknown) => checkBackup(JSON.stringify(f));
    const v070 = (): File => JSON.parse(backupV070()) as File;

    it('format 1 files made by 0.6.0 and 0.7.0 (builders) pass', () => {
      expect(checkBackup(backupV060()).ok).toBe(true);
      expect(checkBackup(backupV070()).ok).toBe(true);
    });
    it('a format 2 file inside 128 x 128 x 80 passes, its limits are exact', () => {
      expect(check(v080()).ok).toBe(true);
      const f = v080();
      f.kv.dinos = { dinos: [{ kind: 'rex', x: 128, y: 80, z: 0, stayX: 0, stayZ: 128 }], eggs: [{ x: 0, y: 0, z: 0 }] };
      expect(check(f).ok).toBe(true);
    });
    it('a format 1 file with a cell outside 64 x 64 x 64 is refused, the same file inside passes', () => {
      const f = v070();
      f.kv.world = { diff: u32(262_143 * 256 + 1), terrainVersion: 2 };
      expect(check(f).ok).toBe(true);
      f.kv.world = { diff: u32(262_144 * 256 + 1), terrainVersion: 2 };
      expect(check(f)).toEqual(refused);
      expect(checkBackup(load('bad-v070-cell-outside.json'))).toEqual(refused);
    });
    it('a format 2 file with a cell outside 128 x 128 x 80 is refused', () => {
      const f = v080();
      f.kv.world = { diff: u32(1_310_719 * 256 + 1), terrainVersion: 3 };
      expect(check(f).ok).toBe(true);
      f.kv.world = { diff: u32(1_310_720 * 256 + 1), terrainVersion: 3 };
      expect(check(f)).toEqual(refused);
      expect(checkBackup(load('bad-v080-cell-outside.json'))).toEqual(refused);
    });
    it('a format 1 file with a spot outside 64 (player, dino, chicken, egg, stay spot, knight) is refused, inside passes', () => {
      const edits: [string, (f: File) => void][] = [
        ['player x', (f) => { f.kv.player!.x = 64.5; }],
        ['player y', (f) => { f.kv.player!.y = 65; }],
        ['player z', (f) => { f.kv.player!.z = -1; }],
        ['dino x', (f) => { (f.kv.dinos!.dinos as Spot[])[0]!.x = 70; }],
        ['chicken z', (f) => { (f.kv.dinos!.dinos as Spot[])[5]!.z = 90; }],
        ['stay x', (f) => { (f.kv.dinos!.dinos as Record<string, number>[])[2]!.stayX = 64.5; }],
        ['stay z', (f) => { (f.kv.dinos!.dinos as Record<string, number>[])[2]!.stayZ = 100; }],
        ['egg y', (f) => { (f.kv.dinos!.eggs as Spot[])[0]!.y = 65; }],
        ['knight spot', (f) => { (f.kv.monsters!.knights as { spot: Spot }[])[1]!.spot.x = 64.5; }],
      ];
      expect(check(v070()).ok).toBe(true);
      for (const [name, edit] of edits) {
        const f = v070();
        edit(f);
        expect([name, check(f)]).toEqual([name, refused]);
      }
      expect(checkBackup(load('bad-v070-spot-outside.json'))).toEqual(refused);
    });
    it('the same spots at 64 to 127 pass in format 2 and a spot outside 128 x 128 x 80 is refused', () => {
      const edits: [string, (f: File) => void][] = [
        ['player x', (f) => { f.kv.player!.x = 128.5; }],
        ['player y', (f) => { f.kv.player!.y = 81; }],
        ['dino z', (f) => { f.kv.dinos = { dinos: [{ kind: 'rex', z: 129 }], eggs: [] }; }],
        ['stay x', (f) => { f.kv.dinos = { dinos: [{ kind: 'rex', stayX: 128.5 }], eggs: [] }; }],
        ['egg x', (f) => { f.kv.dinos = { dinos: [], eggs: [{ x: 130 }] }; }],
        ['knight spot', (f) => { (f.kv.monsters!.knights as { spot: Spot }[])[0]!.spot.y = 81; }],
      ];
      for (const [name, edit] of edits) {
        const f = v080();
        edit(f);
        expect([name, check(f)]).toEqual([name, refused]);
      }
      expect(checkBackup(load('bad-v080-spot-outside.json'))).toEqual(refused);
    });
    it('format 2 with terrain version 1, 2 or none, or with no world, is refused', () => {
      for (const terrainVersion of [1, 2, undefined]) {
        const f = v080();
        f.kv.world = { diff: u32(0), terrainVersion };
        expect(check(f)).toEqual(refused);
      }
      const f = v080();
      delete f.kv.world;
      expect(check(f)).toEqual(refused);
      expect(checkBackup(load('bad-v080-no-world.json'))).toEqual(refused);
    });
    it('format 1 with terrain version 3 is refused, 1, 2 and none pass', () => {
      for (const [terrainVersion, ok] of [[1, true], [2, true], [undefined, true], [3, false]] as const) {
        const f = v070();
        f.kv.world = { diff: u32(0), terrainVersion };
        expect(check(f).ok).toBe(ok);
      }
    });
    it('format 3 says "nieuwere versie", format 0 or a text is refused', () => {
      expect(checkBackup(load('bad-newer-format.json'))).toEqual({ ok: false, message: MSG_NEWER });
      expect(check({ ...v080(), format: 0 })).toEqual(refused);
      expect(check({ ...v080(), format: '2' })).toEqual(refused);
    });
  });
});
