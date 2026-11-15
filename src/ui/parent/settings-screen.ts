// Parent Instellingen screen (T49, T55, AC27, AC93, AC94, AC95, AC135, AC154).

import { pointsModeOf, type PointsMode } from '../../core/economy';
import type { SettingsRecord } from '../../storage/schema';
import { el } from '../dom';
import { onTap } from '../tap';
import { viewDistanceOf, type ViewDistance } from '../../render/quality';
import { createMonstersCard } from './monsters-card';

const POINTS_CHOICES: { mode: PointsMode; label: string; line: string }[] = [
  { mode: 'makkelijk', label: 'Makkelijk', line: 'Een foutje kost geen punten.' },
  { mode: 'normaal', label: 'Normaal', line: 'Twee keer fout kost 1 punt.' },
  { mode: 'moeilijk', label: 'Moeilijk', line: 'Elke foute poging kost 1 punt.' },
];

export const HELP_VIEW_DISTANCE = 'Dichtbij maakt het spel sneller op een oudere iPad. Je kijkt dan minder ver.';

const VIEW_CHOICES: { view: ViewDistance; label: string }[] = [
  { view: 'ver', label: 'Ver' },
  { view: 'dichtbij', label: 'Dichtbij' },
];

export interface SettingsScreenOptions {
  settings: SettingsRecord;
  isBreakActive: boolean;
  /** An exam is running: "Pauze nu starten" is greyed out (AC115). */
  isExamActive?: boolean;
  onUpdateSettings: (next: SettingsRecord) => Promise<void> | void;
  onStartBreakNow: () => Promise<void> | void;
  onEndBreakNow: () => Promise<void> | void;
  onChangePin: () => void;
  onResetWorld?: () => Promise<void> | void;
  /** Alles wissen after both confirms. May throw: the screen then says nothing changed (AC193). */
  onWipeAll?: () => Promise<void> | void;
  /** Shown at the bottom (AC135). Default: the version in package.json. */
  appVersion?: string;
  now?: () => number;
}

export interface SettingsScreen {
  readonly element: HTMLElement;
  destroy(): void;
}

const volumeOf = (s: SettingsRecord): number => (typeof s.volume === 'number' ? Math.min(1, Math.max(0, s.volume)) : 0.7);

export function createSettingsScreen(options: SettingsScreenOptions): SettingsScreen {
  let current: SettingsRecord = { ...options.settings };
  let confirmResetWorld = false;
  let wipeStep: 0 | 1 | 2 = 0;
  let wipeFailed = false;
  let cleanups: Array<() => void> = [];
  const root = el('div', { class: 'parent-settings' });

  function clearCleanups() {
    for (const c of cleanups) c();
    cleanups = [];
  }

  function updateField<K extends keyof SettingsRecord>(key: K, value: SettingsRecord[K]) {
    current = { ...current, [key]: value };
    void options.onUpdateSettings(current);
    render();
  }

  /** Alles wissen (AC193): two confirms with different words, Annuleren at either step changes nothing. */
  function wipeSection(): HTMLElement {
    const wrap = el('div', { class: 'parent-wipe' });
    const button = (text: string, danger: boolean, run: () => void) => {
      const b = el('button', { class: danger ? 'parent-btn parent-btn-danger' : 'parent-btn', text, attrs: { type: 'button' } });
      cleanups.push(onTap(b, run, { now: options.now }));
      return b;
    };
    const cancel = () => button('Annuleren', false, () => { wipeStep = 0; render(); });
    if (wipeFailed) {
      wrap.append(el('p', { class: 'parent-note', text: 'Wissen is niet gelukt. Er is niets veranderd.', attrs: { role: 'alert' } }));
    }
    if (wipeStep === 0) {
      wrap.append(el('div', { class: 'parent-btn-row' }, [
        button('Alles wissen', true, () => { wipeFailed = false; wipeStep = 1; render(); }),
      ]));
    } else if (wipeStep === 1) {
      wrap.append(
        el('p', { text: 'Alles wissen? Je dino’s, punten, voortgang en de pincode gaan weg.' }),
        el('div', { class: 'parent-btn-row' }, [button('Ja, ga verder', true, () => { wipeStep = 2; render(); }), cancel()]),
      );
    } else {
      wrap.append(
        el('p', { text: 'Weet je het echt zeker? Dit kan niet terug. Daarna begint een nieuw spel.' }),
        el('div', { class: 'parent-btn-row' }, [
          button('Ja, wis alles echt', true, () => {
            wipeStep = 0;
            void (async () => {
              try {
                await options.onWipeAll?.();
              } catch {
                wipeFailed = true;
                render();
              }
            })();
          }),
          cancel(),
        ]),
      );
    }
    return wrap;
  }

  function render() {
    clearCleanups();
    root.replaceChildren();

    const title = el('h2', { class: 'parent-section-title', text: 'Instellingen' });

    // Timer & break settings card
    const breakCard = el('div', { class: 'parent-card' });
    const intervalSelect = el(
      'select',
      { class: 'parent-input', attrs: { 'aria-label': 'Leerpauze elke X minuten' } },
      [3, 5, 10, 15, 20, 30].map((m) =>
        el('option', {
          text: `${m} minuten`,
          attrs: {
            value: String(m),
            ...(current.breakEveryMinutes === m ? { selected: 'selected' } : {}),
          },
        }),
      ),
    );
    intervalSelect.value = String(current.breakEveryMinutes || 5);
    const onIntervalChange = () => updateField('breakEveryMinutes', Number(intervalSelect.value));
    intervalSelect.addEventListener('change', onIntervalChange);
    cleanups.push(() => intervalSelect.removeEventListener('change', onIntervalChange));

    const questionsSelect = el(
      'select',
      { class: 'parent-input', attrs: { 'aria-label': 'Vragen per leerpauze' } },
      [3, 4, 5, 6, 8, 10].map((n) =>
        el('option', {
          text: `${n} vragen`,
          attrs: {
            value: String(n),
            ...(current.questionsPerBreak === n ? { selected: 'selected' } : {}),
          },
        }),
      ),
    );
    questionsSelect.value = String(current.questionsPerBreak || 5);
    const onQuestionsChange = () =>
      updateField('questionsPerBreak', Number(questionsSelect.value));
    questionsSelect.addEventListener('change', onQuestionsChange);
    cleanups.push(() => questionsSelect.removeEventListener('change', onQuestionsChange));

    const makeToggleRow = (label: string, checked: boolean, onToggle: (next: boolean) => void) => {
      const btn = el('button', {
        class: `parent-btn ${checked ? 'parent-btn-primary' : ''}`.trim(),
        text: checked ? 'Aan' : 'Uit',
        attrs: { type: 'button', 'aria-pressed': String(checked), 'aria-label': label },
      });
      cleanups.push(onTap(btn, () => onToggle(!checked), { now: options.now }));
      return el('div', { class: 'parent-row' }, [el('span', { text: label }), btn]);
    };

    breakCard.append(
      el('div', { class: 'parent-row' }, [
        el('span', { text: 'Leerpauze elke' }),
        intervalSelect,
      ]),
      el('div', { class: 'parent-row' }, [
        el('span', { text: 'Aantal vragen per leerpauze' }),
        questionsSelect,
      ]),
      makeToggleRow('Nieuwe lessen en vragen', current.newLessonsEnabled !== false, (v) =>
        updateField('newLessonsEnabled', v),
      ),
      makeToggleRow('Waarschuwing voor de pauze (laatste 30s)', current.breakWarningEnabled !== false, (v) =>
        updateField('breakWarningEnabled', v),
      ),
    );

    // Display & sound card
    const displayCard = el('div', { class: 'parent-card' });
    displayCard.append(
      makeToggleRow('Groter lettertype (25% groter voor kinderen)', Boolean(current.largeFont), (v) =>
        updateField('largeFont', v),
      ),
      makeToggleRow('Geluidseffecten', current.soundEffectsEnabled !== false, (v) =>
        updateField('soundEffectsEnabled', v),
      ),
    );

    // Volume (AC192): 0 to 100, saved as 0 to 1.
    const volumeValue = el('span', { class: 'parent-volume-value', text: String(Math.round(volumeOf(current) * 100)), attrs: { 'data-testid': 'volume-value' } });
    const volumeInput = el('input', {
      class: 'parent-input parent-volume',
      attrs: {
        type: 'range', min: '0', max: '100', step: '5', 'aria-label': 'Volume',
        value: String(Math.round(volumeOf(current) * 100)), 'data-testid': 'volume-setting',
      },
    }) as HTMLInputElement;
    const onVolumeInput = () => {
      volumeValue.textContent = volumeInput.value;
    };
    const onVolumeChange = () => updateField('volume', Number(volumeInput.value) / 100);
    volumeInput.addEventListener('input', onVolumeInput);
    volumeInput.addEventListener('change', onVolumeChange);
    cleanups.push(() => {
      volumeInput.removeEventListener('input', onVolumeInput);
      volumeInput.removeEventListener('change', onVolumeChange);
    });
    displayCard.append(
      el('div', { class: 'parent-row' }, [el('span', { text: 'Volume' }), volumeInput, volumeValue]),
    );

    // Punten card (AC172): three big choices, each with one short line.
    const pointsCard = el('div', { class: 'parent-card parent-points', attrs: { 'data-testid': 'points-setting' } });
    pointsCard.append(el('strong', { text: 'Punten' }));
    const chosen = pointsModeOf(current);
    const choiceRow = el('div', { class: 'parent-points-row' });
    for (const c of POINTS_CHOICES) {
      const on = c.mode === chosen;
      const btn = el(
        'button',
        {
          class: `parent-btn parent-points-choice ${on ? 'parent-btn-primary' : ''}`.trim(),
          attrs: { type: 'button', 'aria-pressed': String(on), 'data-points-mode': c.mode },
        },
        [el('span', { class: 'parent-points-label', text: c.label }), el('span', { class: 'parent-points-line', text: c.line })],
      );
      cleanups.push(onTap(btn, () => updateField('pointsMode', c.mode), { now: options.now }));
      choiceRow.append(btn);
    }
    pointsCard.append(choiceRow);

    // Kijkafstand card (AC243): Ver is today's view, Dichtbij is the speed fallback.
    const viewCard = el('div', { class: 'parent-card parent-view', attrs: { 'data-testid': 'view-setting' } });
    viewCard.append(el('strong', { text: 'Kijkafstand' }));
    const chosenView = viewDistanceOf(current);
    const viewRow = el('div', { class: 'parent-points-row' });
    for (const c of VIEW_CHOICES) {
      const on = c.view === chosenView;
      const btn = el('button', {
        class: `parent-btn parent-view-choice ${on ? 'parent-btn-primary' : ''}`.trim(),
        text: c.label,
        attrs: { type: 'button', 'aria-pressed': String(on), 'data-view-distance': c.view },
      });
      cleanups.push(onTap(btn, () => updateField('viewDistance', c.view), { now: options.now }));
      viewRow.append(btn);
    }
    viewCard.append(viewRow, el('p', { class: 'parent-switch-help', text: HELP_VIEW_DISTANCE }));

    // Monsters en ridders card (AC208)
    const monstersCard = createMonstersCard({
      settings: current,
      onToggle: (key, next) => updateField(key, next),
      addCleanup: (c) => cleanups.push(c),
      now: options.now,
    });

    // Direct actions card (AC94, AC95)
    const actionsCard = el('div', { class: 'parent-card' });
    const startBreakBtn = el('button', {
      class: 'parent-btn parent-btn-primary',
      text: 'Pauze nu starten',
      attrs: {
        type: 'button',
        ...(options.isExamActive ? { disabled: 'disabled' } : {}),
      },
    });
    if (!options.isExamActive) {
      cleanups.push(
        onTap(startBreakBtn, () => void options.onStartBreakNow(), { now: options.now }),
      );
    }

    const endBreakBtn = el('button', {
      class: 'parent-btn',
      text: 'Pauze nu beëindigen',
      attrs: {
        type: 'button',
        ...(options.isBreakActive ? {} : { disabled: 'disabled' }),
      },
    });
    if (options.isBreakActive) {
      cleanups.push(
        onTap(endBreakBtn, () => void options.onEndBreakNow(), { now: options.now }),
      );
    }

    const changePinBtn = el('button', {
      class: 'parent-btn',
      text: 'Pincode wijzigen',
      attrs: { type: 'button' },
    });
    cleanups.push(onTap(changePinBtn, options.onChangePin, { now: options.now }));

    const btnRow = el('div', { class: 'parent-btn-row' }, [
      startBreakBtn,
      endBreakBtn,
      changePinBtn,
    ]);
    actionsCard.append(el('strong', { text: 'Directe acties' }), btnRow);

    if (options.onResetWorld) {
      if (!confirmResetWorld) {
        const resetWorldBtn = el('button', {
          class: 'parent-btn parent-btn-danger',
          text: 'Wereld opnieuw beginnen',
          attrs: { type: 'button' },
        });
        cleanups.push(
          onTap(
            resetWorldBtn,
            () => {
              confirmResetWorld = true;
              render();
            },
            { now: options.now },
          ),
        );
        actionsCard.append(el('div', { class: 'parent-btn-row' }, [resetWorldBtn]));
      } else {
        const confirmYes = el('button', {
          class: 'parent-btn parent-btn-danger',
          text: 'Ja, maak een nieuwe wereld (dino’s en punten blijven)',
          attrs: { type: 'button' },
        });
        const confirmNo = el('button', {
          class: 'parent-btn',
          text: 'Annuleren',
          attrs: { type: 'button' },
        });
        cleanups.push(
          onTap(
            confirmYes,
            () => {
              confirmResetWorld = false;
              void options.onResetWorld?.();
              render();
            },
            { now: options.now },
          ),
        );
        cleanups.push(
          onTap(
            confirmNo,
            () => {
              confirmResetWorld = false;
              render();
            },
            { now: options.now },
          ),
        );
        actionsCard.append(el('div', { class: 'parent-btn-row' }, [confirmYes, confirmNo]));
      }
    }

    if (options.onWipeAll) actionsCard.append(wipeSection());

    const versionLine = el('p', {
      class: 'parent-version',
      text: `Versie ${options.appVersion ?? __APP_VERSION__}`,
      attrs: { 'data-testid': 'app-version' },
    });
    root.append(title, breakCard, displayCard, pointsCard, viewCard, monstersCard, actionsCard, versionLine);
  }

  render();

  return {
    element: root,
    destroy() {
      clearCleanups();
      root.remove();
    },
  };
}
