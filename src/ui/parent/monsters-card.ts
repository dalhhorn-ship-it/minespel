// The parent card "Monsters en ridders" (v17, AC208). Rows with a help line each, the last one is the Zwarte bubbel row (V18e).
// A greyed row keeps its own value and shows that it does not act now.
import type { SettingsRecord } from '../../storage/schema';
import { el } from '../dom';
import { onTap } from '../tap';

export const HELP_MASTER = 'Zet alles hieronder in één keer aan of uit.';
export const HELP_KNIGHTS = 'Ridders koop je in de Dinowinkel. Ze volgen, wachten of passen op de dieren.';

export const HELP_BUBBLE =
  'Na 10 minuten spelen komt soms een bubbel. Tikt je kind erop, dan sloopt Klodder een paar blokken tot een ridder hem wegstuurt. Alles komt terug.';
export const HELP_MOLE =
  'Wie onder de gestreepte laag graaft, maakt de Monstermol wakker. Een hek of een ridder stopt hem.';
export const NOTE_BUBBLE_NEEDS_KNIGHTS = 'Werkt alleen met Ridders aan';

export interface MonstersCardOptions {
  settings: SettingsRecord;
  /** Saves one switch. The screen draws again after it. */
  onToggle: (key: 'monstersEnabled' | 'knightsEnabled' | 'bubbleEnabled' | 'moleEnabled', next: boolean) => void;
  /** Registers a function that removes the tap handlers. */
  addCleanup: (cleanup: () => void) => void;
  now?: () => number;
}

/** One row: label and Aan/Uit button, the help line under it. `greyed` keeps the value and dims the row. */
export function monstersRow(opts: {
  label: string;
  checked: boolean;
  help: string;
  testid: string;
  greyed?: boolean;
  /** Shown under the help line while the row is greyed. */
  greyedNote?: string;
  onToggle: (next: boolean) => void;
  addCleanup: (cleanup: () => void) => void;
  now?: () => number;
}): HTMLElement {
  const btn = el('button', {
    class: `parent-btn parent-switch-btn ${opts.checked ? 'parent-btn-primary' : ''}`.trim(),
    text: opts.checked ? 'Aan' : 'Uit',
    attrs: { type: 'button', 'aria-pressed': String(opts.checked), 'aria-label': opts.label, 'data-testid': `${opts.testid}-toggle` },
  });
  opts.addCleanup(onTap(btn, () => opts.onToggle(!opts.checked), { now: opts.now }));
  return el(
    'div',
    {
      class: `parent-switch${opts.greyed ? ' parent-switch-greyed' : ''}`,
      attrs: { 'data-testid': opts.testid, ...(opts.greyed ? { 'data-greyed': 'true', 'aria-disabled': 'true' } : {}) },
    },
    [
      el('div', { class: 'parent-row' }, [el('span', { text: opts.label }), btn]),
      el('p', { class: 'parent-switch-help', text: opts.help }),
      ...(opts.greyed && opts.greyedNote
        ? [el('p', { class: 'parent-switch-help parent-switch-note', text: opts.greyedNote, attrs: { 'data-testid': `${opts.testid}-note` } })]
        : []),
    ],
  );
}

export function createMonstersCard(options: MonstersCardOptions): HTMLElement {
  const master = options.settings.monstersEnabled !== false;
  const knights = options.settings.knightsEnabled !== false;
  // A missing bubble switch reads as Uit (decision 135).
  const bubble = options.settings.bubbleEnabled === true;
  // A missing mole switch reads as Aan, for a new install, an existing one and an old backup (decision 138).
  const mole = options.settings.moleEnabled !== false;
  const common = { addCleanup: options.addCleanup, now: options.now };
  return el('div', { class: 'parent-card parent-monsters', attrs: { 'data-testid': 'monsters-card' } }, [
    el('strong', { text: 'Monsters en ridders' }),
    monstersRow({
      ...common, label: 'Monsters en ridders', checked: master, help: HELP_MASTER, testid: 'monsters-master',
      onToggle: (v) => options.onToggle('monstersEnabled', v),
    }),
    monstersRow({
      ...common, label: 'Monstermol', checked: mole, help: HELP_MOLE, testid: 'monsters-mole', greyed: !master,
      onToggle: (v) => options.onToggle('moleEnabled', v),
    }),
    monstersRow({
      ...common, label: 'Ridders', checked: knights, help: HELP_KNIGHTS, testid: 'monsters-knights', greyed: !master,
      onToggle: (v) => options.onToggle('knightsEnabled', v),
    }),
    monstersRow({
      ...common, label: 'Zwarte bubbel', checked: bubble, help: HELP_BUBBLE, testid: 'monsters-bubble',
      greyed: !master || !knights, greyedNote: NOTE_BUBBLE_NEEDS_KNIGHTS,
      onToggle: (v) => options.onToggle('bubbleEnabled', v),
    }),
  ]);
}
