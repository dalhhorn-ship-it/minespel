import { expect, test, type Page } from '@playwright/test';
import { holdStorage, type StorageHold } from './helpers/slow-storage';

// R1d (decisions 78 and 83): no button is dead while the app loads.
// Every storage button shows one "Even geduld..." card and then opens by itself.
// These specs never wait for the app's ready hook before the taps. That wait is exactly why CI missed
// the dead Pauze bug. Real finger taps, no fixed sleeps. The 10 s limit is moved with page.clock.
//
// The Winkel placeholder has no "Verdien punten" button (only the real shop has it), so that case is not here.

const WAITING = 'Even geduld...';
const CANNOT_LOAD = 'Je spullen laden niet. Sluit de app en open hem opnieuw.';
const HELD_MS = 2000;

async function fingerTap(page: Page, selector: string): Promise<void> {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: 'visible' });
  const box = await loc.boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

/** Opens the page and waits only for the HUD to be on screen. Never for the ready hook. */
async function openHud(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('[data-testid="hud-pause"]').waitFor({ state: 'visible' });
}

interface StorageButton {
  name: string;
  /** Which storage hold makes this button reachable and still not ready. */
  held: (ms?: number) => StorageHold;
  never: StorageHold;
  /** Taps the buttons that lead to it and then the button itself. Resolves right after the last tap. */
  tap: (page: Page) => Promise<void>;
  /** What the kid sees once it has opened. */
  opened: (page: Page) => Promise<void>;
}

const open = (ms = HELD_MS): StorageHold => ({ kind: 'open', ms });
const settings = (ms = HELD_MS): StorageHold => ({ kind: 'settings', ms });

async function pauseThen(page: Page, selector: string): Promise<void> {
  await fingerTap(page, '[data-testid="hud-pause"]');
  await page.getByRole('dialog', { name: 'Pauze' }).waitFor();
  await fingerTap(page, selector);
}

const BUTTONS: StorageButton[] = [
  {
    name: 'HUD lock',
    held: open,
    never: { kind: 'open-never' },
    tap: (page) => fingerTap(page, '.hud [data-testid="parent-controls-btn"]'),
    opened: (page) => expect(page.locator('.parent-gate')).toBeVisible(),
  },
  {
    name: 'Ouders in the pause menu',
    held: open,
    never: { kind: 'open-never' },
    tap: (page) => pauseThen(page, '.pause-btn-parent'),
    opened: (page) => expect(page.locator('.parent-gate')).toBeVisible(),
  },
  {
    name: 'Extra oefenen',
    held: open,
    never: { kind: 'open-never' },
    tap: (page) => pauseThen(page, '.pause-btn:has-text("Extra oefenen")'),
    opened: (page) => expect(page.getByRole('dialog', { name: 'Extra oefenen' })).toBeVisible(),
  },
  {
    // The Lesboek only has lessons after the database is read, so this one is held late in boot.
    name: 'Lesboek Oefen dit onderwerp',
    held: settings,
    never: { kind: 'settings-never' },
    tap: async (page) => {
      await pauseThen(page, '.pause-btn:has-text("Lesboek")');
      await page.getByRole('dialog', { name: 'Lesboek' }).waitFor();
      await fingerTap(page, '[data-topic-id]');
      await fingerTap(page, '[data-testid="lesboek-practice-topic"]');
    },
    opened: (page) => expect(page.locator('.break-screen')).toBeVisible(),
  },
  {
    name: 'countdown Nu oefenen',
    held: open,
    never: { kind: 'open-never' },
    tap: (page) => fingerTap(page, '[data-testid="countdown-start-now"]'),
    opened: (page) => expect(page.locator('.break-screen')).toBeVisible(),
  },
];

test.describe('AC-R1: buttons tapped while storage is slow show Even geduld and then open', () => {
  for (const b of BUTTONS) {
    test(`${b.name}: storage held 2 s shows the card and then opens by itself`, async ({ page }) => {
      await holdStorage(page, b.held());
      await openHud(page);
      await b.tap(page);
      await expect(page.getByTestId('waiting-card')).toBeVisible({ timeout: 300 });
      await expect(page.getByTestId('waiting-text')).toHaveText(WAITING);
      // Opens without another tap, once storage answers.
      await b.opened(page);
      await expect(page.getByTestId('waiting-card')).toHaveCount(0);
    });
  }
});

test.describe('AC-R1: storage that never answers', () => {
  for (const b of BUTTONS) {
    test(`${b.name}: card, and Terug goes back to the world`, async ({ page }) => {
      await holdStorage(page, b.never);
      await openHud(page);
      await b.tap(page);
      await expect(page.getByTestId('waiting-card')).toBeVisible({ timeout: 300 });
      await expect(page.getByTestId('waiting-text')).toHaveText(WAITING);
      await fingerTap(page, '[data-testid="waiting-back"]');
      await expect(page.getByTestId('waiting-card')).toHaveCount(0);
      await expect(page.locator('[data-testid="hud-pause"]')).toBeVisible();
      expect(await page.evaluate(() => (window as unknown as { __dino: { currentScreen(): string } }).__dino.currentScreen())).toBe('world');
      await expect(page.locator('.parent-gate, .break-screen')).toHaveCount(0);
    });

    test(`${b.name}: the cannot load text shows after 10 s`, async ({ page }) => {
      // The 10 s limit is waited out by design, with a fake clock so the test does not sleep.
      await page.clock.install();
      await holdStorage(page, b.never);
      await openHud(page);
      await b.tap(page);
      await expect(page.getByTestId('waiting-card')).toBeVisible({ timeout: 300 });
      await expect(page.getByTestId('waiting-text')).toHaveText(WAITING);
      await page.clock.fastForward(10_000);
      await expect(page.getByTestId('waiting-text')).toHaveText(CANNOT_LOAD);
      await fingerTap(page, '[data-testid="waiting-back"]');
      await expect(page.getByTestId('waiting-card')).toHaveCount(0);
    });
  }
});

test.describe('AC-R1: normal storage opens every button on the first tap', () => {
  for (const b of BUTTONS) {
    test(`${b.name}: one tap, no waiting card`, async ({ page }) => {
      await page.goto('/');
      await page.waitForFunction(() => (window as unknown as { __dino?: { ready?: () => boolean } }).__dino?.ready?.() === true);
      await b.tap(page);
      await b.opened(page);
      await expect(page.getByTestId('waiting-card')).toHaveCount(0);
    });
  }
});

test.describe('AC-R1: Pauze and Winkel open at once in every case', () => {
  const cases: { name: string; hold: StorageHold | null }[] = [
    { name: 'normal storage', hold: null },
    { name: 'storage held 2 s', hold: { kind: 'open', ms: HELD_MS } },
    { name: 'storage that never answers', hold: { kind: 'open-never' } },
  ];
  for (const c of cases) {
    test(`Pauze opens on the first tap with ${c.name}`, async ({ page }) => {
      if (c.hold) await holdStorage(page, c.hold);
      await openHud(page);
      await fingerTap(page, '[data-testid="hud-pause"]');
      await expect(page.getByRole('dialog', { name: 'Pauze' })).toBeVisible();
      await expect(page.getByTestId('waiting-card')).toHaveCount(0);
    });
    test(`Winkel opens on the first tap with ${c.name}`, async ({ page }) => {
      if (c.hold) await holdStorage(page, c.hold);
      await openHud(page);
      await fingerTap(page, '[data-testid="hud-winkel"]');
      await expect(page.getByRole('dialog', { name: 'Dinowinkel' })).toBeVisible();
      await expect(page.getByTestId('waiting-card')).toHaveCount(0);
    });
  }
});
