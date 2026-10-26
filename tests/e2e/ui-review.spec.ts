// UI review (kid-ui-reviewer). Opens every screen at four iPad landscape sizes, saves a screenshot
// to test-results/screenshots/ui-review/<size>-<screen>.png and measures every tappable thing:
// inside the viewport and the safe area, at least 44 x 44, at least 8 points between neighbours,
// not covered by another element, text not clipped, no horizontal scroll, a way back, back in 2 taps.
//
// Every finding F1 to F14 in docs/UI_REVIEW.md is fixed, so nothing is filtered out any more.
// The one allowance (ALLOWED, in helpers/ui-audit.ts) is decision 54: in a Safari tab (1024x690) the shop and Lesboek may scroll.
//
// R2e: one boot per size. The tests of a size run in order on one page; each starts in the world
// (reload if a screen is still open). The session walks are in ui-review-sessions.spec.ts, portrait
// and real finger taps in ui-review-taps.spec.ts. The audit code is in helpers/ui-audit.ts.
// Order matters a little: screens that leave saved data behind (PIN, dinos, chickens) come last.
//
import { test, expect, type Page } from '@playwright/test';
import { answerGateQuestion, readState } from './helpers/app';
import {
  SIZES, assertClean, auditNow, backToWorld, bootSize, hatchDino, MAIN_KID, openGate, openShell, openShopWithPoints,
  screen, shot, tapCenter, tapText, typePin, waitScreen, waitSettled, type SizeBoot,
} from './helpers/ui-audit';

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
      await page.locator('.hud-pause').waitFor({ state: 'visible' });
      await waitSettled(page);
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
      await page.locator('.countdown-warning').waitFor({ state: 'visible' });
      await waitSettled(page);
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
      await expect.poll(async () => (await readState<{ mode: string }>(page, 'buildState')).mode).toBe('bouwen');
      await waitSettled(page);
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
      await waitSettled(page);
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
      await waitSettled(page);
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
      await waitSettled(page);
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
      await waitSettled(page);
      await page.locator('.shop-modal').evaluate((n) => {
        n.scrollTop = n.scrollHeight;
        for (const c of n.querySelectorAll('*')) {
          const h = c as HTMLElement;
          if (h.scrollHeight > h.clientHeight + 4 && getComputedStyle(h).overflowY !== 'visible') h.scrollTop = h.scrollHeight;
        }
      });
      await waitSettled(page);
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
      await waitSettled(page);
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
      await waitSettled(page);
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
      await waitSettled(page);
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
      await waitSettled(page);
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
      await waitSettled(page);
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
      await waitSettled(page);
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
      await waitSettled(page);
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
      await waitSettled(page);
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
      await waitSettled(page);
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
      await waitSettled(page);
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
      await waitSettled(page);
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
      // The button can sit below the fold on the smaller sizes. A kid scrolls it into view, then taps.
      await page.locator('.parent-shell button', { hasText: 'Wereld opnieuw beginnen' }).scrollIntoViewIfNeeded();
      await tapText(page, 'Wereld opnieuw beginnen');
      await page.locator('.parent-shell button', { hasText: 'Annuleren' }).waitFor({ state: 'visible' });
      await waitSettled(page);
      await page.locator('.parent-main').evaluate((n) => {
        n.scrollTop = n.scrollHeight;
      });
      await waitSettled(page);
    },
    backTaps: CLOSE_PARENT,
  },
];

// ---------------------------------------------------------------- running a screen

/**
 * One boot per size means saved data stays between screens. Screens that add dinos or chickens, or
 * leave a break running, come last, so every other screen looks like it does on a new game.
 * The parent PIN is made by the first screen that opens the parent area; the two gate screens that
 * need "no PIN yet" come before it in the list.
 */
const LAST = ['dino-menu', 'dino-naam-geven', 'dinowinkel-kippenhok-onderaan', 'leerpauze-les'];
const ORDERED = [...SCREENS.filter((d) => !LAST.includes(d.id)), ...LAST.map((id) => SCREENS.find((d) => d.id === id)!)];

for (const size of SIZES) {
  test.describe(`UI review ${size.name}`, () => {
    // One page for the whole size, tests in order. After a failure Playwright starts a fresh worker for the rest.
    test.describe.configure({ mode: 'default' });
    let boot: SizeBoot;

    test.beforeAll(async ({ browser }, testInfo) => {
      boot = await bootSize(browser, testInfo, size);
    });
    test.afterAll(async () => {
      await boot?.context.close();
    });

    for (const def of ORDERED) {
      test(`${def.id} fits, is big enough and has a way back`, async () => {
        const { page } = boot;
        await backToWorld(boot);
        await def.open(page, { size });
        await waitSettled(page);
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
          await waitScreen(page, 'world');
          expect(await screen(page), `${def.id} back to the world`).toBe('world');
        }
      });
    }
  });
}
