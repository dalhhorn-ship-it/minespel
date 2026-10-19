// Parent Instellingen screen (T49, T55, AC27, AC93, AC94, AC95, AC135, AC154).

import type { SettingsRecord } from '../../storage/schema';
import { el } from '../dom';
import { onTap } from '../tap';

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
  now?: () => number;
}

export interface SettingsScreen {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createSettingsScreen(options: SettingsScreenOptions): SettingsScreen {
  let current: SettingsRecord = { ...options.settings };
  let confirmResetWorld = false;
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

    root.append(title, breakCard, displayCard, actionsCard);
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
