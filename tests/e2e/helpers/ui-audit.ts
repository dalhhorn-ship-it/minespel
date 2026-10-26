// Shared code for the UI review specs (kid-ui-reviewer rules live here and in ui-review.spec.ts).
// ui-review.spec.ts: every screen at four sizes, one boot per size.
// ui-review-sessions.spec.ts: practice and break session walks, one boot per test.
// ui-review-taps.spec.ts: portrait and real finger taps, one boot per test.
//
// No fixed waits (R2e): every wait is on the screen hook, an element, or the animations being finished.
import { expect, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { EGG_HATCH_SECONDS } from '../../../src/dinos/egg';
import { answerGateQuestion, openApp, readState } from './app';
import apostrofTopic from '../../../docs/modules/cito-taalverzorging/apostrof.json' with { type: 'json' };
import kommaTopic from '../../../docs/modules/cito-taalverzorging/komma.json' with { type: 'json' };

/** Screenshots go here. Playwright creates the folder. Run from the repo root. */
export const OUT = 'test-results/screenshots/ui-review';
export const SHOTS = OUT;

/** The three target iPads, plus a Safari tab with its toolbars (about 70 points are gone). */
export const SIZES = [
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1180x820', width: 1180, height: 820 },
  { name: '1366x1024', width: 1366, height: 1024 },
  { name: '1024x690-safari', width: 1024, height: 690 },
] as const;

/** An iPad home screen web app: status bar on top, home indicator below. Chromium has no env(), so we set the tokens. */
export const SAFE = { top: 24, bottom: 20, left: 0, right: 0 };

export type Kind =
  | 'outside-viewport'
  | 'outside-safe-area'
  | 'too-small'
  | 'too-close'
  | 'covered'
  | 'text-clipped'
  | 'h-scroll'
  | 'small-text'
  | 'main-too-small'
  | 'no-back';

export interface Finding {
  kind: Kind;
  el: string;
  detail: string;
}

export interface AuditOptions {
  /** Only look inside these roots. Default: everything except the HUD behind an overlay. */
  scope: string | null;
  /** Lists that may scroll. Things inside may be out of view, but the list itself must fit. */
  scrollOk: string[];
  /** Main action buttons: at least 56 points. */
  main: string;
  /** Check text size of kid text (17 points). Off for the parent area. */
  kidText: boolean;
  safe: typeof SAFE;
}

// ---------------------------------------------------------------- the in page audit

export function auditInPage(opts: AuditOptions): { findings: Finding[]; tappables: Array<Record<string, unknown>> } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const TAPPABLE = 'button, a[href], [role="button"], input, select, textarea, summary';
  const findings: Finding[] = [];
  const eps = 0.5;

  const describe = (e: Element): string => {
    const t = (e.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
    const cls = typeof (e as HTMLElement).className === 'string' ? (e as HTMLElement).className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    const aria = e.getAttribute('aria-label');
    return `${e.tagName.toLowerCase()}${cls ? '.' + cls : ''}${t ? ` "${t}"` : aria ? ` [${aria}]` : ''}`;
  };
  const visible = (e: Element): boolean => {
    const r = e.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cv = (e as HTMLElement).checkVisibility;
    if (typeof cv === 'function') {
      return (e as HTMLElement).checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    }
    const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const scopeRoots = opts.scope ? [...document.querySelectorAll(opts.scope)] : [document.body];
  const inScope = (e: Element): boolean => {
    if (!scopeRoots.some((r) => r.contains(e))) return false;
    // A layer behind an overlay is not what the kid sees.
    if (!opts.scope && e.closest('.hud')) return false;
    return true;
  };
  const inScrollOk = (e: Element): Element | null => {
    for (const sel of opts.scrollOk) {
      const c = e.closest(sel);
      if (c && c !== e) return c;
    }
    return null;
  };
  const clipRect = (e: Element): DOMRect | null => {
    // The visible part of the element inside every ancestor that clips.
    let top = 0;
    let left = 0;
    let right = vw;
    let bottom = vh;
    for (let p = e.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const r = p.getBoundingClientRect();
        top = Math.max(top, r.top);
        left = Math.max(left, r.left);
        right = Math.min(right, r.right);
        bottom = Math.min(bottom, r.bottom);
      }
    }
    return new DOMRect(left, top, right - left, bottom - top);
  };

  const all = [...document.querySelectorAll(TAPPABLE)].filter((e) => inScope(e) && visible(e));
  const tappables: Array<Record<string, unknown>> = [];

  for (const e of all) {
    const r = e.getBoundingClientRect();
    const name = describe(e);
    const list = inScrollOk(e);
    tappables.push({ el: name, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), inList: !!list });

    // 1. In the viewport (things in a scroll list may be below the fold)
    if (list) {
      // A list may scroll up and down, never sideways: a card cut off on the right is a real problem.
      const clipH = clipRect(e)!;
      if (r.left < -eps || r.right > vw + eps || r.left < clipH.left - eps || r.right > clipH.right + eps) {
        findings.push({ kind: 'outside-viewport', el: name, detail: `cut off sideways: box ${Math.round(r.left)} to ${Math.round(r.right)}, visible ${Math.round(clipH.left)} to ${Math.round(clipH.right)}` });
      }
    }
    if (!list) {
      const clip = clipRect(e);
      const out =
        r.left < -eps || r.top < -eps || r.right > vw + eps || r.bottom > vh + eps ||
        (clip && (r.left < clip.left - eps || r.right > clip.right + eps || r.top < clip.top - eps || r.bottom > clip.bottom + eps));
      if (out) {
        findings.push({ kind: 'outside-viewport', el: name, detail: `box ${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)} in ${vw}x${vh}` });
      } else if (r.top < opts.safe.top - eps || r.bottom > vh - opts.safe.bottom + eps || r.left < opts.safe.left - eps || r.right > vw - opts.safe.right + eps) {
        findings.push({ kind: 'outside-safe-area', el: name, detail: `box ${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)}, safe top ${opts.safe.top} bottom ${opts.safe.bottom}` });
      }
    }

    // 2. Size
    if (r.width < 44 - eps || r.height < 44 - eps) {
      findings.push({ kind: 'too-small', el: name, detail: `${Math.round(r.width)}x${Math.round(r.height)}` });
    }
    if (opts.main && e.matches(opts.main) && (r.width < 56 - eps || r.height < 56 - eps)) {
      findings.push({ kind: 'main-too-small', el: name, detail: `${Math.round(r.width)}x${Math.round(r.height)}` });
    }

    // 3. Covered by something else at its centre
    if (!list || (r.top >= 0 && r.bottom <= vh)) {
      const cx = Math.min(Math.max(r.left + r.width / 2, 0), vw - 1);
      const cy = Math.min(Math.max(r.top + r.height / 2, 0), vh - 1);
      const top = document.elementFromPoint(cx, cy);
      if (top && top !== e && !e.contains(top) && !top.contains(e)) {
        findings.push({ kind: 'covered', el: name, detail: `covered by ${describe(top)} at ${Math.round(cx)},${Math.round(cy)}` });
      }
    }
  }

  // 4. Space between neighbours (8 points) and overlap
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i]!;
      const b = all[j]!;
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const dx = Math.max(rb.left - ra.right, ra.left - rb.right, 0);
      const dy = Math.max(rb.top - ra.bottom, ra.top - rb.bottom, 0);
      const gap = Math.hypot(dx, dy);
      // Hidden scroll content far away is not a neighbour.
      if (gap < 8 - eps) {
        const overlapping = dx === 0 && dy === 0 && rb.left < ra.right - eps && ra.left < rb.right - eps && rb.top < ra.bottom - eps && ra.top < rb.bottom - eps;
        findings.push({
          kind: 'too-close',
          el: `${describe(a)} <> ${describe(b)}`,
          detail: overlapping ? 'overlap' : `gap ${gap.toFixed(1)}`,
        });
      }
    }
  }

  // 5. Text and panels
  const textEls = [...document.querySelectorAll('h1, h2, h3, p, span, label, strong, li, div, button')].filter((e) => {
    if (!inScope(e) || !visible(e)) return false;
    return [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '');
  });
  for (const e of textEls) {
    const h = e as HTMLElement;
    const cs = getComputedStyle(h);
    const list = inScrollOk(e);
    // Text wider or taller than its own box, when the box clips it.
    const clipsX = cs.overflowX !== 'visible';
    const clipsY = cs.overflowY !== 'visible';
    const wide = h.scrollWidth > h.clientWidth + 1 && h.clientWidth > 0;
    const tall = h.scrollHeight > h.clientHeight + 1 && h.clientHeight > 0;
    const isScroller = (cs.overflowX === 'auto' || cs.overflowX === 'scroll') ;
    if ((wide && (clipsX && !isScroller)) || (tall && clipsY && cs.overflowY === 'hidden') || (cs.textOverflow === 'ellipsis' && wide)) {
      findings.push({ kind: 'text-clipped', el: describe(e), detail: `scroll ${h.scrollWidth}x${h.scrollHeight} in ${h.clientWidth}x${h.clientHeight}` });
    }
    // Text partly off the screen (not in a scroll list)
    if (!list) {
      const range = document.createRange();
      range.selectNodeContents(h);
      const r = range.getBoundingClientRect();
      if (r.width > 0 && (r.right > vw + 1 || r.left < -1 || r.bottom > vh + 1 || r.top < -1)) {
        findings.push({ kind: 'text-clipped', el: describe(e), detail: `text box ${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)} leaves ${vw}x${vh}` });
      }
    }
    if (opts.kidText) {
      const fs = parseFloat(cs.fontSize);
      const t = (h.textContent ?? '').trim();
      if (fs < 17 - 0.01 && t.length > 0 && !list?.matches('.ignore-text-size')) {
        findings.push({ kind: 'small-text', el: describe(e), detail: `${fs}px` });
      }
    }
  }

  // 6. Panels that do not fit, and page scroll sideways
  const panels = [...document.querySelectorAll('[role="dialog"], .pause-card, .grid-panel, .parent-gate-card, .break-screen, .parent-shell')].filter((e) => inScope(e) && visible(e));
  for (const p of panels) {
    const r = p.getBoundingClientRect();
    if (r.left < -eps || r.top < -eps || r.right > vw + eps || r.bottom > vh + eps) {
      findings.push({ kind: 'outside-viewport', el: describe(p) + ' (panel)', detail: `box ${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)} in ${vw}x${vh}` });
    }
  }
  const se = document.scrollingElement;
  if (se && se.scrollWidth > vw + 1) findings.push({ kind: 'h-scroll', el: 'document', detail: `${se.scrollWidth} > ${vw}` });

  // Dedupe
  const seen = new Set<string>();
  const unique = findings.filter((f) => {
    const k = `${f.kind}|${f.el}|${f.detail}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { findings: unique, tappables };
}

// ---------------------------------------------------------------- waits (no fixed sleeps)

/**
 * Waits until every animation and transition that has an end is finished, so the screen holds still
 * before we measure it, shoot it or tap it. Animations that loop forever on purpose (the countdown
 * pulse, a dancing villager) are not waited for: they never finish.
 */
export async function waitSettled(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const forever = (a: Animation): boolean => a.effect?.getComputedTiming().iterations === Infinity;
      const all = document.getAnimations();
      return all.every((a) => {
        if (a.playState === 'finished' || a.playState === 'idle') return true;
        if (forever(a)) return true;
        // A transition on an element that also has a looping animation never starts: the loop wins.
        const target = (a.effect as KeyframeEffect | null)?.target;
        return a instanceof CSSTransition && !!target && all.some((o) => forever(o) && (o.effect as KeyframeEffect | null)?.target === target);
      });
    },
    undefined,
    { polling: 'raf' },
  );
}

/** Waits until the screen hook says `name`, then until the animations are finished. */
export async function waitScreen(page: Page, name: string): Promise<void> {
  await expect.poll(() => screen(page), { message: `screen ${name}`, intervals: [20, 40, 80, 160] }).toBe(name);
  await waitSettled(page);
}

// ---------------------------------------------------------------- helpers

export async function tapCenter(page: Page, selector: string, nth = 0): Promise<void> {
  const loc = page.locator(selector).nth(nth);
  await loc.waitFor({ state: 'visible', timeout: 5000 });
  await waitSettled(page);
  const box = await loc.boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  // A real touch at the centre: whatever is on top gets it, like a kid's thumb.
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

export async function tapText(page: Page, text: string | RegExp, scope = 'body'): Promise<void> {
  const loc = page.locator(`${scope} button`, { hasText: text }).filter({ visible: true }).first();
  await loc.waitFor({ state: 'visible', timeout: 5000 });
  await waitSettled(page);
  const box = await loc.boundingBox();
  if (!box) throw new Error(`no box for ${String(text)}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

export async function screen(page: Page): Promise<string> {
  return readState<string>(page, 'currentScreen');
}

export const MAIN_KID =
  '.pause-btn-primary, .break-next-btn, .teach-done, .summary-done-btn, .lesson-next, .shop-close-btn, .grid-close, .dino-menu-btn-close, .parent-close-btn, .kb-done, .q-done, .lesboek-override-btn, .countdown-now-btn';

export async function openShopWithPoints(page: Page, points = 200): Promise<void> {
  await readState(page, 'setPoints', points);
  await readState(page, 'openShop');
  await page.getByRole('dialog', { name: 'Dinowinkel' }).waitFor();
  await waitSettled(page);
}

export async function hatchDino(page: Page): Promise<string> {
  await readState(page, 'addEgg', 'triceratops', false);
  await readState(page, 'stepDinos', EGG_HATCH_SECONDS + 0.2);
  const dinos = await readState<Array<{ id: string }>>(page, 'dinos');
  return dinos[0]!.id;
}

export async function openGate(page: Page): Promise<void> {
  await readState(page, 'openParentControls');
  await page.locator('.parent-gate').waitFor();
  await waitSettled(page);
}

export async function typePin(page: Page, pin: string): Promise<void> {
  for (const d of pin) await tapCenter(page, `.parent-gate-key[data-key="${d}"]`);
}

/**
 * Opens the parent area. First start (no PIN yet): the gate asks a sum, then for a new PIN twice.
 * Once a PIN exists (a screen before this one made it, one boot per size) the gate asks for it once.
 */
export async function openShell(page: Page, section?: string): Promise<void> {
  await openGate(page);
  await page.locator('.parent-input, .parent-gate-key[data-key="1"]').first().waitFor();
  if (await page.locator('.parent-input').isVisible()) {
    await answerGateQuestion(page);
    await page.locator('.parent-gate-key[data-key="1"]').waitFor();
    await typePin(page, '1234');
    await typePin(page, '1234');
  } else {
    await typePin(page, '1234');
  }
  await page.locator('[data-testid="parent-shell"]').waitFor();
  if (section) {
    await tapCenter(page, `.parent-nav-btn[data-section="${section}"]`);
  }
  await waitSettled(page);
}

// ---------------------------------------------------------------- allowed

export interface Allowed {
  screen: RegExp;
  size: RegExp;
  kind: Kind;
  reason: string;
}

export const ALLOWED: Allowed[] = [
  { screen: /^(dinowinkel|lesboek)/, size: /safari/, kind: 'text-clipped', reason: 'decision 54: in a Safari tab the shop and Lesboek may scroll' },
];

export function isKnown(screenId: string, sizeName: string, f: Finding): Allowed | undefined {
  return ALLOWED.find((k) => k.screen.test(screenId) && k.size.test(sizeName) && k.kind === f.kind);
}

// ---------------------------------------------------------------- running a screen

/** Opens the app (or reloads it) and waits for the e2e ready hook and the world. */
export async function prepare(page: Page): Promise<void> {
  await openApp(page);
  // iPad home screen app: status bar and home indicator. Chromium has no env(), so set the tokens.
  await page.addStyleTag({
    content: `:root{--safe-top:${SAFE.top}px;--safe-bottom:${SAFE.bottom}px;--safe-left:${SAFE.left}px;--safe-right:${SAFE.right}px}`,
  });
  await waitScreen(page, 'world');
}

export interface ScreenAuditDef {
  scope?: string;
  scrollOk?: string[];
  main?: string;
  kidText?: boolean;
}

export async function auditNow(page: Page, def: ScreenAuditDef): Promise<{ findings: Finding[]; tappables: Array<Record<string, unknown>> }> {
  return page.evaluate(auditInPage, {
    scope: def.scope ?? null,
    // Lesson and teach moment text scroll on purpose inside their own panel; the main button stays outside (F5, F6).
    scrollOk: [...(def.scrollOk ?? []), '.teach-scroll', '.lesson-body'],
    main: def.main ?? '',
    kidText: def.kidText ?? true,
    safe: SAFE,
  });
}

export function shot(sizeName: string, id: string): string {
  return `${OUT}/${sizeName}-${id}.png`;
}

/** Everything that can be measured, as one list of readable problems per check. */
export function assertClean(screenId: string, sizeName: string, findings: Finding[]): void {
  const unknown = findings.filter((f) => !isKnown(screenId, sizeName, f));
  const byKind = new Map<Kind, string[]>();
  for (const f of unknown) {
    byKind.set(f.kind, [...(byKind.get(f.kind) ?? []), `${f.el}: ${f.detail}`]);
  }
  for (const kind of ['outside-viewport', 'outside-safe-area', 'too-small', 'main-too-small', 'too-close', 'covered', 'text-clipped', 'h-scroll', 'small-text', 'no-back'] as Kind[]) {
    expect.soft(byKind.get(kind) ?? [], `${kind} on ${screenId} at ${sizeName}`).toEqual([]);
  }
}

// ---------------------------------------------------------------- one boot per size

/** One page for a whole size group. Made in beforeAll, closed in afterAll. */
export interface SizeBoot {
  context: BrowserContext;
  page: Page;
  /** The start state that every screen test returns to (hotbar, selected slot, mode, points). */
  start: { build: unknown; points: number };
}

export async function bootSize(browser: Browser, testInfo: TestInfo, size: (typeof SIZES)[number]): Promise<SizeBoot> {
  // Same device as the project (touch, scale, user agent), only the size changes.
  const use = testInfo.project.use;
  const context = await browser.newContext({
    baseURL: use.baseURL,
    userAgent: use.userAgent,
    deviceScaleFactor: use.deviceScaleFactor,
    isMobile: use.isMobile,
    hasTouch: use.hasTouch,
    viewport: { width: size.width, height: size.height },
  });
  const page = await context.newPage();
  await prepare(page);
  const build = await readState(page, 'buildState');
  const points = await readState<number>(page, 'points');
  return { context, page, start: { build, points } };
}

/**
 * Every screen test starts in the world with the start state. If a screen is still open (it cannot be
 * closed on purpose, or an earlier test failed half way) the page is reloaded; the saved data stays.
 */
export async function backToWorld(boot: SizeBoot): Promise<void> {
  const { page } = boot;
  let where = '';
  try {
    where = await screen(page);
  } catch {
    where = 'broken';
  }
  if (where !== 'world') {
    await prepare(page);
  } else {
    await waitSettled(page);
  }
  await readState(page, 'setBuildState', boot.start.build);
  await readState(page, 'setPoints', boot.start.points);
  await readState(page, 'resetPlayTimer');
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      const h = el as HTMLElement;
      if (h.scrollTop) h.scrollTop = 0;
    }
  });
  await waitSettled(page);
}

// ---------------------------------------------------------------- practice and break sessions

export interface WalkSeen {
  key: string;
  file: string;
  findings: Finding[];
}

interface JsonItem {
  prompt?: string;
  type: string;
  options?: string[];
  answer: number | number[] | string[];
  words?: string[];
}

const TOPICS: Record<string, unknown> = { apostrof: apostrofTopic, komma: kommaTopic };



/** Every question of a topic file, found by shape, so the walker can answer right on purpose. */
function loadItems(topic: string): JsonItem[] {
  const out: JsonItem[] = [];
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) {
      for (const x of o) {
        if (x && typeof x === 'object' && 'type' in x && 'answer' in x && 'prompt' in x) out.push(x as JsonItem);
        else walk(x);
      }
    } else if (o && typeof o === 'object') {
      for (const v of Object.values(o)) walk(v);
    }
  };
  walk(TOPICS[topic]);
  return out;
}

type QKind = 'choice' | 'find-error' | 'punctuate' | 'type' | 'number';

export async function currentQuestion(page: Page): Promise<{ kind: QKind; prompt: string } | null> {
  return page.evaluate(() => {
    const q = document.querySelector('.break-body .q-view, .break-body .type-view');
    if (!q) return null;
    const prompt = (document.querySelector('.break-body .q-prompt')?.textContent ?? '').trim();
    const cls = (q as HTMLElement).className;
    if (q.querySelector('.number-pad') || cls.includes('number')) return { kind: 'number' as const, prompt };
    if (cls.includes('q-choice')) return { kind: 'choice' as const, prompt };
    if (cls.includes('q-find-error')) return { kind: 'find-error' as const, prompt };
    if (cls.includes('q-punctuate')) return { kind: 'punctuate' as const, prompt };
    return { kind: 'type' as const, prompt };
  });
}

export async function phase(page: Page): Promise<string> {
  return page.evaluate(() => {
    if (document.querySelector('.break-summary')) return 'summary';
    if (document.querySelector('.teach-moment')) return 'teach';
    if (document.querySelector('.break-feedback-card')) return 'feedback';
    if (document.querySelector('.lesson-view')) return 'lesson';
    if (document.querySelector('.break-empty')) return 'empty';
    if (document.querySelector('.break-body .q-view, .break-body .type-view')) {
      return document.querySelector('.break-banner-wrong') ? 'retry' : 'question';
    }
    return 'none';
  });
}

async function typeText(page: Page, text: string, numeric: boolean): Promise<void> {
  for (const ch of text) {
    if (numeric) {
      const k = page.locator('.number-pad .kb-key', { hasText: new RegExp(`^${ch === '.' ? ',' : ch}$`) }).first();
      await k.click();
    } else if (ch === ' ') {
      await page.locator('.kid-keyboard .kb-space').first().click();
    } else {
      const k = page.locator('.kid-keyboard .kb-char', { hasText: new RegExp(`^${ch.toLowerCase()}$`, 'i') }).first();
      if ((await k.count()) === 0) continue;
      await k.click();
    }
  }
  await page.locator(numeric ? '.number-pad .kb-done' : '.kid-keyboard .kb-done').first().click();
}

/** Answers the question on screen. right = true uses the repo's own module files to find the right answer. */
export async function answer(page: Page, topic: string, right: boolean): Promise<void> {
  const q = await currentQuestion(page);
  if (!q) return;
  const items = loadItems(topic);
  const item = items.find((i) => (i.prompt ?? '').trim() === q.prompt);
  if (q.kind === 'choice') {
    const idx = right && item && typeof item.answer === 'number' ? item.answer : right ? 0 : 1;
    const wrongIdx = typeof item?.answer === 'number' ? ((item.answer + 1) % (item.options?.length ?? 2)) : 1;
    await page.locator('.q-option').nth(right ? idx : wrongIdx).click();
  } else if (q.kind === 'find-error') {
    if (right && item && typeof item.answer === 'number') {
      if (item.answer < 0) await page.locator('.q-none').click();
      else await page.locator('.q-word').nth(item.answer).click();
    } else {
      // Wrong on purpose: pick "Geen fout" when there is an error, else the first word.
      const hasErr = !item || (typeof item.answer === 'number' && item.answer >= 0);
      if (hasErr) await page.locator('.q-none').click();
      else await page.locator('.q-word').first().click();
    }
  } else if (q.kind === 'punctuate') {
    if (right && item && Array.isArray(item.answer)) {
      for (const gap of item.answer as number[]) await page.locator('.q-gap').nth(gap).click();
    }
    await page.locator('.q-done').click();
  } else if (q.kind === 'number') {
    const m = q.prompt.match(/^(\d+)\s*([+\-×x:÷])\s*(\d+)/);
    let val = 0;
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[3]);
      val = m[2] === '+' ? a + b : m[2] === '-' ? a - b : m[2] === ':' || m[2] === '÷' ? Math.round(a / b) : a * b;
    }
    await typeText(page, right ? String(val) : String(val + 1 > 0 ? val + 7 : 7), true);
  } else {
    const ans = right && item && Array.isArray(item.answer) ? String((item.answer as string[])[0] ?? 'a') : 'q';
    await typeText(page, ans, false);
  }
}


/** What the break screen shows right now. It changes whenever the kid can see something new. */
async function signature(page: Page): Promise<string> {
  const ph = await phase(page);
  const text = await page.evaluate(
    () =>
      (document.querySelector('.break-body .q-prompt')?.textContent ?? '') +
      '|' +
      ((document.querySelector('.lesson-view') as HTMLElement | null)?.innerText ?? '').slice(0, 200),
  );
  return `${ph}|${text}`;
}

/** Waits until the break screen shows something other than `before`, then until it holds still. */
async function waitNext(page: Page, before: string): Promise<void> {
  try {
    await expect.poll(() => signature(page), { timeout: 4000, intervals: [30, 60, 120] }).not.toBe(before);
  } catch {
    // Nothing new to see (for example a second try that looks the same): the walker looks again.
  }
  await waitSettled(page);
}

/** Waits for the first thing the break screen shows. */
async function waitForPhase(page: Page): Promise<void> {
  try {
    await expect.poll(() => phase(page), { timeout: 5000, intervals: [30, 60, 120] }).not.toBe('none');
  } catch {
    // The walker handles 'none' by looking again.
  }
  await waitSettled(page);
}

/**
 * Plays a whole session and saves one screenshot of every new phase and question type it meets.
 * Plan: question 1 right, question 2 wrong then right, question 3 wrong twice (teach moment), the rest right.
 */
export async function walkSession(page: Page, sizeName: string, prefix: string, topic: string, wanted: Set<string>, seen: Map<string, WalkSeen>): Promise<void> {
  let qNumber = 0;
  let triesOnThis = 0;
  let lastKey = '';
  for (let step = 0; step < 60; step++) {
    await waitForPhase(page);
    const ph = await phase(page);
    const q = ph === 'question' || ph === 'retry' ? await currentQuestion(page) : null;
    let key = ph;
    if (ph === 'question' || ph === 'retry') key = ph === 'retry' ? 'fout-opnieuw' : `vraag-${q?.kind}`;
    if (ph === 'teach') {
      const numeric = await page.locator('.teach-steps').count();
      key = numeric > 0 ? 'uitleg-voorbeeld' : 'uitleg-les';
    }
    if (ph === 'lesson') key = 'les';
    if (ph === 'feedback') key = 'goed';
    if (ph === 'summary') key = 'samenvatting';
    // Do not re-shoot the same look twice in a row at the same step.
    if (wanted.has(key) && !seen.has(key) && key !== lastKey) {
      const file = shot(sizeName, `${prefix}-${key}`);
      await page.screenshot({ path: file });
      const { findings } = await auditNow(page, { scope: undefined, scrollOk: [], main: MAIN_KID, kidText: true });
      seen.set(key, { key, file, findings });
    }
    lastKey = key;
    const before = await signature(page);

    if (ph === 'lesson') {
      for (let i = 0; i < 8; i++) {
        if ((await phase(page)) !== 'lesson') break;
        const pageBefore = await signature(page);
        const next = page.locator('.lesson-next').first();
        await next.click();
        await waitNext(page, pageBefore);
      }
    } else if (ph === 'question' || ph === 'retry') {
      if (ph === 'question') triesOnThis = 0;
      triesOnThis++;
      const idx = qNumber;
      const rightNow = idx === 0 || idx > 2 || (idx === 1 && triesOnThis >= 2);
      await answer(page, topic, rightNow);
      await waitNext(page, before);
    } else if (ph === 'feedback') {
      qNumber++;
      await page.locator('.break-next-btn').click();
      await waitNext(page, before);
    } else if (ph === 'teach') {
      qNumber++;
      await page.locator('.teach-done').click();
      await waitNext(page, before);
    } else if (ph === 'summary') {
      return;
    } else if (ph === 'empty') {
      return;
    }
  }
}

export const WANT = new Set(['les', 'vraag-choice', 'vraag-find-error', 'vraag-type', 'vraag-number', 'vraag-punctuate', 'fout-opnieuw', 'goed', 'uitleg-les', 'uitleg-voorbeeld', 'samenvatting']);

/** The findings of every screen a walk saw, grouped by kind, as soft assertions. */
export function assertWalkClean(label: string, sizeName: string, seen: Map<string, WalkSeen>, knownPrefix: string): void {
  const all: Finding[] = [];
  for (const s of seen.values()) for (const f of s.findings) if (!isKnown(`${knownPrefix}-${s.key}`, sizeName, f)) all.push({ ...f, el: `[${s.key}] ${f.el}` });
  const grouped = new Map<string, string[]>();
  for (const f of all) grouped.set(f.kind, [...(grouped.get(f.kind) ?? []), `${f.el}: ${f.detail}`]);
  for (const [kind, list] of grouped) expect.soft(list, `${kind} in ${label} at ${sizeName}`).toEqual([]);
}

// ---------------------------------------------------------------- real taps and flows

export async function reachTeachMoment(page: Page): Promise<void> {
  await readState(page, 'openPractice');
  await page.locator('[data-practice-topic="cito-taalverzorging:apostrof"]').scrollIntoViewIfNeeded();
  await tapCenter(page, '[data-practice-topic="cito-taalverzorging:apostrof"]');
  await page.locator('.break-screen').waitFor();
  for (let i = 0; i < 40; i++) {
    await waitForPhase(page);
    const ph = await phase(page);
    const before = await signature(page);
    if (ph === 'teach') return;
    if (ph === 'feedback') await page.locator('.break-next-btn').click();
    else if (ph === 'question' || ph === 'retry') await answer(page, 'apostrof', false);
    else if (ph === 'summary') throw new Error('session ended without a teach moment');
    await waitNext(page, before);
  }
  throw new Error('no teach moment reached');
}

/**
 * True when the app cancels a finger drag that starts on this element. On iOS a cancelled touchmove means
 * the page does not scroll. (Chromium here cannot swipe for real, so the drag is sent as an event.)
 */
export async function dragIsCancelled(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const target = document.querySelector(sel);
    if (!target) throw new Error(`no ${sel}`);
    const ev = new Event('touchmove', { bubbles: true, cancelable: true });
    target.dispatchEvent(ev);
    return ev.defaultPrevented;
  }, selector);
}
