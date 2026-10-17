import { expect, test } from '@playwright/test';
import { asInsecure, openApp } from './helpers/app';

test('opens in the iPad and shows the title', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText('Dino Blokwereld').first()).toBeVisible();
  const size = page.viewportSize();
  expect(size && size.width > size.height).toBe(true);
});

test('reports whether WebGL is available in headless WebKit', async ({ page }, testInfo) => {
  await openApp(page);
  const webgl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    return { webgl2: !!c.getContext('webgl2'), webgl1: !!document.createElement('canvas').getContext('webgl') };
  });
  const text = `WebGL in headless WebKit: webgl2=${webgl.webgl2}, webgl1=${webgl.webgl1}`;
  console.log(text);
  testInfo.annotations.push({ type: 'webgl', description: text });
});

test('asInsecure removes the secure only APIs', async ({ page }) => {
  await asInsecure(page);
  await openApp(page);
  const r = await page.evaluate(() => ({
    secure: window.isSecureContext,
    subtle: typeof crypto.subtle,
    sw: typeof navigator.serviceWorker,
    share: typeof navigator.share,
  }));
  expect(r).toEqual({ secure: false, subtle: 'undefined', sw: 'undefined', share: 'undefined' });
});

test('makes no request outside its own address', async ({ page, baseURL }) => {
  const foreign: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith(baseURL!) && !url.startsWith('data:') && !url.startsWith('blob:')) foreign.push(url);
  });
  await openApp(page);
  expect(foreign).toEqual([]);
});
