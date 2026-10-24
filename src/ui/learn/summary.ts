// Summary card at the end of a learning break or Extra oefenen round (T36, AC34, AC116).
import type { SessionSummary } from '../../learning/break-session';
import { el } from '../dom';
import { onTap } from '../tap';

export interface SummaryViewOptions {
  summary: SessionSummary;
  /** True when the kid has enough points for at least one egg and is under the 12 shop dino cap (AC34). */
  canAffordEgg?: boolean;
  buttonLabel?: string;
  onFinish: () => void;
  now?: () => number;
}

export interface SummaryView {
  readonly element: HTMLElement;
  destroy(): void;
}

function formatEarned(earned: number): string {
  if (earned > 0) return earned === 1 ? '+1 punt verdiend' : `+${earned} punten verdiend`;
  if (earned < 0) return earned === -1 ? '-1 punt' : `${earned} punten`;
  return '0 punten erbij';
}

export function createSummaryView(options: SummaryViewOptions): SummaryView {
  const { summary } = options;
  const root = el('section', { class: 'break-summary', attrs: { 'aria-label': 'Samenvatting' } });

  if (summary.hard) {
    // AC116: 0 right answers -> kind message and total, no plus points, no bonus. A minus still shows (AC176).
    root.append(
      el('h2', {
        class: 'summary-title',
        text: 'Dit was lastig. Volgende keer gaat het vast beter!',
      }),
    );
    if (summary.earned < 0) {
      root.append(el('p', { class: 'summary-points points-minus', text: formatEarned(summary.earned) }));
    }
  } else {
    // AC34: K van de N goed, points earned, bonus if any, and new total.
    root.append(
      el('h2', {
        class: 'summary-title',
        text: `${summary.right} van de ${summary.total} goed!`,
      }),
    );
    const pointsText =
      summary.bonus > 0
        ? `${formatEarned(summary.earned)} (inclusief +${summary.bonus} bonus!)`
        : formatEarned(summary.earned);
    root.append(
      el('p', { class: summary.earned < 0 ? 'summary-points points-minus' : 'summary-points', text: pointsText }),
    );
  }

  root.append(
    el('p', {
      class: 'summary-total',
      text: `Totaal: ${summary.pointsTotal} ${summary.pointsTotal === 1 ? 'punt' : 'punten'}`,
    }),
  );

  if (options.canAffordEgg) {
    root.append(
      el('p', {
        class: 'summary-egg-hint',
        text: 'Je kunt een ei kopen in de Dinowinkel!',
      }),
    );
  }

  const button = el('button', {
    class: 'summary-done-btn',
    text: options.buttonLabel ?? 'Terug naar de wereld',
    attrs: { type: 'button' },
  });
  root.append(button);

  let acted = false;
  const off = onTap(
    button,
    () => {
      if (acted) return;
      acted = true;
      options.onFinish();
    },
    { now: options.now },
  );

  return {
    element: root,
    destroy() {
      off();
      root.remove();
    },
  };
}
