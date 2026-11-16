import { describe, expect, it } from 'vitest';
import {
  GEAR, GEAR_SLOTS, checkGear, gearById, dropKnight, kracht, lookKey, moedRate, noticeBonus, readGear, shopOrder, takeOff, toGearRecord,
  walkSpeed, wear, type GearData, type GearSlot,
} from './gear';

const ids = (...a: string[]) => a;
const data = (owned: string[], worn: GearData['worn'] = {}): GearData => ({ owned, worn });

describe('AC258 AC281: the gear table', () => {
  it('AC281: the 21 rows, the v19 rows first and the 13 of v21 after them, with their prices', () => {
    expect(GEAR.map((g) => [g.name, g.slot, g.price])).toEqual([
      ['Leren kap', 'hoofd', 10], ['Houten schild', 'schild', 10], ['Riddercape', 'rug', 15], ['Kietelveer', 'hand', 20],
      ['IJzeren helm', 'hoofd', 25], ['IJzeren schild', 'schild', 30], ['Glimzwaard', 'hand', 50], ['Pony', 'rijdier', 50],
      ['Houten zwaard', 'hand', 10], ['Snelle laarzen', 'voeten', 20], ['Banier', 'vlag', 25], ['Maliënkolder', 'lijf', 30],
      ['Koningscape', 'rug', 40], ['Pluimhelm', 'hoofd', 45], ['Koningsbanier', 'vlag', 55], ['Drakenschild', 'schild', 60],
      ['Glanzend harnas', 'lijf', 70], ['Bubbelstaf', 'hand', 75], ['Gouden helm', 'hoofd', 80], ['Strijdpaard', 'rijdier', 90],
      ['Rij-triceratops', 'rijdier', 120],
    ]);
    expect(GEAR.reduce((n, g) => n + g.price, 0)).toBe(930);
    expect(GEAR.slice(8).reduce((n, g) => n + g.price, 0)).toBe(720);
    expect(GEAR_SLOTS).toEqual(['hoofd', 'schild', 'hand', 'rug', 'lijf', 'voeten', 'vlag', 'rijdier']);
  });

  it('AC281: the shop order has Houten zwaard third and the Rij-triceratops last', () => {
    const order = shopOrder().map((g) => g.id);
    expect(order).toHaveLength(21);
    expect(order.slice(0, 3)).toEqual(['leren-kap', 'houten-schild', 'houten-zwaard']);
    expect(order[20]).toBe('rij-triceratops');
  });

  it('AC287: every item has a look with a shape and a colour, the Bubbelstaf blows bubbles', () => {
    for (const g of GEAR) {
      expect(g.look.shape.length).toBeGreaterThan(0);
      expect(g.look.color).toBeGreaterThan(0);
    }
    expect(gearById('bubbelstaf')!.look.effect).toBe('bubbles');
    expect(gearById('rij-triceratops')!.look.shape).toBe('triceratops');
  });
});

describe('AC283 AC284 AC285: the rules of v21', () => {
  it('AC283: Kracht 5 with the four dear items and still 5 with all 8 slots', () => {
    const dear = { hoofd: 'pluimhelm', schild: 'drakenschild', hand: 'bubbelstaf', rug: 'koningscape' } as const;
    expect(kracht(dear)).toBe(5);
    expect(kracht(dear)).toBe(kracht({ hoofd: 'leren-kap', schild: 'houten-schild', hand: 'houten-zwaard', rug: 'riddercape' }));
    const all = { ...dear, lijf: 'malienkolder', voeten: 'snelle-laarzen', vlag: 'koningsbanier', rijdier: 'strijdpaard' } as const;
    expect(kracht(all)).toBe(5);
    expect(kracht({ lijf: 'glanzend-harnas', voeten: 'snelle-laarzen', vlag: 'banier', rijdier: 'rij-triceratops' })).toBe(1);
    expect(kracht({ hoofd: 'gouden-helm' })).toBe(2);
  });

  it('AC283: three knights in all 8 slots never fill a bar under 3 seconds', () => {
    const all = { hoofd: 'gouden-helm', schild: 'drakenschild', hand: 'bubbelstaf', rug: 'koningscape', lijf: 'glanzend-harnas',
      voeten: 'snelle-laarzen', vlag: 'banier', rijdier: 'rij-triceratops' } as const;
    const full = 15;
    const rate = moedRate([kracht(all), kracht(all), kracht(all)], full);
    expect(full / rate).toBeGreaterThanOrEqual(3);
  });

  it('AC284: walks 3 bare, 4 with the boots, 5.5 on the Strijdpaard, 5 on the Rij-triceratops, boots add nothing on a mount', () => {
    expect(walkSpeed({ voeten: 'snelle-laarzen' })).toBe(4);
    expect(walkSpeed({ rijdier: 'strijdpaard' })).toBe(5.5);
    expect(walkSpeed({ rijdier: 'rij-triceratops' })).toBe(5);
    expect(walkSpeed({ voeten: 'snelle-laarzen', rijdier: 'strijdpaard' })).toBe(5.5);
    expect(walkSpeed({ voeten: 'snelle-laarzen', rijdier: 'pony' })).toBe(4.5);
  });

  it('AC285: the notice bonus is 4 with the Banier and 6 with the Koningsbanier, 0 otherwise', () => {
    expect(noticeBonus({ vlag: 'banier' })).toBe(4);
    expect(noticeBonus({ vlag: 'koningsbanier' })).toBe(6);
    expect(noticeBonus({ vlag: 'koningsbanier', hoofd: 'gouden-helm' })).toBe(6);
    expect(noticeBonus({ lijf: 'malienkolder', rijdier: 'strijdpaard' })).toBe(0);
  });

  it('AC282 AC283: one of each of the 13, wear all, one per slot and one of each owned', () => {
    let d = data(GEAR.slice(8).map((g) => g.id));
    for (const g of GEAR.slice(8)) d = wear(d, 'a', g.id, g.slot);
    expect(Object.keys(d.worn.a!)).toHaveLength(8);
    expect(d.owned).toHaveLength(13);
    expect(readGear({ knights: [{ id: 'a' }] as never, gear: toGearRecord(d) }).worn.a).toEqual(d.worn.a);
    expect(checkGear(toGearRecord(d))).toBe(true);
    expect(checkGear({ owned: ['banier'], worn: { a: { rug: 'banier' } } })).toBe(false);
  });
});

describe('AC262 AC263: Kracht, speed, notice', () => {
  it('AC262: kracht is 1 bare, 3 with helm and shield, 5 with four slots, still 5 with the Pony', () => {
    expect(kracht({})).toBe(1);
    expect(kracht(undefined)).toBe(1);
    expect(kracht({ hoofd: 'ijzeren-helm', schild: 'houten-schild' })).toBe(3);
    const four = { hoofd: 'leren-kap', schild: 'houten-schild', hand: 'glimzwaard', rug: 'riddercape' } as const;
    expect(kracht(four)).toBe(5);
    expect(kracht({ ...four, rijdier: 'pony' })).toBe(5);
    expect(kracht({ rijdier: 'pony' })).toBe(1);
  });

  it('AC263: walkSpeed is 3 and 4.5 with the Pony, the notice bonus is 0 for these items', () => {
    expect(walkSpeed({})).toBe(3);
    expect(walkSpeed({ rijdier: 'pony' })).toBe(4.5);
    expect(noticeBonus({ rijdier: 'pony', hoofd: 'leren-kap' })).toBe(0);
  });

  it('AC262: the Moed rate is the summed Kracht, never more than full in 3 seconds', () => {
    expect(moedRate([1], 30)).toBe(1);
    expect(moedRate([3], 30)).toBe(3);
    expect(moedRate([5], 30)).toBe(5);
    expect(moedRate([5, 5, 5], 30)).toBe(10);
    expect(moedRate([5, 5, 5], 15)).toBe(5);
    expect(moedRate([], 15)).toBe(0);
  });

  it('AC264: the look key is the sorted ids joined by +, empty when bare', () => {
    expect(lookKey({})).toBe('');
    expect(lookKey({ rijdier: 'pony', hoofd: 'leren-kap' })).toBe('leren-kap+pony');
  });
});

describe('AC261: wear, take off, drop a knight', () => {
  it('AC261: wear puts an item on and sends the old item of that slot back', () => {
    const d1 = wear(data(ids('leren-kap', 'ijzeren-helm')), 'a', 'leren-kap', 'hoofd');
    expect(d1.worn.a).toEqual({ hoofd: 'leren-kap' });
    const d2 = wear(d1, 'a', 'ijzeren-helm', 'hoofd');
    expect(d2.worn.a).toEqual({ hoofd: 'ijzeren-helm' });
    expect(d2.owned).toEqual(['leren-kap', 'ijzeren-helm']);
  });

  it('AC261: an item another knight wears moves, takeOff and null free the slot', () => {
    const d1 = wear(data(ids('pony')), 'a', 'pony', 'rijdier');
    const d2 = wear(d1, 'b', 'pony', 'rijdier');
    expect(d2.worn.a).toEqual({});
    expect(d2.worn.b).toEqual({ rijdier: 'pony' });
    expect(takeOff(d2, 'b', 'rijdier').worn.b).toEqual({});
    expect(wear(d2, 'b', null, 'rijdier').worn.b).toEqual({});
    expect(dropKnight(d2, 'b').worn.b).toBeUndefined();
    expect(dropKnight(d2, 'b').owned).toEqual(['pony']);
  });

  it('AC261: a refused call changes nothing (not owned, unknown, wrong slot)', () => {
    const d = data(ids('leren-kap'));
    expect(wear(d, 'a', 'pony', 'rijdier')).toBe(d);
    expect(wear(d, 'a', 'drakenhelm', 'hoofd')).toBe(d);
    expect(wear(d, 'a', 'leren-kap', 'schild')).toBe(d);
  });

  it('AC261: 1000 random wear calls on 3 knights keep one of each, no item on two knights, no slot twice', () => {
    let seed = 12345;
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    let d = data(GEAR.map((g) => g.id));
    const knights = ['a', 'b', 'c'];
    for (let i = 0; i < 1000; i++) {
      const g = GEAR[rnd(GEAR.length)]!;
      const slot: GearSlot = rnd(5) === 0 ? GEAR_SLOTS[rnd(5)]! : g.slot;
      const item = rnd(6) === 0 ? null : g.id;
      d = wear(d, knights[rnd(3)]!, item, slot);
      const worn = Object.values(d.worn).flatMap((w) => Object.values(w));
      expect(new Set(worn).size).toBe(worn.length);
      expect(d.owned).toHaveLength(GEAR.length);
      for (const w of Object.values(d.worn)) for (const [s, id] of Object.entries(w)) expect(GEAR.find((x) => x.id === id)?.slot).toBe(s);
    }
    expect(checkGear(toGearRecord(d))).toBe(true);
  });
});

describe('AC267: readGear and checkGear', () => {
  const knights = [{ id: 'a', mode: 'follow', spot: null, boughtFor: 30 }] as never[];
  it('AC267: a record without gear reads empty', () => {
    expect(readGear({ knights })).toEqual({ owned: [], worn: {} });
  });
  it('AC267: readGear drops unknown ids, items not owned, wrong slots and missing knights', () => {
    const read = readGear({
      knights,
      gear: {
        owned: ['leren-kap', 'drakenhelm', 'pony', 'leren-kap'],
        worn: { a: { hoofd: 'leren-kap', schild: 'pony', rijdier: 'ijzeren-helm' }, gone: { rijdier: 'pony' } },
      },
    });
    expect(read).toEqual({ owned: ['leren-kap', 'pony'], worn: { a: { hoofd: 'leren-kap' } } });
  });
  it('AC267: checkGear refuses an unknown id, an id twice, an item on two knights and an item under the wrong slot', () => {
    expect(checkGear(undefined)).toBe(true);
    expect(checkGear({ owned: ['pony'], worn: { a: { rijdier: 'pony' } } })).toBe(true);
    expect(checkGear({ owned: ['x'], worn: {} })).toBe(false);
    expect(checkGear({ owned: ['pony', 'pony'], worn: {} })).toBe(false);
    expect(checkGear({ owned: ['pony'], worn: { a: { rijdier: 'pony' }, b: { rijdier: 'pony' } } })).toBe(false);
    expect(checkGear({ owned: ['leren-kap'], worn: { a: { schild: 'leren-kap' } } })).toBe(false);
    expect(checkGear({ owned: [], worn: { a: { rijdier: 'pony' } } })).toBe(false);
    expect(checkGear({ owned: 'pony' })).toBe(false);
    expect(checkGear([])).toBe(false);
  });
});
