// Knight gear as data (v19 Ridderuitrusting, decisions 133 and 142). No DOM and no three here: one table and the
// pure rules on it, so v21 adds rows and slots and almost no code. Worn gear lives in the `monsters` record
// (`gear.owned` and `gear.worn`), never on `KnightRecord`, so a knight rewrite or a rolled back 0.9.0 keeps it.
import type { MonstersRecord } from '../storage/schema';

export type GearSlot = 'hoofd' | 'schild' | 'hand' | 'rug' | 'lijf' | 'voeten' | 'vlag' | 'rijdier';

/** The Uitrusten order of the slots. */
export const GEAR_SLOTS: readonly GearSlot[] = ['hoofd', 'schild', 'hand', 'rug', 'lijf', 'voeten', 'vlag', 'rijdier'];
export const SLOT_LABELS: Record<GearSlot, string> = {
  hoofd: 'Hoofd', schild: 'Schild', hand: 'Hand', rug: 'Rug', lijf: 'Lijf', voeten: 'Voeten', vlag: 'Vlag', rijdier: 'Rijdier',
};
/** One emoji per slot, for `gearIcon`. */
export const SLOT_ICON: Record<GearSlot, string> = {
  hoofd: '\u{1FA96}', schild: '\u{1F6E1}\u{FE0F}', hand: '\u{1F5E1}\u{FE0F}', rug: '\u{1F9E3}', lijf: '\u{1F455}', voeten: '\u{1F462}', vlag: '\u{1F6A9}', rijdier: '\u{1F434}',
};

export interface GearLook {
  /** A name the knight model understands: kap, houten-schild, cape, veer, helm, ijzeren-schild, glimzwaard, pony, sword, boots, banner, mail,
   *  plume-helm, dragon-shield, armour, staff, horse, triceratops. */
  shape: string;
  /** Main colour, 0xRRGGBB. */
  color: number;
  /** A lighter colour for shiny metal. No animation. */
  shine?: number;
  effect?: 'giggle' | 'sparkle' | 'bubbles';
}

export interface GearItem {
  id: string;
  name: string;
  slot: GearSlot;
  price: number;
  /** 1 adds one Kracht. The Rijdier adds none. */
  kracht: 0 | 1;
  /** Blocks per second this item adds to the walk (a mount or boots). */
  speed: number;
  /** Blocks added to the notice range of Klodder and the mole. */
  sight: number;
  look: GearLook;
}

/** The PRD table in its order. */
export const GEAR: readonly GearItem[] = [
  { id: 'leren-kap', name: 'Leren kap', slot: 'hoofd', price: 10, kracht: 1, speed: 0, sight: 0, look: { shape: 'kap', color: 0x8b5a2b } },
  { id: 'houten-schild', name: 'Houten schild', slot: 'schild', price: 10, kracht: 1, speed: 0, sight: 0, look: { shape: 'houten-schild', color: 0xa0703c } },
  { id: 'riddercape', name: 'Riddercape', slot: 'rug', price: 15, kracht: 1, speed: 0, sight: 0, look: { shape: 'cape', color: 0xc0392b } },
  { id: 'kietelveer', name: 'Kietelveer', slot: 'hand', price: 20, kracht: 1, speed: 0, sight: 0, look: { shape: 'veer', color: 0xf48fb1, effect: 'giggle' } },
  { id: 'ijzeren-helm', name: 'IJzeren helm', slot: 'hoofd', price: 25, kracht: 1, speed: 0, sight: 0, look: { shape: 'helm', color: 0x9aa5b1, shine: 0xe3e9ef } },
  { id: 'ijzeren-schild', name: 'IJzeren schild', slot: 'schild', price: 30, kracht: 1, speed: 0, sight: 0, look: { shape: 'ijzeren-schild', color: 0x9aa5b1, shine: 0xe3e9ef } },
  { id: 'glimzwaard', name: 'Glimzwaard', slot: 'hand', price: 50, kracht: 1, speed: 0, sight: 0, look: { shape: 'glimzwaard', color: 0xf5d04a, effect: 'sparkle' } },
  { id: 'pony', name: 'Pony', slot: 'rijdier', price: 50, kracht: 0, speed: 1.5, sight: 0, look: { shape: 'pony', color: 0xb07840 } },
  // v21 (decision 142): appended after the v19 rows, so the stable shop sort gives the PRD order.
  { id: 'houten-zwaard', name: 'Houten zwaard', slot: 'hand', price: 10, kracht: 1, speed: 0, sight: 0, look: { shape: 'sword', color: 0xb8864b } },
  { id: 'snelle-laarzen', name: 'Snelle laarzen', slot: 'voeten', price: 20, kracht: 0, speed: 1, sight: 0, look: { shape: 'boots', color: 0x3d85c6 } },
  { id: 'banier', name: 'Banier', slot: 'vlag', price: 25, kracht: 0, speed: 0, sight: 4, look: { shape: 'banner', color: 0x2e9e5b } },
  { id: 'malienkolder', name: 'Maliënkolder', slot: 'lijf', price: 30, kracht: 0, speed: 0, sight: 0, look: { shape: 'mail', color: 0x8a949e, shine: 0xc9d1d8 } },
  { id: 'koningscape', name: 'Koningscape', slot: 'rug', price: 40, kracht: 1, speed: 0, sight: 0, look: { shape: 'cape', color: 0x6a2c91, shine: 0xf5d04a } },
  { id: 'pluimhelm', name: 'Pluimhelm', slot: 'hoofd', price: 45, kracht: 1, speed: 0, sight: 0, look: { shape: 'plume-helm', color: 0x9aa5b1, shine: 0xe3e9ef } },
  { id: 'koningsbanier', name: 'Koningsbanier', slot: 'vlag', price: 55, kracht: 0, speed: 0, sight: 6, look: { shape: 'banner', color: 0xc0392b, shine: 0xf5d04a } },
  { id: 'drakenschild', name: 'Drakenschild', slot: 'schild', price: 60, kracht: 1, speed: 0, sight: 0, look: { shape: 'dragon-shield', color: 0x2e8b57, shine: 0xf5d04a } },
  { id: 'glanzend-harnas', name: 'Glanzend harnas', slot: 'lijf', price: 70, kracht: 0, speed: 0, sight: 0, look: { shape: 'armour', color: 0xb8c2cc, shine: 0xf4f7fa } },
  { id: 'bubbelstaf', name: 'Bubbelstaf', slot: 'hand', price: 75, kracht: 1, speed: 0, sight: 0, look: { shape: 'staff', color: 0x7ec8e3, effect: 'bubbles' } },
  { id: 'gouden-helm', name: 'Gouden helm', slot: 'hoofd', price: 80, kracht: 1, speed: 0, sight: 0, look: { shape: 'helm', color: 0xf5c518, shine: 0xfff2a8 } },
  { id: 'strijdpaard', name: 'Strijdpaard', slot: 'rijdier', price: 90, kracht: 0, speed: 2.5, sight: 0, look: { shape: 'horse', color: 0x5b3a29 } },
  { id: 'rij-triceratops', name: 'Rij-triceratops', slot: 'rijdier', price: 120, kracht: 0, speed: 2, sight: 0, look: { shape: 'triceratops', color: 0x6aa84f } },
];

export const GEAR_IDS: readonly string[] = GEAR.map((g) => g.id);
export const MAX_KRACHT = 5;
/** A fight lasts at least this many seconds, whatever the Kracht (decision 133). */
export const MIN_FIGHT_SECONDS = 3;
/** Blocks per second of a knight on foot without gear (`DINO_SPEED`). */
export const BASE_WALK_SPEED = 3;

/** What one knight wears: slot to item id. */
export type Worn = Partial<Record<GearSlot, string>>;

/** The wapenkast and who wears what, as read from the `monsters` record. */
export interface GearData {
  owned: readonly string[];
  worn: Readonly<Record<string, Worn>>;
}
export const EMPTY_GEAR: GearData = { owned: [], worn: {} };

const byId = new Map(GEAR.map((g) => [g.id, g]));
export const gearById = (id: string): GearItem | undefined => byId.get(id);
export const isGearSlot = (s: unknown): s is GearSlot => (GEAR_SLOTS as readonly unknown[]).includes(s);

/** The items in the shop order: cheapest first, a stable sort so the table order breaks ties. */
export function shopOrder(): GearItem[] {
  return GEAR.map((g, i) => ({ g, i })).sort((a, b) => a.g.price - b.g.price || a.i - b.i).map((x) => x.g);
}

/** The items a knight wears, in slot order. A bad id is skipped. */
export function wornItems(worn: Worn | undefined): GearItem[] {
  const out: GearItem[] = [];
  for (const slot of GEAR_SLOTS) {
    const item = worn?.[slot] ? gearById(worn[slot] as string) : undefined;
    if (item && item.slot === slot) out.push(item);
  }
  return out;
}

/** Kracht 1 bare, plus 1 for each worn item that gives it, at most `MAX_KRACHT`. */
export const kracht = (worn: Worn | undefined): number =>
  Math.min(MAX_KRACHT, 1 + wornItems(worn).reduce((n, g) => n + g.kracht, 0));

/** Blocks per second: a mount wins over boots; the others add nothing. */
export function walkSpeed(worn: Worn | undefined): number {
  const items = wornItems(worn);
  const mount = items.find((g) => g.slot === 'rijdier');
  const feet = items.find((g) => g.slot === 'voeten');
  return BASE_WALK_SPEED + (mount ? mount.speed : feet ? feet.speed : 0);
}

/** The largest `sight` a knight wears. */
export const noticeBonus = (worn: Worn | undefined): number => wornItems(worn).reduce((n, g) => Math.max(n, g.sight), 0);

/** The key of a gear set for `ActorView.look`: sorted ids joined by `+`, empty for a bare knight. */
export const lookKey = (worn: Worn | undefined): string =>
  wornItems(worn).map((g) => g.id).sort().join('+');

/** The Moed bar fill per second of all poking knights: summed Kracht, at most `full / MIN_FIGHT_SECONDS`. */
export const moedRate = (krachts: readonly number[], full: number): number =>
  Math.min(krachts.reduce((n, k) => n + k, 0), full / MIN_FIGHT_SECONDS);

/** What `monsters.gear` holds: plain arrays and objects. */
export type GearRecord = NonNullable<MonstersRecord['gear']>;

/**
 * Reads the gear of a `monsters` record. Empty for a missing field. Drops an unknown id, a worn item that is not
 * owned, a worn item in the wrong slot, an item worn twice and a knight id that is not in `knights` (his items are
 * then in the wapenkast).
 */
export function readGear(m: Pick<MonstersRecord, 'knights'> & { gear?: unknown }): GearData {
  const raw = m.gear;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return EMPTY_GEAR;
  const g = raw as { owned?: unknown; worn?: unknown };
  const owned: string[] = [];
  if (Array.isArray(g.owned)) {
    for (const id of g.owned) if (typeof id === 'string' && byId.has(id) && !owned.includes(id)) owned.push(id);
  }
  const worn: Record<string, Worn> = {};
  const seen = new Set<string>();
  if (typeof g.worn === 'object' && g.worn !== null && !Array.isArray(g.worn)) {
    const known = new Set((m.knights ?? []).map((k) => k.id));
    for (const [kid, entry] of Object.entries(g.worn as Record<string, unknown>)) {
      if (!known.has(kid) || typeof entry !== 'object' || entry === null) continue;
      const mine: Worn = {};
      for (const slot of GEAR_SLOTS) {
        const id = (entry as Record<string, unknown>)[slot];
        if (typeof id !== 'string' || !owned.includes(id) || seen.has(id) || gearById(id)?.slot !== slot) continue;
        seen.add(id);
        mine[slot] = id;
      }
      if (Object.keys(mine).length > 0) worn[kid] = mine;
    }
  }
  return { owned, worn };
}

/** The plain record for `monsters.gear`. Empty worn entries are left out. */
export function toGearRecord(d: GearData): GearRecord {
  const worn: Record<string, Worn> = {};
  for (const [kid, w] of Object.entries(d.worn)) if (Object.keys(w).length > 0) worn[kid] = { ...w };
  return { owned: [...d.owned], worn };
}

/** Where an item is worn: the knight id, or null when it lies in the wapenkast. */
export function wornBy(d: GearData, itemId: string): string | null {
  for (const [kid, w] of Object.entries(d.worn)) if (Object.values(w).includes(itemId)) return kid;
  return null;
}

/** Takes the item off this slot of a knight. It goes back to the wapenkast. */
export function takeOff(d: GearData, knightId: string, slot: GearSlot): GearData {
  const mine = d.worn[knightId];
  if (!mine || !mine[slot]) return d;
  const next = { ...mine };
  delete next[slot];
  return { owned: d.owned, worn: { ...d.worn, [knightId]: next } };
}

/**
 * Puts an owned item on a knight in its slot, or with `null` takes the slot off. The old item of that slot goes
 * back to the wapenkast; an item another knight wears moves here. A refused call (unknown or not owned item, wrong
 * slot) returns `d` itself.
 */
export function wear(d: GearData, knightId: string, itemId: string | null, slot: GearSlot): GearData {
  if (itemId === null) return takeOff(d, knightId, slot);
  const item = gearById(itemId);
  if (!item || item.slot !== slot || !d.owned.includes(itemId)) return d;
  const worn: Record<string, Worn> = {};
  for (const [kid, w] of Object.entries(d.worn)) {
    const copy = { ...w };
    for (const s of GEAR_SLOTS) if (copy[s] === itemId) delete copy[s];
    worn[kid] = copy;
  }
  worn[knightId] = { ...(worn[knightId] ?? {}), [slot]: itemId };
  return { owned: d.owned, worn };
}

/** A knight is gone (traded in): everything he wore is back in the wapenkast. */
export function dropKnight(d: GearData, knightId: string): GearData {
  if (!(knightId in d.worn)) return d;
  const worn = { ...d.worn };
  delete worn[knightId];
  return { owned: d.owned, worn };
}

/** How many items this knight wears. */
export const gearCount = (d: GearData, knightId: string): number => Object.values(d.worn[knightId] ?? {}).length;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * The backup check of a `gear` field (AC267). True for a missing field. False for an unknown id, an id twice in
 * `owned`, a worn id that is not owned, one id worn by two knights or an id under a slot that is not its own.
 * A `worn` entry for a knight that is not in the file is allowed (it is read as the wapenkast).
 */
export function checkGear(raw: unknown): boolean {
  if (raw === undefined) return true;
  if (!isObj(raw)) return false;
  const { owned, worn } = raw;
  if (owned !== undefined) {
    if (!Array.isArray(owned) || owned.length > GEAR.length) return false;
    if (!owned.every((id) => typeof id === 'string' && byId.has(id))) return false;
    if (new Set(owned).size !== owned.length) return false;
  }
  if (worn !== undefined) {
    if (!isObj(worn)) return false;
    const have = new Set((owned as string[] | undefined) ?? []);
    const seen = new Set<string>();
    for (const [kid, entry] of Object.entries(worn)) {
      if (kid.length < 1 || kid.length > 40 || !isObj(entry)) return false;
      for (const [slot, id] of Object.entries(entry)) {
        if (!isGearSlot(slot) || typeof id !== 'string' || !have.has(id) || seen.has(id)) return false;
        if (gearById(id)?.slot !== slot) return false;
        seen.add(id);
      }
    }
  }
  return true;
}
