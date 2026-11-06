import { describe, expect, it } from 'vitest';
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
});
