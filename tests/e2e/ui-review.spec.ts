// UI review (kid-ui-reviewer). Opens every screen at four iPad landscape sizes, saves a screenshot
// to docs/screenshots/ui-review/<size>-<screen>.png and measures every tappable thing:
// inside the viewport and the safe area, at least 44 x 44, at least 8 points between neighbours,
// not covered by another element, text not clipped, no horizontal scroll, a way back, back in 2 taps.
//
// Every finding F1 to F14 in docs/UI_REVIEW.md is fixed, so nothing is filtered out any more.
// The one allowance (ALLOWED) is decision 54: in a Safari tab (1024x690) the shop and Lesboek may scroll.
//
import { expect, test, type Page } from '@playwright/test';
import { EGG_HATCH_SECONDS } from '../../src/dinos/egg';
import { answerGateQuestion, openApp, readState } from './helpers/app';
import apostrofTopic from '../../docs/modules/cito-taalverzorging/apostrof.json' with { type: 'json' };
import kommaTopic from '../../docs/modules/cito-taalverzorging/komma.json' with { type: 'json' };

/** Screenshots go here. Playwright creates the folder. Run from the repo root. */
const OUT = 'docs/screenshots/ui-review';
const SHOTS = OUT;

/** The three target iPads, plus a Safari tab with its toolbars (about 70 points are gone). */
const SIZES = [
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1180x820', width: 1180, height: 820 },
  { name: '1366x1024', width: 1366, height: 1024 },
  { name: '1024x690-safari', width: 1024, height: 690 },
] as const;

/** An iPad home screen web app: status bar on top, home indicator below. Chromium has no env(), so we set the tokens. */
const SAFE = { top: 24, bottom: 20, left: 0, right: 0 };

type Kind =
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

interface Finding {
  kind: Kind;
  el: string;
  detail: string;
}

interface AuditOptions {
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

function auditInPage(opts: AuditOptions): { findings: Finding[]; tappables: Array<Record<string, unknown>> } {
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

// ---------------------------------------------------------------- helpers

async function tapCenter(page: Page, selector: string, nth = 0): Promise<void> {
  const loc = page.locator(selector).nth(nth);
  await loc.waitFor({ state: 'visible', timeout: 5000 });
  const box = await loc.boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  // A real touch at the centre: whatever is on top gets it, like a kid's thumb.
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

async function tapText(page: Page, text: string | RegExp, scope = 'body'): Promise<void> {
  const loc = page.locator(`${scope} button`, { hasText: text }).filter({ visible: true }).first();
  await loc.waitFor({ state: 'visible', timeout: 5000 });
  const box = await loc.boundingBox();
  if (!box) throw new Error(`no box for ${String(text)}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

async function screen(page: Page): Promise<string> {
  return readState<string>(page, 'currentScreen');
}

async function settle(page: Page, ms = 350): Promise<void> {
  await page.waitForTimeout(ms);
}

// ---------------------------------------------------------------- the screens

interface ScreenDef {
  id: string;
  /** What the kid or parent sees. Group names the section of the report. */
  group: 'wereld' | 'menu' | 'winkel' | 'leren' | 'dino' | 'ouders';
  open: (page: Page, ctx: Ctx) => Promise<void>;
  scope?: string;
  scrollOk?: string[];
  main?: string;
  kidText?: boolean;
  /** Selector of the visible back or close control. null for the world and for screens that cannot be closed on purpose. */
  back?: string | null;
  /** Taps that bring the kid back to the world. Runs after the screenshot. */
  backTaps?: (page: Page) => Promise<void>;
  /** Why there is no way back on purpose. */
  noBackReason?: string;
}

interface Ctx {
  size: (typeof SIZES)[number];
}

const MAIN_KID =
  '.pause-btn-primary, .break-next-btn, .teach-done, .summary-done-btn, .lesson-next, .shop-close-btn, .grid-close, .dino-menu-btn-close, .parent-close-btn, .kb-done, .q-done, .lesboek-override-btn, .countdown-now-btn';

async function openShopWithPoints(page: Page, points = 200): Promise<void> {
  await readState(page, 'setPoints', points);
  await readState(page, 'openShop');
  await page.getByRole('dialog', { name: 'Dinowinkel' }).waitFor();
  await settle(page);
}

async function hatchDino(page: Page): Promise<string> {
  await readState(page, 'addEgg', 'triceratops', false);
  await readState(page, 'stepDinos', EGG_HATCH_SECONDS + 0.2);
  const dinos = await readState<Array<{ id: string }>>(page, 'dinos');
  return dinos[0]!.id;
}

async function openGate(page: Page): Promise<void> {
  await readState(page, 'openParentControls');
  await page.locator('.parent-gate').waitFor();
  await settle(page);
}

async function typePin(page: Page, pin: string): Promise<void> {
  for (const d of pin) await tapCenter(page, `.parent-gate-key[data-key="${d}"]`);
}

/** First start: no PIN yet, so the gate asks for a new one. Then the shell opens. */
async function openShell(page: Page, section?: string): Promise<void> {
  await openGate(page);
  await answerGateQuestion(page);
  await page.locator('.parent-gate-key[data-key="1"]').waitFor();
  await typePin(page, '1234');
  await typePin(page, '1234');
  await page.locator('[data-testid="parent-shell"]').waitFor();
  if (section) {
    await tapCenter(page, `.parent-nav-btn[data-section="${section}"]`);
  }
  await settle(page);
}

const CLOSE_PARENT = async (page: Page) => {
  await tapCenter(page, '.parent-close-btn');
};

const SCREENS: ScreenDef[] = [
  // ---- the world
  {
    id: 'wereld-hud',
    group: 'wereld',
    scope: 'body',
    open: async (page) => {
      await settle(page, 800);
    },
    main: '.countdown-now-btn',
    back: null,
    noBackReason: 'This is the world.',
  },
  {
    id: 'wereld-aftellen-waarschuwing',
    group: 'wereld',
    scope: 'body',
    open: async (page) => {
      await readState(page, 'setPlayRemainingMs', 25_000);
      await readState(page, 'stepTimer');
      await settle(page, 600);
    },
    back: null,
    noBackReason: 'This is the world.',
  },
  {
    id: 'wereld-bouwen',
    group: 'wereld',
    scope: 'body',
    open: async (page) => {
      await tapText(page, 'Bouwen', '.hud');
      await settle(page);
    },
    back: null,
    noBackReason: 'This is the world.',
  },
  {
    id: 'alle-blokken',
    group: 'menu',
    scope: '.block-grid',
    scrollOk: ['.grid-cells'],
    main: '.grid-close',
    back: '.grid-close',
    open: async (page) => {
      await tapCenter(page, '.hotbar-all');
      await page.locator('.block-grid:not([hidden])').waitFor();
      await settle(page);
    },
    backTaps: async (page) => {
      await tapCenter(page, '.grid-close');
    },
  },
  {
    id: 'alle-blokken-vakje-kiezen',
    group: 'menu',
    scope: '.block-grid',
    scrollOk: ['.grid-cells'],
    main: '.grid-close',
    back: '.grid-close',
    open: async (page) => {
      await tapCenter(page, '.hotbar-all');
      await page.locator('.block-grid:not([hidden])').waitFor();
      await tapCenter(page, '[data-testid="grid-slot-7"]');
      await tapCenter(page, '[data-testid="grid-cat-wool"]');
      await settle(page);
    },
    backTaps: async (page) => {
      await tapCenter(page, '.grid-close');
    },
  },
  {
    id: 'pauze',
    group: 'menu',
    main: '.pause-btn-primary',
    back: '.pause-btn-primary',
    open: async (page) => {
      await readState(page, 'setPoints', 24);
      await readState(page, 'openPauseMenu');
      await page.locator('.pause-card').waitFor();
      await settle(page);
    },
    backTaps: async (page) => {
      await tapText(page, 'Terug naar de wereld');
    },
  },
  // ---- the shop
  {
    id: 'dinowinkel',
    group: 'winkel',
    main: '.shop-close-btn',
    scrollOk: ['.shop-grid', '.shop-collection-list'],
    back: '.shop-close-btn',
    open: async (page) => {
      await openShopWithPoints(page, 200);
    },
    backTaps: async (page) => {
      await tapCenter(page, '.shop-close-btn');
    },
  },
  {
    id: 'dinowinkel-weinig-punten',
    group: 'winkel',
    main: '.shop-close-btn',
    scrollOk: ['.shop-grid', '.shop-collection-list'],
    back: '.shop-close-btn',
    open: async (page) => {
      await openShopWithPoints(page, 45);
    },
    backTaps: async (page) => {
      await tapCenter(page, '.shop-close-btn');
    },
  },
  {
    id: 'dinowinkel-kippenhok-onderaan',
    group: 'winkel',
    main: '.shop-close-btn',
    scrollOk: ['.shop-grid', '.shop-collection-list'],
    back: '.shop-close-btn',
    open: async (page) => {
      await openShopWithPoints(page, 200);
      for (let i = 0; i < 3; i++) await readState(page, 'buyChickenInShop');
      await readState(page, 'addEgg', 'brachiosaurus', false);
      await settle(page);
      await page.locator('.shop-modal').evaluate((n) => {
        n.scrollTop = n.scrollHeight;
        for (const c of n.querySelectorAll('*')) {
          const h = c as HTMLElement;
          if (h.scrollHeight > h.clientHeight + 4 && getComputedStyle(h).overflowY !== 'visible') h.scrollTop = h.scrollHeight;
        }
      });
      await settle(page);
    },
    backTaps: async (page) => {
      // The close button is at the top of the card. A kid may need to scroll back up first.
      await page.locator('.shop-modal').evaluate((n) => {
        n.scrollTop = 0;
      });
      await tapCenter(page, '.shop-close-btn');
    },
  },
  {
    id: 'dinowinkel-ei-kopen-vraag',
    group: 'winkel',
    main: '.shop-close-btn, .shop-confirm-yes, .shop-confirm-no',
    scrollOk: ['.shop-grid', '.shop-collection-list'],
    back: '.shop-close-btn',
    open: async (page) => {
      await openShopWithPoints(page, 200);
      await tapCenter(page, '.shop-buy-btn[data-testid^="shop-buy-"]');
      await page.locator('.shop-confirm-box').first().waitFor();
      await settle(page);
    },
    backTaps: async (page) => {
      await tapCenter(page, '.shop-close-btn');
    },
  },
  // ---- Lesboek and Extra oefenen
  {
    id: 'lesboek-lijst',
    group: 'leren',
    main: '.pause-btn-primary',
    scrollOk: ['.lesboek-topics-grid'],
    back: '.pause-btn-primary',
    open: async (page) => {
      await readState(page, 'openPauseMenu');
      await tapText(page, 'Lesboek');
      await page.getByRole('dialog', { name: 'Lesboek' }).waitFor();
      await settle(page);
    },
    backTaps: async (page) => {
      await tapText(page, 'Sluiten');
    },
  },
  {
    id: 'lesboek-les',
    group: 'leren',
    main: '.lesboek-override-btn, .lesson-next',
    scrollOk: [],
    back: 'button:has-text("Terug naar Lesboek")',
    open: async (page) => {
      await readState(page, 'openPauseMenu');
      await tapText(page, 'Lesboek');
      await page.locator('[data-topic-id]').first().waitFor();
      await tapCenter(page, '[data-topic-id]');
      await page.locator('.lesson-view').waitFor();
      await settle(page);
    },
    backTaps: async (page) => {
      await tapText(page, 'Terug naar Lesboek');
      await tapText(page, 'Sluiten');
    },
  },
  {
    id: 'extra-oefenen',
    group: 'leren',
    main: '.pause-btn-primary, .lesboek-override-btn',
    scrollOk: ['.lesboek-topics-grid', '.lesboek-card'],
    back: 'button:has-text("Terug naar de wereld")',
    open: async (page) => {
      await readState(page, 'openPractice');
      await page.getByRole('dialog', { name: 'Extra oefenen' }).waitFor();
      await settle(page);
    },
    backTaps: async (page) => {
      await tapText(page, 'Terug naar de wereld');
    },
  },
  // ---- the learning break (lesson, first question)
  {
    id: 'leerpauze-les',
    group: 'leren',
    main: MAIN_KID,
    back: null,
    noBackReason: 'A running learning break cannot be closed on purpose. Only a parent can end it.',
    open: async (page) => {
      await readState(page, 'startBreakNow');
      await page.locator('.break-screen').waitFor();
      await settle(page, 600);
    },
  },
  // ---- dino menu and naming
  {
    id: 'dino-menu',
    group: 'dino',
    main: '.dino-menu-btn-close',
    back: '.dino-menu-btn-close',
    open: async (page) => {
      const id = await hatchDino(page);
      await readState(page, 'openDinoMenuFor', id);
      await page.getByRole('dialog', { name: 'Dino menu' }).waitFor();
      await settle(page);
    },
    backTaps: async (page) => {
      await tapCenter(page, '.dino-menu-btn-close');
    },
  },
  {
    id: 'dino-naam-geven',
    group: 'dino',
    main: '.kb-done',
    back: '.dino-menu-header .dino-menu-btn',
    open: async (page) => {
      const id = await hatchDino(page);
      await readState(page, 'openDinoMenuFor', id);
      await tapText(page, 'Naam geven');
      await page.locator('.name-screen-subtitle').waitFor();
      for (const ch of ['t', 'r', 'i', 'x']) {
        await page.locator('.kb-char', { hasText: new RegExp(`^${ch}$`) }).first().click();
      }
      await settle(page);
    },
    backTaps: async (page) => {
      await tapText(page, 'Terug', '.dino-menu-header');
      await tapCenter(page, '.dino-menu-btn-close');
    },
  },
  // ---- the parent gate and the parent area
  {
    id: 'ouders-pincode-vraag',
    group: 'ouders',
    kidText: false,
    back: 'button:has-text("Terug")',
    open: async (page) => {
      await openGate(page);
      await page.locator('.parent-input').waitFor();
    },
    backTaps: async (page) => {
      await tapText(page, 'Terug');
    },
  },
  {
    id: 'ouders-pincode-kiezen',
    group: 'ouders',
    kidText: false,
    back: '.parent-gate-key[data-key="Sluiten"]',
    open: async (page) => {
      await openGate(page);
      await answerGateQuestion(page);
      await page.locator('.parent-gate-key[data-key="1"]').waitFor();
      await settle(page);
    },
    backTaps: async (page) => {
      await tapCenter(page, '.parent-gate-key[data-key="Sluiten"]');
    },
  },
  {
    id: 'ouders-pincode-invoeren',
    group: 'ouders',
    kidText: false,
    back: '.parent-gate-key[data-key="Sluiten"]',
    open: async (page) => {
      await openShell(page);
      await tapCenter(page, '.parent-close-btn');
      await readState(page, 'openParentControls');
      await page.locator('.parent-gate-title', { hasText: 'Voer pincode in' }).waitFor();
      await settle(page);
    },
    backTaps: async (page) => {
      await tapCenter(page, '.parent-gate-key[data-key="Sluiten"]');
    },
  },
  {
    id: 'ouders-pincode-fout',
    group: 'ouders',
    kidText: false,
    back: '.parent-gate-key[data-key="Sluiten"]',
    open: async (page) => {
      await openShell(page);
      await tapCenter(page, '.parent-close-btn');
      await readState(page, 'openParentControls');
      await page.locator('.parent-gate-title', { hasText: 'Voer pincode in' }).waitFor();
      await typePin(page, '9999');
      await page.locator('.parent-gate-msg').waitFor();
      await settle(page);
    },
    backTaps: async (page) => {
      await tapCenter(page, '.parent-gate-key[data-key="Sluiten"]');
    },
  },
  {
    id: 'ouders-pincode-vergeten',
    group: 'ouders',
    kidText: false,
    back: 'button:has-text("Terug")',
    open: async (page) => {
      await openShell(page);
      await tapCenter(page, '.parent-close-btn');
      await readState(page, 'openParentControls');
      await page.locator('.parent-gate-title', { hasText: 'Voer pincode in' }).waitFor();
      await tapText(page, 'Pincode vergeten?');
      await page.locator('.parent-input').waitFor();
      await settle(page);
    },
    backTaps: async (page) => {
      await tapText(page, 'Terug');
      await tapCenter(page, '.parent-gate-key[data-key="Sluiten"]');
    },
  },
  ...(
    [
      ['instellingen', 'ouders-instellingen'],
      ['inhoud', 'ouders-inhoud-kiezen'],
      ['resultaten', 'ouders-resultaten'],
      ['examens', 'ouders-examens'],
      ['modules', 'ouders-eigen-modules'],
      ['import-export', 'ouders-import-export'],
    ] as const
  ).map(
    ([section, id]): ScreenDef => ({
      id,
      group: 'ouders',
      kidText: false,
      scope: '.parent-shell',
      scrollOk: ['.parent-main'],
      main: '.parent-close-btn',
      back: '.parent-close-btn',
      open: async (page) => {
        await openShell(page, section);
      },
      backTaps: CLOSE_PARENT,
    }),
  ),
  {
    id: 'ouders-wereld-opnieuw-vraag',
    group: 'ouders',
    kidText: false,
    scope: '.parent-shell',
    scrollOk: ['.parent-main'],
    main: '.parent-close-btn',
    back: '.parent-close-btn',
    open: async (page) => {
      await openShell(page, 'instellingen');
      await tapText(page, 'Wereld opnieuw beginnen');
      await settle(page);
      await page.locator('.parent-main').evaluate((n) => {
        n.scrollTop = n.scrollHeight;
      });
      await settle(page);
    },
    backTaps: CLOSE_PARENT,
  },
];

/** Screens that need several steps (a whole practice session). Handled by their own tests below. */

// ---------------------------------------------------------------- allowed

interface Allowed {
  screen: RegExp;
  size: RegExp;
  kind: Kind;
  reason: string;
}

const ALLOWED: Allowed[] = [
  { screen: /^(dinowinkel|lesboek)/, size: /safari/, kind: 'text-clipped', reason: 'decision 54: in a Safari tab the shop and Lesboek may scroll' },
];

function isKnown(screenId: string, sizeName: string, f: Finding): Allowed | undefined {
  return ALLOWED.find((k) => k.screen.test(screenId) && k.size.test(sizeName) && k.kind === f.kind);
}

// ---------------------------------------------------------------- running a screen

async function prepare(page: Page): Promise<void> {
  await openApp(page);
  // iPad home screen app: status bar and home indicator. Chromium has no env(), so set the tokens.
  await page.addStyleTag({
    content: `:root{--safe-top:${SAFE.top}px;--safe-bottom:${SAFE.bottom}px;--safe-left:${SAFE.left}px;--safe-right:${SAFE.right}px}`,
  });
}

async function auditNow(page: Page, def: Pick<ScreenDef, 'scope' | 'scrollOk' | 'main' | 'kidText'>): Promise<{ findings: Finding[]; tappables: Array<Record<string, unknown>> }> {
  return page.evaluate(auditInPage, {
    scope: def.scope ?? null,
    // Lesson and teach moment text scroll on purpose inside their own panel; the main button stays outside (F5, F6).
    scrollOk: [...(def.scrollOk ?? []), '.teach-scroll', '.lesson-body'],
    main: def.main ?? '',
    kidText: def.kidText ?? true,
    safe: SAFE,
  });
}

function shot(sizeName: string, id: string): string {
  return `${OUT}/${sizeName}-${id}.png`;
}

/** Everything that can be measured, as one list of readable problems per check. */
function assertClean(screenId: string, sizeName: string, findings: Finding[]): void {
  const unknown = findings.filter((f) => !isKnown(screenId, sizeName, f));
  const byKind = new Map<Kind, string[]>();
  for (const f of unknown) {
    byKind.set(f.kind, [...(byKind.get(f.kind) ?? []), `${f.el}: ${f.detail}`]);
  }
  for (const kind of ['outside-viewport', 'outside-safe-area', 'too-small', 'main-too-small', 'too-close', 'covered', 'text-clipped', 'h-scroll', 'small-text', 'no-back'] as Kind[]) {
    expect.soft(byKind.get(kind) ?? [], `${kind} on ${screenId} at ${sizeName}`).toEqual([]);
  }
}

for (const size of SIZES) {
  test.describe(`UI review ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const def of SCREENS) {
      test(`${def.id} fits, is big enough and has a way back`, async ({ page }) => {
        await prepare(page);
        await def.open(page, { size });
        await page.screenshot({ path: shot(size.name, def.id) });

        const { findings } = await auditNow(page, def);

        // A way back, or a good reason why not.
        if (def.back) {
          const found = await page.locator(def.back).filter({ visible: true }).count();
          if (found === 0) findings.push({ kind: 'no-back', el: def.id, detail: `no visible ${def.back}` });
        }

        assertClean(def.id, size.name, findings);

        // Back to the world in at most 2 taps, with a real touch.
        if (def.backTaps) {
          await def.backTaps(page);
          await settle(page, 400);
          expect(await screen(page), `${def.id} back to the world`).toBe('world');
        }
      });
    }
  });
}

// ---------------------------------------------------------------- practice and break sessions

interface WalkSeen {
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

async function currentQuestion(page: Page): Promise<{ kind: QKind; prompt: string } | null> {
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

async function phase(page: Page): Promise<string> {
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
async function answer(page: Page, topic: string, right: boolean): Promise<void> {
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

/**
 * Plays a whole session and saves one screenshot of every new phase and question type it meets.
 * Plan: question 1 right, question 2 wrong then right, question 3 wrong twice (teach moment), the rest right.
 */
async function walkSession(page: Page, sizeName: string, prefix: string, topic: string, wanted: Set<string>, seen: Map<string, WalkSeen>): Promise<void> {
  let qNumber = 0;
  let triesOnThis = 0;
  let lastKey = '';
  for (let step = 0; step < 60; step++) {
    await settle(page, 250);
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

    if (ph === 'lesson') {
      for (let i = 0; i < 8; i++) {
        if ((await phase(page)) !== 'lesson') break;
        const next = page.locator('.lesson-next').first();
        await next.click();
        await settle(page, 200);
      }
    } else if (ph === 'question' || ph === 'retry') {
      if (ph === 'question') triesOnThis = 0;
      triesOnThis++;
      const idx = qNumber;
      const rightNow = idx === 0 || idx > 2 || (idx === 1 && triesOnThis >= 2);
      await answer(page, topic, rightNow);
      if (ph === 'retry' || rightNow) {
        // moving on happens through feedback or teach
      }
    } else if (ph === 'feedback') {
      qNumber++;
      await page.locator('.break-next-btn').click();
    } else if (ph === 'teach') {
      qNumber++;
      await page.locator('.teach-done').click();
    } else if (ph === 'summary') {
      return;
    } else if (ph === 'empty') {
      return;
    }
  }
}

const WANT = new Set(['les', 'vraag-choice', 'vraag-find-error', 'vraag-type', 'vraag-number', 'vraag-punctuate', 'fout-opnieuw', 'goed', 'uitleg-les', 'uitleg-voorbeeld', 'samenvatting']);

for (const size of SIZES) {
  test.describe(`UI review sessions ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });
    test.setTimeout(120_000);

    // Practice sessions from Extra oefenen. Tafels gives number pad questions, Apostrof gives choice, find error and typing, Komma gives punctuation.
    for (const [moduleId, topic, label] of [
      ['rekenen-basis', 'optellen', 'oefenen-rekenen'],
      ['cito-taalverzorging', 'apostrof', 'oefenen-taal'],
      ['cito-taalverzorging', 'komma', 'oefenen-komma'],
    ] as const) {
      test(`${label} session screens fit and finish back in the world`, async ({ page }) => {
        await prepare(page);
        await readState(page, 'openPractice');
        await page.locator(`[data-practice-topic="${moduleId}:${topic}"]`).waitFor();
        // The topic button may sit below the fold. A kid scrolls the list, so scroll it into view first.
        await page.locator(`[data-practice-topic="${moduleId}:${topic}"]`).scrollIntoViewIfNeeded();
        await tapCenter(page, `[data-practice-topic="${moduleId}:${topic}"]`);
        await page.locator('.break-screen').waitFor();
        const seen = new Map<string, WalkSeen>();
        await walkSession(page, size.name, label, topic, WANT, seen);
        const all: Finding[] = [];
        for (const s of seen.values()) for (const f of s.findings) if (!isKnown(`${label}-${s.key}`, size.name, f)) all.push({ ...f, el: `[${s.key}] ${f.el}` });
        const unknown = all;
        const grouped = new Map<string, string[]>();
        for (const f of unknown) grouped.set(f.kind, [...(grouped.get(f.kind) ?? []), `${f.el}: ${f.detail}`]);
        for (const [kind, list] of grouped) expect.soft(list, `${kind} in ${label} at ${size.name}`).toEqual([]);

        // The summary has a finish button that goes back to the world.
        if ((await phase(page)) === 'summary') {
          await tapCenter(page, '.summary-done-btn');
          await settle(page, 500);
          expect(await screen(page), `${label} finished`).toBe('world');
        }
      });
    }

    test('leerpauze session screens fit', async ({ page }) => {
      await prepare(page);
      await readState(page, 'startBreakNow');
      await page.locator('.break-screen').waitFor();
      const seen = new Map<string, WalkSeen>();
      // The break topic is picked by the app. The walker answers with the Taal files when it can.
      await walkSession(page, size.name, 'leerpauze', 'apostrof', new Set([...WANT].filter((k) => k !== 'les')), seen);
      const all: Finding[] = [];
      for (const s of seen.values()) for (const f of s.findings) if (!isKnown(`leerpauze-${s.key}`, size.name, f)) all.push({ ...f, el: `[${s.key}] ${f.el}` });
      const unknown = all;
      const grouped = new Map<string, string[]>();
      for (const f of unknown) grouped.set(f.kind, [...(grouped.get(f.kind) ?? []), `${f.el}: ${f.detail}`]);
      for (const [kind, list] of grouped) expect.soft(list, `${kind} in leerpauze at ${size.name}`).toEqual([]);
      if ((await phase(page)) === 'summary') {
        await tapCenter(page, '.summary-done-btn');
        await settle(page, 600);
        expect(await screen(page), 'leerpauze finished').toBe('world');
      }
    });
  });
}

// ---------------------------------------------------------------- portrait

test.describe('UI review portrait', () => {
  test.use({ viewport: { width: 768, height: 1024 } });
  test('portrait shows the turn message and nothing else is tappable', async ({ page }) => {
    await openApp(page);
    await settle(page, 400);
    await page.screenshot({ path: shot('768x1024-portrait', 'draai-je-ipad') });
    await expect(page.getByText('Draai je iPad')).toBeVisible();
    const covered = await page.evaluate(() => {
      const hud = document.querySelector('.hud button') as HTMLElement | null;
      if (!hud) return false;
      const r = hud.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!top?.closest('.shell-overlay');
    });
    expect(covered, 'the turn message covers the HUD').toBe(true);
  });
});

// ---------------------------------------------------------------- real taps and flows

async function reachTeachMoment(page: Page): Promise<void> {
  await readState(page, 'openPractice');
  await page.locator('[data-practice-topic="cito-taalverzorging:apostrof"]').scrollIntoViewIfNeeded();
  await tapCenter(page, '[data-practice-topic="cito-taalverzorging:apostrof"]');
  await page.locator('.break-screen').waitFor();
  for (let i = 0; i < 40; i++) {
    await settle(page, 250);
    const ph = await phase(page);
    if (ph === 'teach') return;
    if (ph === 'feedback') await page.locator('.break-next-btn').click();
    else if (ph === 'question' || ph === 'retry') await answer(page, 'apostrof', false);
    else if (ph === 'summary') throw new Error('session ended without a teach moment');
  }
  throw new Error('no teach moment reached');
}

/**
 * True when the app cancels a finger drag that starts on this element. On iOS a cancelled touchmove means
 * the page does not scroll. (Chromium here cannot swipe for real, so the drag is sent as an event.)
 */
async function dragIsCancelled(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const target = document.querySelector(sel);
    if (!target) throw new Error(`no ${sel}`);
    const ev = new Event('touchmove', { bubbles: true, cancelable: true });
    target.dispatchEvent(ev);
    return ev.defaultPrevented;
  }, selector);
}

test.describe('UI review real taps', () => {
  test.use({ viewport: { width: 1024, height: 768 } });
  test.setTimeout(90_000);

  test('a finger on Pauze in the world opens the pause menu', async ({ page }) => {
    await prepare(page);
    await tapCenter(page, '.hud-pause');
    await settle(page, 500);
    expect(await screen(page)).toBe('kid-overlay');
  });

  test('a finger on Ouders in the world opens the parent gate', async ({ page }) => {
    await prepare(page);
    await tapCenter(page, '[data-testid="parent-controls-btn"]');
    await page.locator('.parent-gate').waitFor();
    expect(await screen(page)).toBe('parent');
  });

  test('the world lock is small and grey, not covering Pauze or the countdown, and only the world has it (decision 53)', async ({ page }) => {
    await prepare(page);
    const lock = page.locator('.hud [data-testid="parent-controls-btn"]');
    await expect(lock).toHaveText('\u{1F512}');
    const box = (await lock.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x + box.width).toBeLessThanOrEqual(1024 - SAFE.right);
    expect(box.y).toBeGreaterThanOrEqual(SAFE.top);
    for (const sel of ['.hud-pause', '.hud-countdown']) {
      const other = (await page.locator(sel).boundingBox())!;
      const overlap = box.x < other.x + other.width && other.x < box.x + box.width && box.y < other.y + other.height && other.y < box.y + box.height;
      expect(overlap, `lock overlaps ${sel}`).toBe(false);
    }
    // No lock on a break screen, the pause menu overlay or the shop.
    await readState(page, 'startBreakNow');
    await page.locator('.break-screen').waitFor();
    // The HUD lock stays in the page under the break screen, so check that a finger cannot reach it.
    const reachable = await page.evaluate(() => {
      const r = document.querySelector('[data-testid="parent-controls-btn"]')!.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!top?.closest('[data-testid="parent-controls-btn"]');
    });
    expect(reachable).toBe(false);
    await expect(page.locator('.break-screen [data-testid="parent-controls-btn"], .lock-icon-btn-floating')).toHaveCount(0);
  });

  test('a finger drag on the teach moment is allowed, so it can scroll to Ik snap het', async ({ page }) => {
    await prepare(page);
    await reachTeachMoment(page);
    expect(await dragIsCancelled(page, '.teach-moment')).toBe(false);
  });

  test('a finger drag on the Extra oefenen list is allowed', async ({ page }) => {
    await prepare(page);
    await readState(page, 'openPractice');
    await page.getByRole('dialog', { name: 'Extra oefenen' }).waitFor();
    expect(await dragIsCancelled(page, '.lesboek-topics-grid')).toBe(false);
  });

  test('a finger drag on the Dinowinkel is allowed', async ({ page }) => {
    await prepare(page);
    await openShopWithPoints(page, 200);
    expect(await dragIsCancelled(page, '.shop-grid')).toBe(false);
  });

  test('a finger drag in the parent area is allowed', async ({ page }) => {
    await prepare(page);
    await openShell(page, 'inhoud');
    expect(await dragIsCancelled(page, '.parent-main')).toBe(false);
  });

  test('a finger drag in the world is cancelled on purpose', async ({ page }) => {
    await prepare(page);
    expect(await dragIsCancelled(page, '.hud')).toBe(true);
  });

  test('the teach moment shows Ik snap het without scrolling', async ({ page }) => {
    await prepare(page);
    await reachTeachMoment(page);
    const box = await page.locator('.teach-done').boundingBox();
    expect(box && box.y + box.height <= 768 - SAFE.bottom).toBe(true);
  });

  test('Extra oefenen sessions have a big Stoppen that goes back to the world, a real break has none', async ({ page }) => {
    await prepare(page);
    await readState(page, 'openPractice');
    await tapCenter(page, '[data-practice-topic="rekenen-basis:optellen"]');
    await page.locator('.break-screen').waitFor();
    const stop = page.locator('[data-testid="practice-stop"]');
    await expect(stop).toBeVisible();
    const box = (await stop.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(56);
    await page.screenshot({ path: `${SHOTS}/oefenen-stoppen.png` });
    await tapCenter(page, '[data-testid="practice-stop"]');
    await settle(page, 500);
    expect(await screen(page)).toBe('world');
    await readState(page, 'startBreakNow');
    await page.locator('.break-screen').waitFor();
    await expect(page.locator('[data-testid="practice-stop"]')).toHaveCount(0);
  });

  test('screenshots of the world lock and the first PIN grown up question', async ({ page }) => {
    await prepare(page);
    await page.screenshot({ path: `${SHOTS}/wereld-slot.png` });
    await readState(page, 'openParentControls');
    await page.locator('.parent-input').waitFor();
    await settle(page);
    await page.screenshot({ path: `${SHOTS}/eerste-pin-vraag.png` });
  });

  test('Dinowinkel Kippenhok buttons are reachable without scrolling', async ({ page }) => {
    await prepare(page);
    await openShopWithPoints(page, 200);
    const box = await page.locator('[data-testid="shop-buy-kip"]').boundingBox();
    expect(box && box.y + box.height <= 768).toBe(true);
  });
});
