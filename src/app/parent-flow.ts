// Parent flow orchestrator (T48b, T49, T50, T55):
// Opens the PIN gate when the parent taps the "Ouders" button (or lock icon),
// then shows the Parent Shell and restores the underlying kid screen on close.

import type { Sound } from '../audio/sound';
import type { Catalog } from '../content/catalog';
import type { Clock } from '../core/clock';
import type { Rng } from '../core/rng';
import type { LogStore } from '../storage/log-store';
import type { ProgressStore } from '../storage/progress-store';
import type { Records } from '../storage/records';
import { createExamStopCard, type ExamStopCard } from '../ui/parent/exam-stop-card';
import { createGateScreen, type GateScreen } from '../ui/parent/gate-screen';
import { createParentShell, type ParentSectionId, type ParentShell } from '../ui/parent/parent-shell';
import type { BreakFlow } from './break-flow';
import type { ScreenManager } from './screens';
import { applySettingsToRuntime } from './settings-apply';
import type { TimerDriver } from './timer-driver';

/** Structural view of the exam flow, so this file never imports exam-flow.ts. */
export interface ParentExams {
  isActive(): boolean;
  plan(moduleId: string, examId: string): { wanted: number; real: number };
  start(moduleId: string, examId: string): Promise<void> | void;
  stop(): Promise<void> | void;
}

export interface ParentFlowOptions {
  clock: Clock;
  rng: Rng;
  screens: ScreenManager;
  records: Records;
  progressStore: ProgressStore;
  logStore: LogStore;
  getCatalog: () => Catalog;
  breakFlow: BreakFlow;
  timerDriver?: TimerDriver;
  exams?: ParentExams;
  sound?: Sound;
  onResetWorld?: () => Promise<void> | void;
}

export interface ParentFlow {
  open(initialSection?: ParentSectionId): Promise<void>;
  /** Exam lock route: pin pad, then only the "Examen stoppen?" card (AC157, AC158). */
  openExamStop(): Promise<void>;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export function createParentFlow(options: ParentFlowOptions): ParentFlow {
  let gateView: GateScreen | null = null;
  let shellView: ParentShell | null = null;
  let stopCard: ExamStopCard | null = null;
  let openState = false;

  function clearViews() {
    if (gateView) {
      gateView.destroy();
      gateView = null;
    }
    if (shellView) {
      shellView.destroy();
      shellView = null;
    }
    if (stopCard) {
      stopCard.destroy();
      stopCard = null;
    }
  }

  function close() {
    clearViews();
    openState = false;
    options.screens.showParent(null);
  }

  async function openGate(forceSetPin: boolean, targetSection?: ParentSectionId) {
    clearViews();
    openState = true;
    const gateRecord = await options.records.get('gate');
    gateView = createGateScreen({
      records: options.records,
      clock: options.clock,
      rng: options.rng,
      initialRecord: gateRecord,
      forceSetPin,
      onUnlocked: () => {
        void openShell(targetSection);
      },
      onCancel: () => {
        close();
      },
    });
    options.screens.showParent(gateView.element);
  }

  async function openShell(initialSection?: ParentSectionId) {
    clearViews();
    openState = true;
    const [settings, switches, progress, breaks, stats] = await Promise.all([
      options.records.get('settings'),
      options.records.get('switches'),
      options.progressStore.list(),
      options.logStore.listBreaks(),
      options.records.get('stats'),
    ]);

    shellView = createParentShell({
      catalog: options.getCatalog(),
      settings,
      switches,
      progress,
      breaks,
      stats,
      isBreakActive: options.breakFlow.isActive(),
      isExamActive: options.exams?.isActive() ?? false,
      planFor: options.exams ? (m, e) => options.exams!.plan(m, e) : undefined,
      onStartExam: options.exams
        ? async (m, e) => {
            close();
            await options.exams!.start(m, e);
          }
        : undefined,
      initialSection,
      onUpdateSettings: async (next) => {
        await options.records.put('settings', next);
        applySettingsToRuntime(next, {
          sound: options.sound,
          timerDriver: options.timerDriver,
        });
      },
      onUpdateSwitches: async (next) => {
        await options.records.put('switches', next);
      },
      onStartBreakNow: async () => {
        close();
        if (!options.breakFlow.isActive()) {
          await options.breakFlow.startBreak();
        }
      },
      onEndBreakNow: async () => {
        if (options.breakFlow.isActive()) {
          await options.breakFlow.endBreakByParent();
        }
        close();
      },
      onChangePin: () => {
        void openGate(true, 'instellingen');
      },
      onResetWorld: options.onResetWorld
        ? async () => {
            await options.onResetWorld?.();
          }
        : undefined,
      onClose: () => {
        close();
      },
      now: () => options.clock.now(),
    });
    options.screens.showParent(shellView.element);
  }

  async function openExamStop() {
    clearViews();
    openState = true;
    const gateRecord = await options.records.get('gate');
    gateView = createGateScreen({
      records: options.records,
      clock: options.clock,
      rng: options.rng,
      initialRecord: gateRecord,
      onUnlocked: () => {
        clearViews();
        stopCard = createExamStopCard({
          onStop: () => {
            void (async () => {
              await options.exams?.stop();
              close();
            })();
          },
          onBack: () => close(),
          now: () => options.clock.now(),
        });
        options.screens.showParent(stopCard.element);
      },
      // Only the parent layer closes, so the exam layer stays as it was.
      onCancel: () => close(),
    });
    options.screens.showParent(gateView.element);
  }

  return {
    openExamStop,
    async open(initialSection) {
      await openGate(false, initialSection);
    },
    close,
    isOpen: () => openState,
    destroy() {
      clearViews();
      openState = false;
    },
  };
}
