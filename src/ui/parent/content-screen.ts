// Parent Inhoud kiezen screen (T50, AC77, AC78, AC79):
// Presets (Groep 6 midden/eind, Groep 7 midden/eind), Vakverdeling weights,
// and switches for subjects, modules, levels, and topics with item counts.

import { subjectLabel, type Catalog } from '../../content/catalog';
import {
  applyPreset,
  hasAnyUsableItems,
  isModuleOn,
  isSubjectOn,
  isTopicOn,
  moduleCounts,
  moduleLevels,
  moduleWeight,
  PRESETS,
  setModuleWeight,
  setSubjectOn,
  setTopicOn,
  toggleModuleLevel,
  topicCounts,
  type PresetId,
} from '../../content/switches';
import type { ProgressRecord } from '../../storage/progress-store';
import type { SwitchesRecord } from '../../storage/schema';
import { el } from '../dom';
import { onTap } from '../tap';

export interface ContentScreenOptions {
  catalog: Catalog;
  switches: SwitchesRecord;
  progress: readonly ProgressRecord[];
  onUpdateSwitches: (next: SwitchesRecord) => Promise<void> | void;
  now?: () => number;
}

export interface ContentScreen {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createContentScreen(options: ContentScreenOptions): ContentScreen {
  let current: SwitchesRecord = options.switches;
  let cleanups: Array<() => void> = [];
  const root = el('div', { class: 'parent-content-picker' });

  function clearCleanups() {
    for (const c of cleanups) c();
    cleanups = [];
  }

  function applyNext(next: SwitchesRecord) {
    current = next;
    void options.onUpdateSwitches(current);
    render();
  }

  function render() {
    clearCleanups();
    root.replaceChildren();

    const title = el('h2', { class: 'parent-section-title', text: 'Inhoud kiezen' });
    root.append(title);

    if (!hasAnyUsableItems(current, options.catalog)) {
      root.append(
        el('p', {
          class: 'parent-gate-msg',
          text: 'Er staan geen vragen aan. Zet minstens één vak en onderwerp aan.',
        }),
      );
    }

    // Presets card (AC79)
    const presetCard = el('div', { class: 'parent-card' }, [
      el('strong', { text: 'Snelkeuze per leerjaar' }),
    ]);
    const presetRow = el('div', { class: 'parent-btn-row' });
    for (const preset of PRESETS) {
      const btn = el('button', {
        class: 'parent-btn',
        text: preset.label,
        attrs: { type: 'button', 'data-preset': preset.id },
      });
      cleanups.push(
        onTap(
          btn,
          () => applyNext(applyPreset(current, options.catalog, preset.id as PresetId)),
          { now: options.now },
        ),
      );
      presetRow.append(btn);
    }
    presetCard.append(presetRow);
    root.append(presetCard);

    // Subjects, modules, levels, and topics
    for (const subject of options.catalog.subjects()) {
      const subjOn = isSubjectOn(current, subject);
      const subjCard = el('div', { class: 'parent-card' });

      const subjToggle = el('button', {
        class: `parent-btn ${subjOn ? 'parent-btn-primary' : ''}`.trim(),
        text: subjOn ? 'Aan' : 'Uit',
        attrs: {
          type: 'button',
          'aria-pressed': String(subjOn),
          'aria-label': `Vak ${subjectLabel(subject)}`,
        },
      });
      cleanups.push(
        onTap(subjToggle, () => applyNext(setSubjectOn(current, subject, !subjOn)), {
          now: options.now,
        }),
      );

      subjCard.append(
        el('div', { class: 'parent-row' }, [
          el('strong', { text: subjectLabel(subject) }),
          subjToggle,
        ]),
      );

      for (const bundle of options.catalog.modulesBySubject(subject)) {
        const modId = bundle.module.id;
        const modOn = isModuleOn(current, options.catalog, modId);
        const mCounts = moduleCounts(current, options.catalog, modId, options.progress);
        const activeLevels = new Set(moduleLevels(current, options.catalog, modId));
        const weight = moduleWeight(current, modId);

        const modBox = el('div', { class: 'parent-tree-group' });
        const countText = mCounts.hasOpenSums
          ? `Nieuwe sommen + ${mCounts.switchedOn} bewaard (${mCounts.mastered} beheerst)`
          : `${mCounts.switchedOn} vragen aan (${mCounts.mastered} beheerst)`;

        const weightSelect = el(
          'select',
          { class: 'parent-input', attrs: { 'aria-label': `Gewicht ${bundle.module.title}` } },
          [1, 2, 3, 4, 5].map((w) =>
            el('option', {
              text: `Gewicht ${w}`,
              attrs: {
                value: String(w),
                ...(weight === w ? { selected: 'selected' } : {}),
              },
            }),
          ),
        );
        weightSelect.value = String(weight);
        const onWeightChange = () =>
          applyNext(setModuleWeight(current, modId, Number(weightSelect.value)));
        weightSelect.addEventListener('change', onWeightChange);
        cleanups.push(() => weightSelect.removeEventListener('change', onWeightChange));

        const levelRow = el('div', { class: 'parent-level-pills' });
        for (const lv of bundle.module.levels) {
          const isOn = activeLevels.has(lv);
          const pill = el('button', {
            class: 'parent-level-pill',
            text: lv,
            attrs: {
              type: 'button',
              'aria-pressed': String(isOn),
              'aria-label': `${bundle.module.title} niveau ${lv}`,
            },
          });
          cleanups.push(
            onTap(
              pill,
              () => applyNext(toggleModuleLevel(current, options.catalog, modId, lv, !isOn)),
              { now: options.now },
            ),
          );
          levelRow.append(pill);
        }

        modBox.append(
          el('div', { class: 'parent-row' }, [
            el('span', { text: `${bundle.module.title} — ${countText}` }),
            weightSelect,
          ]),
          el('div', { class: 'parent-row' }, [el('span', { text: 'Niveaus:' }), levelRow]),
        );

        for (const topic of bundle.topics) {
          const tOn = isTopicOn(current, options.catalog, modId, topic.id);
          const tCounts = topicCounts(current, options.catalog, modId, topic.id, options.progress);
          const tBtn = el('button', {
            class: `parent-btn ${tOn ? 'parent-btn-primary' : ''}`.trim(),
            text: tOn ? 'Aan' : 'Uit',
            attrs: {
              type: 'button',
              'aria-pressed': String(tOn),
              'aria-label': `Onderwerp ${topic.title}`,
            },
          });
          cleanups.push(
            onTap(
              tBtn,
              () => applyNext(setTopicOn(current, modId, topic.id, !tOn)),
              { now: options.now },
            ),
          );
          const tInfo = tCounts.hasOpenSums
            ? `${topic.title} (nieuwe sommen${tCounts.switchedOn > 0 ? `, ${tCounts.switchedOn} bewaard` : ''})`
            : `${topic.title} (${tCounts.switchedOn} aan, ${tCounts.mastered} beheerst)`;
          modBox.append(
            el('div', { class: 'parent-row' }, [el('span', { text: tInfo }), tBtn]),
          );
        }

        if (!modOn) {
          modBox.style.opacity = '0.6';
        }
        subjCard.append(modBox);
      }

      root.append(subjCard);
    }
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
