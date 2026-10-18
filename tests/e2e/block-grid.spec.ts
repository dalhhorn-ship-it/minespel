import { expect, test, type Page } from '@playwright/test';
import { openApp } from './helpers/app';

async function openGrid(page: Page) {
  await page.evaluate(() => {
    const b = document.querySelector<HTMLElement>('.hotbar-all')!;
    const fire = (type: string) => b.dispatchEvent(new PointerEvent(type, { pointerId: 40, pointerType: 'touch', clientX: 5, clientY: 5, bubbles: true }));
    fire('pointerdown');
    fire('pointerup');
  });
  await expect(page.locator('.block-grid')).toBeVisible();
}

const labels = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll('.hotbar-slot')].map((b) => b.getAttribute('aria-label')));

for (const size of [{ width: 1024, height: 768 }, { width: 1180, height: 820 }]) {
  test(`Alle blokken fits without scrolling at ${size.width} x ${size.height} (AC155)`, async ({ page }) => {
    await page.setViewportSize(size);
    await openApp(page);
    await openGrid(page);
    const m = await page.evaluate(() => {
      const panel = document.querySelector('.grid-panel')!.getBoundingClientRect();
      const tiles = [...document.querySelectorAll<HTMLElement>('.grid-block')].map((t) => {
        const r = t.getBoundingClientRect();
        const name = t.querySelector<HTMLElement>('.grid-name')!;
        return {
          w: r.width, h: r.height, text: name.textContent,
          nameFits: name.scrollWidth <= name.clientWidth + 1 && t.scrollWidth <= t.clientWidth + 1,
          inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
        };
      });
      const slots = [...document.querySelectorAll('.grid-slot')].map((s) => s.getBoundingClientRect().bottom);
      const firstTile = document.querySelector('.grid-block')!.getBoundingClientRect().top;
      return {
        panel: { top: panel.top, bottom: panel.bottom },
        tiles, slots, firstTile, rows: document.querySelectorAll('.grid-row').length,
        scrolls: document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth,
        panelScrolls: document.querySelector('.grid-panel')!.scrollHeight > document.querySelector('.grid-panel')!.clientHeight + 1,
      };
    });
    expect(m.rows).toBe(4);
    expect(m.tiles).toHaveLength(32);
    expect(m.scrolls).toBe(false);
    expect(m.panelScrolls).toBe(false);
    expect(m.panel.top).toBeGreaterThanOrEqual(0);
    expect(m.panel.bottom).toBeLessThanOrEqual(size.height);
    for (const t of m.tiles) {
      expect(t.w).toBeGreaterThanOrEqual(64);
      expect(t.h).toBeGreaterThanOrEqual(64);
      expect(t.nameFits, t.text ?? '').toBe(true);
      expect(t.inside, t.text ?? '').toBe(true);
    }
    for (const b of m.slots) expect(b).toBeLessThanOrEqual(m.firstTile); // the slots sit above the tiles
    await expect(page.locator('.grid-slot[aria-pressed="true"]')).toHaveCount(1);
    for (const name of ['zandsteen', 'diepsteen', 'goudsteen', 'wol oranje']) {
      await expect(page.locator('.grid-block', { hasText: name })).toBeVisible();
    }
  });
}

test('slot 5 then diamant fills slot 5 and a second finger adds nothing (AC156)', async ({ page }) => {
  await openApp(page);
  const before = await labels(page);
  await openGrid(page);
  await page.waitForTimeout(400);
  const after = await page.evaluate(async () => {
    const fire = (el: Element, type: string, id: number) =>
      el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: 5, clientY: 5, bubbles: true }));
    const slot5 = document.querySelectorAll('.grid-slot')[4]!;
    fire(slot5, 'pointerdown', 50);
    fire(slot5, 'pointerup', 50);
    const tiles = [...document.querySelectorAll('.grid-block')];
    const diamant = tiles.find((t) => t.textContent === 'diamant')!;
    const other = tiles.find((t) => t.textContent === 'ijs')!;
    fire(diamant, 'pointerdown', 51); // finger one is down on diamant
    fire(other, 'pointerdown', 52); // finger two comes down on another tile
    fire(diamant, 'pointerup', 51);
    fire(other, 'pointerup', 52);
    return [...document.querySelectorAll('.hotbar-slot')].map((b) => b.getAttribute('aria-label'));
  });
  await expect(page.locator('.block-grid')).toBeHidden();
  expect(after[4]).toBe('diamant');
  after.forEach((l, i) => {
    if (i !== 4) expect(l).toBe(before[i]);
  });
  await expect(page.locator('.hotbar-slot').nth(4)).toHaveAttribute('aria-pressed', 'true');
});
