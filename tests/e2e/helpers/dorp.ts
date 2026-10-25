// Helpers for the v11 Dorp e2e spec: seeding a seen item, standing next to a villager, real finger taps.
import { expect, type Page } from '@playwright/test';
import { itemFromId } from '../../../src/content/rekenen/generator';
import { openApp, readState } from './app';

export interface VillagerInfo {
  id: string;
  site: string;
  home: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  shirt: number;
  style: string;
  gives: number;
  dancing: boolean;
}

export interface BubbleState {
  visible: boolean;
  text: string;
  villager: string | null;
  canAsk: boolean;
}

export interface VillageStateShape {
  found: number[];
  cooldownMs: number;
  lastVillager: string | null;
}

/** Hakken/Bouwen state as the game reports it. */
export interface BuildStateShape {
  hotbar: number[];
  selected: number;
  mode: string;
}

/** The seen sum used for villager questions. 7 x 8 is a fixed fact of level E6. */
export const SEEN_ITEM_ID = 'tafels:7x8';
export const SEEN_ANSWER = 56;

/** A real finger tap in the middle of an element. Waits until the element is visible. */
export async function fingerTap(page: Page, selector: string): Promise<void> {
  const loc = page.locator(selector).filter({ visible: true }).first();
  await loc.waitFor({ state: 'visible' });
  const box = await loc.boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

/** A real finger tap on a button with this text. */
export async function fingerTapText(page: Page, text: string | RegExp, scope = 'body'): Promise<void> {
  const loc = page.locator(`${scope} button`, { hasText: text }).filter({ visible: true }).first();
  await loc.waitFor({ state: 'visible' });
  await loc.scrollIntoViewIfNeeded();
  const box = await loc.boundingBox();
  if (!box) throw new Error(`no box for ${String(text)}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

/** Writes one value into the kv store of the app database (the page must be open on the app). */
export async function putKv(page: Page, key: string, value: unknown): Promise<void> {
  await page.evaluate(
    ({ key, value }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(value, key);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { key, value },
  );
}

/** Reads one value of the kv store. */
export async function getKv<T = unknown>(page: Page, key: string): Promise<T | undefined> {
  return page.evaluate(
    (key) =>
      new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const get = db.transaction('kv', 'readonly').objectStore('kv').get(key);
          get.onsuccess = () => {
            db.close();
            resolve(get.result);
          };
          get.onerror = () => reject(get.error);
        };
      }),
    key,
  ) as Promise<T | undefined>;
}

/** Marks one Rekenen sum as seen (box 2), so a villager has something to ask. Also switches nothing off. */
export async function seedSeenItem(page: Page, itemId = SEEN_ITEM_ID): Promise<void> {
  const item = itemFromId(itemId, 'E6');
  if (!item) throw new Error(`no such sum ${itemId}`);
  const record = {
    moduleId: 'rekenen-basis',
    itemId,
    box: 2,
    due: '2000-01-01',
    level: item.level,
    topic: itemId.split(':')[0],
    skill: item.skill,
    seen: 1,
  };
  await page.evaluate(
    ({ record }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('progress', 'readwrite');
          tx.objectStore('progress').put(record, `${record.moduleId}|${record.itemId}`);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { record },
  );
}

/** Opens the app with one seen item and a full play timer, ready for a villager visit. */
export async function openForVillage(page: Page): Promise<void> {
  await openApp(page);
  await seedSeenItem(page);
  await readState(page, 'setPlayRemainingMs', 5 * 60_000);
}

export const villagers = (page: Page) => readState<VillagerInfo[]>(page, 'villagers');
export const bubble = (page: Page) => readState<BubbleState>(page, 'villageBubble');
export const villageState = (page: Page) => readState<VillageStateShape>(page, 'villageState');
export const cardState = (page: Page) => readState<{ open: boolean; phase: string | null }>(page, 'villageCard');
export const buildState = (page: Page) => readState<BuildStateShape>(page, 'buildState');

/** Puts the player on the ground `dist` blocks south of a villager, looking at it, and lets the flow look. */
export async function standNear(page: Page, id: string, dist = 1.4): Promise<VillagerInfo> {
  const v = (await villagers(page)).find((x) => x.id === id);
  if (!v) throw new Error(`no villager ${id}`);
  await page.evaluate(
    ({ x, y, z }) => (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino.placePlayer!(x, y, z, 0),
    { x: v.position.x, y: v.position.y + 0.2, z: v.position.z - dist },
  );
  return v;
}

/** Sends the player home to the start spot, which is far from every village. */
export async function walkFarAway(page: Page): Promise<void> {
  await readState(page, 'teleportHome');
}

/** Calls tickVillage until the bubble has this visibility. No sleeping: the poll re-ticks every round. */
export async function waitBubble(page: Page, visible: boolean): Promise<BubbleState> {
  await expect
    .poll(async () => {
      await readState(page, 'tickVillage');
      return (await bubble(page)).visible;
    })
    .toBe(visible);
  return bubble(page);
}

/** Types a whole number on the open number pad with finger taps and taps the done key. */
export async function typeNumber(page: Page, n: number): Promise<void> {
  for (const ch of String(n)) {
    await fingerTapText(page, new RegExp(`^${ch}$`), '.number-pad');
  }
  await fingerTap(page, '.number-pad .kb-done');
}

/** Opens a villager card the way a kid does: stand close, wait for the bubble, tap it. Returns the villager. */
export async function openCardAt(page: Page, id: string): Promise<VillagerInfo> {
  const v = await standNear(page, id);
  await waitBubble(page, true);
  await fingerTap(page, '[data-testid="village-bubble"]');
  await expect.poll(() => cardState(page).then((c) => c.open)).toBe(true);
  await page.locator('[data-testid="village-card"] .q-view').waitFor();
  return v;
}

/** Counts pixels of a screenshot (PNG bytes) that are close to a 0xRRGGBB colour. Decoded in the page, so no image library. */
export async function shirtPixels(page: Page, png: Uint8Array, hex: number, tolerance = 45): Promise<number> {
  return page.evaluate(
    async ({ b64, hex, tolerance }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const r = (hex >> 16) & 255;
      const g = (hex >> 8) & 255;
      const bl = hex & 255;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (Math.abs(d[i]! - r) < tolerance && Math.abs(d[i + 1]! - g) < tolerance && Math.abs(d[i + 2]! - bl) < tolerance) n++;
      }
      return n;
    },
    { b64: toBase64(png), hex, tolerance },
  );
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
