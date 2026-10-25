// UI review (kid-ui-reviewer). Opens every screen at four iPad landscape sizes, saves a screenshot
// to docs/screenshots/ui-review/<size>-<screen>.png and measures every tappable thing:
// inside the viewport and the safe area, at least 44 x 44, at least 8 points between neighbours,
// not covered by another element, text not clipped, no horizontal scroll, a way back, back in 2 taps.
//
// Every finding F1 to F14 in docs/UI_REVIEW.md is fixed, so nothing is filtered out any more.
// The one allowance (ALLOWED, in helpers/ui-audit.ts) is decision 54: in a Safari tab (1024x690)
// the shop and Lesboek may scroll.
//
// R2e: one boot per size. The screens of one size share one page. Each screen starts from the world.
// A screen that changes the saved world (an egg, a timer, a running break) or that must start with no
// PIN gets a fresh page first (see Rig). The session walks are in ui-review-sessions.spec.ts, the
// portrait check and the real touch checks in ui-review-taps.spec.ts.
//
import { test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  SIZES,
  assertClean,
  auditNow,
  expectScreen,
  hatchDino,
  idle,
  openGate,
  openShell,
  openShopWithPoints,
  prepare,
  screen,
  shot,
  tapCenter,
  tapText,
  typePin,
  CLOSE_PARENT,
  MAIN_KID,
} from './helpers/ui-audit';
import { answerGateQuestion, readState } from './helpers/app';

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

const SCREENS: ScreenDef[] = [
  // ---- the world
  {
    id: 'wereld-hud',
    group: 'wereld',
    scope: 'body',
    open: async (page) => {
      await idle(page);
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
      await page.locator('.countdown-warning').waitFor();
      await idle(page);
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
      await idle(page);
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
      await idle(page);
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
      await idle(page);
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
      await idle(page);
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
      await idle(page);
      await page.locator('.shop-modal').evaluate((n) => {
        n.scrollTop = n.scrollHeight;
        for (const c of n.querySelectorAll('*')) {
          const h = c as HTMLElement;
          if (h.scrollHeight > h.clientHeight + 4 && getComputedStyle(h).overflowY !== 'visible') h.scrollTop = h.scrollHeight;
        }
      });
      await idle(page);
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
      await idle(page);
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
      await idle(page);
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
      await idle(page);
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
      await idle(page);
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
      await idle(page);
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
      await idle(page);
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
      await idle(page);
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
      await idle(page);
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
      await idle(page);
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
      await idle(page);
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
      await idle(page);
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
      // The button is below the fold on shorter iPads. A kid scrolls to it, so do that before the tap.
      await page.locator('.parent-btn', { hasText: 'Wereld opnieuw beginnen' }).scrollIntoViewIfNeeded();
      await tapText(page, 'Wereld opnieuw beginnen');
      await page.locator('.parent-btn', { hasText: 'Annuleren' }).waitFor();
      await page.locator('.parent-main').evaluate((n) => {
        n.scrollTop = n.scrollHeight;
      });
      await idle(page);
    },
    backTaps: CLOSE_PARENT,
  },
];

// ---------------------------------------------------------------- one page per size

/** Screens that change the saved world or leave a layer open. The next screen gets a fresh page. Run last. */
const DIRTIES_WORLD = new Set([
  'wereld-aftellen-waarschuwing',
  'wereld-bouwen',
  'alle-blokken-vakje-kiezen',
  'dinowinkel-kippenhok-onderaan',
  'dino-menu',
  'dino-naam-geven',
  'leerpauze-les',
]);

/** Screens that need the very first start: no PIN yet. */
const NEEDS_NO_PIN = new Set(['ouders-pincode-vraag', 'ouders-pincode-kiezen']);

/** Screens that set the PIN on the way. */
const SETS_PIN = new Set([
  'ouders-pincode-invoeren',
  'ouders-pincode-fout',
  'ouders-pincode-vergeten',
  'ouders-instellingen',
  'ouders-inhoud-kiezen',
  'ouders-resultaten',
  'ouders-examens',
  'ouders-eigen-modules',
  'ouders-import-export',
  'ouders-wereld-opnieuw-vraag',
]);

/** Clean screens first, then the ones that dirty the world. Same screens, same checks. */
const ORDERED = [...SCREENS.filter((d) => !DIRTIES_WORLD.has(d.id)), ...SCREENS.filter((d) => DIRTIES_WORLD.has(d.id))];

/** One page per size. Opens a fresh page (new context, empty storage) when the world is not clean. */
class Rig {
  ctx!: BrowserContext;
  page!: Page;
  dirty = false;
  pinSet = false;

  constructor(
    private readonly browser: Browser,
    private readonly size: (typeof SIZES)[number],
  ) {}

  async open(): Promise<void> {
    const use = test.info().project.use;
    this.ctx = await this.browser.newContext({
      baseURL: use.baseURL,
      userAgent: use.userAgent,
      deviceScaleFactor: use.deviceScaleFactor,
      isMobile: use.isMobile,
      hasTouch: true,
      viewport: { width: this.size.width, height: this.size.height },
    });
    this.page = await this.ctx.newPage();
    await prepare(this.page);
    this.dirty = false;
    this.pinSet = false;
  }

  async close(): Promise<void> {
    await this.ctx?.close();
  }

  /** The page for this screen: in the world and clean, else a fresh one. */
  async start(def: ScreenDef): Promise<Page> {
    const inWorld = !this.dirty && (await screen(this.page).catch(() => 'broken')) === 'world';
    if (!inWorld || (NEEDS_NO_PIN.has(def.id) && this.pinSet)) {
      await this.close();
      await this.open();
    }
    return this.page;
  }
}

for (const size of SIZES) {
  test.describe(`UI review ${size.name}`, () => {
    // Keep the tests in order in one worker. After a failure Playwright starts a fresh worker for the rest,
    // and every screen starts from the world, so one bad screen does not hide the others.
    test.describe.configure({ mode: 'default' });
    test.use({ viewport: { width: size.width, height: size.height } });

    let rig: Rig;
    test.beforeAll(async ({ browser }) => {
      rig = new Rig(browser, size);
      await rig.open();
    });
    test.afterAll(async () => {
      await rig.close();
    });

    for (const def of ORDERED) {
      test(`${def.id} fits, is big enough and has a way back`, async () => {
        const page = await rig.start(def);
        // A screen that does not finish cleanly leaves the next one a fresh page.
        rig.dirty = true;
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
          await expectScreen(page, 'world', `${def.id} back to the world`);
          await idle(page);
        }
        if (SETS_PIN.has(def.id)) rig.pinSet = true;
        // Clean again only when the screen is back in the world and left nothing behind.
        rig.dirty = DIRTIES_WORLD.has(def.id) || (await screen(page)) !== 'world';
      });
    }
  });
}
