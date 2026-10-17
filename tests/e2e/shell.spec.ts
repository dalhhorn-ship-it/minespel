import { expect, test } from '@playwright/test';
import { openApp, readState } from './helpers/app';

test.describe('iPad shell', () => {
  test('viewport meta blocks zoom and uses the full screen (AC10)', async ({ page }) => {
    await openApp(page);
    const content = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(content).toContain('user-scalable=no');
    expect(content).toContain('maximum-scale=1');
    expect(content).toContain('viewport-fit=cover');
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  });

  test('game areas have no touch action, selection or callout (AC10)', async ({ page }) => {
    await openApp(page);
    const css = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return {
        touchAction: s.touchAction,
        userSelect: s.userSelect || s.getPropertyValue('-webkit-user-select'),
        webkitUserSelect: s.getPropertyValue('-webkit-user-select'),
        callout: s.getPropertyValue('-webkit-touch-callout'),
        font: s.fontFamily,
      };
    });
    expect(css.touchAction).toBe('none');
    expect([css.userSelect, css.webkitUserSelect]).toContain('none');
    expect(css.callout).toBe('none');
    expect(css.font).toContain('Nunito');
  });

  test('gesturestart, double click and the context menu are prevented (AC10)', async ({ page }) => {
    await openApp(page);
    const result = await page.evaluate(() =>
      ['gesturestart', 'dblclick', 'contextmenu'].map((type) => {
        const e = new Event(type, { bubbles: true, cancelable: true });
        document.body.dispatchEvent(e);
        return e.defaultPrevented;
      }),
    );
    expect(result).toEqual([true, true, true]);
  });

  test('landscape shows no overlay', async ({ page }) => {
    await openApp(page);
    await expect(page.getByText('Draai je iPad')).toBeHidden();
    await expect(page.getByText('Maak dit venster groter')).toBeHidden();
    expect(await readState(page, 'screenGuard')).toEqual({ portrait: false, tooSmall: false });
  });

  test('a window under 900 wide shows only "Maak dit venster groter" and restores (AC108)', async ({ page }) => {
    await openApp(page);
    const original = page.viewportSize()!;
    await page.setViewportSize({ width: 800, height: 600 });
    await expect(page.getByText('Maak dit venster groter')).toBeVisible();
    await expect(page.getByText('Draai je iPad')).toBeHidden();
    expect(await readState(page, 'screenGuard')).toEqual({ portrait: false, tooSmall: true });
    await page.setViewportSize(original);
    await expect(page.getByText('Maak dit venster groter')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Dino Blokwereld' })).toBeVisible();
  });

  test('sound is locked until the first tap (AC100)', async ({ page }) => {
    await openApp(page);
    expect(await readState(page, 'audioUnlocked')).toBe(false);
    await page.touchscreen.tap(200, 200);
    await expect.poll(() => readState(page, 'audioUnlocked')).toBe(true);
  });

  test('portrait shows only "Draai je iPad" @portrait', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('heading', { name: 'Draai je iPad' })).toBeVisible();
    await expect(page.getByText('Maak dit venster groter')).toBeHidden();
    expect(await readState(page, 'screenGuard')).toEqual({ portrait: true, tooSmall: false });
    const size = page.viewportSize()!;
    await page.setViewportSize({ width: size.height, height: size.width });
    await expect(page.getByText('Draai je iPad')).toBeHidden();
  });

  test('layout fits the iPad Pro 11 landscape without overlay @layout', async ({ page }) => {
    await openApp(page);
    await expect(page.getByText('Draai je iPad')).toBeHidden();
    await expect(page.getByText('Maak dit venster groter')).toBeHidden();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('manifest and icons are served', async ({ page, request }) => {
    await openApp(page);
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBe(true);
    const manifest = await res.json();
    expect(manifest.display).toBe('standalone');
    for (const icon of manifest.icons) {
      expect((await request.get('/' + icon.src)).ok()).toBe(true);
    }
  });
});
