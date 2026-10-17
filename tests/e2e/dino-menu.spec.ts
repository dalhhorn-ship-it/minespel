import { expect, test, type Page } from '@playwright/test';
import { growthScale } from '../../src/dinos/egg';
import { DINO_KINDS } from '../../src/dinos/kinds';
import { STEEN } from '../../src/world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';

// Needs game.ts to pass onRename to the dino menu (see the T45 report); the menu and screen are tested without it in unit tests.
const C = Math.floor(WORLD_SIZE / 2);
const GROUND = 10;

interface DinoInfo { id: number; kind: 'compy'; name: string; mode: string; x: number; y: number; z: number; growth: number }
const dinos = (page: Page) => readState<{ dinos: DinoInfo[] }>(page, 'dinoState').then((s) => s.dinos);

async function flatten(page: Page) {
  await page.evaluate(
    ({ c, stone, height, ground }) => {
      const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino;
      for (let x = c - 12; x <= c + 12; x++)
        for (let z = c - 12; z <= c + 12; z++)
          for (let y = 0; y < height; y++) hooks.setBlock!(x, y, z, y < ground ? stone : 0, 1);
      hooks.rebuildWorld!();
      hooks.placePlayer!(c + 0.5, ground, c + 0.5, 0);
    },
    { c: C, stone: STEEN, height: WORLD_HEIGHT, ground: GROUND },
  );
  await page.waitForTimeout(200);
}

async function worldTap(page: Page, id: number, x: number, y: number) {
  await page.evaluate(
    ({ id, x, y }) => {
      const target = document.querySelector('.world') as HTMLElement;
      const fire = (type: string) =>
        target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true }));
      fire('pointerdown');
      fire('pointerup');
    },
    { id, x, y },
  );
}

/** Opens the menu of the only dino by tapping it in the world. */
async function openMenu(page: Page, pointer: number) {
  await readState(page, 'closeDinoMenu');
  const d = (await dinos(page))[0]!;
  const p = await page.evaluate(
    ({ wx, wy, wz, ground, c }) => {
      const W = window.innerWidth, H = window.innerHeight;
      const t = Math.tan((70 * Math.PI) / 360);
      const ndcX = -(wx - (c + 0.5)) / (wz - (c + 0.5)) / (t * (W / H));
      const ndcY = (wy - (ground + 1.6)) / (wz - (c + 0.5)) / t;
      return { x: ((ndcX + 1) / 2) * W, y: ((1 - ndcY) / 2) * H };
    },
    { wx: d.x, wy: d.y + (DINO_KINDS[d.kind].size.h * growthScale(d.growth)) / 2, wz: d.z, ground: GROUND, c: C },
  );
  await worldTap(page, pointer, p.x, p.y);
  await expect.poll(() => readState<boolean>(page, 'dinoMenuOpen')).toBe(true);
}

const tapEl = (page: Page, selector: string, text: string) =>
  page.locator(selector).getByRole('button', { name: text, exact: true }).dispatchEvent('pointerdown', { pointerId: 31, pointerType: 'touch' })
    .then(() => page.locator(selector).getByRole('button', { name: text, exact: true }).dispatchEvent('pointerup', { pointerId: 31, pointerType: 'touch' }));

test('dino menu: Blijf hier, naming with the kid keyboard, name kept after reopening (AC16, AC18, AC23)', async ({ page }, info) => {
  await openApp(page);
  await flatten(page);
  await readState(page, 'addTestEgg', 'compy', false);
  await expect.poll(async () => (await dinos(page)).length, { timeout: 12_000 }).toBe(1);
  const d = (await dinos(page))[0]!;
  await readState(page, 'pauseGame');
  await readState(page, 'placeDino', d.id, C + 0.5 - 1.2, GROUND, C + 0.5 + 3);
  await readState(page, 'resumeGame');
  await openMenu(page, 21);
  expect(await readState<boolean>(page, 'gameRunning')).toBe(false); // the menu stops the timer and the world
  await page.screenshot({ path: info.outputPath('dino-menu.png') });

  const menu = page.locator('.dino-menu-panel');
  for (const label of ['Volg mij', 'Blijf hier', 'Naam geven', 'Knuffel']) {
    const box = (await menu.getByRole('button', { name: label, exact: true }).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(56);
  }
  await tapEl(page, '.dino-menu-panel', 'Blijf hier');
  await expect.poll(async () => (await dinos(page))[0]!.mode).toBe('stay');

  await tapEl(page, '.dino-menu-panel', 'Naam geven');
  await expect(page.locator('.name-prompt')).toHaveText('Bedenk een leuke dinonaam');
  for (const c of 'rexxxxxxxxxxxxx') await tapEl(page, '.name-screen', c);
  await expect(page.locator('.dino-menu-panel')).toBeHidden(); // the naming screen replaces the menu
  await expect(page.locator('.name-text')).toHaveText('rexxxxxxxxxx'); // 12 at most
  await page.screenshot({ path: info.outputPath('name-screen.png') });
  await tapEl(page, '.name-screen', 'Klaar');
  await expect(page.locator('.dino-menu-title')).toHaveText('rexxxxxxxxxx');
  await expect.poll(async () => (await dinos(page))[0]!.name).toBe('rexxxxxxxxxx');

  // Reopen: the name is shown.
  await readState(page, 'closeDinoMenu');
  expect(await readState<boolean>(page, 'gameRunning')).toBe(true);
  await openMenu(page, 22);
  await expect(page.locator('.dino-menu-title')).toHaveText('rexxxxxxxxxx');
});
