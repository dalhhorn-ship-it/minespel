// Summary screen of a break (AC34, AC116): "K van de N goed!", the points of this break, the new
// total, the egg hint, and "Terug naar de wereld". Texts are set with textContent only.
import '../../styles/break.css';
import type { SessionSummary } from '../../learning/break-session';
import { el } from '../dom';
import { onTap } from '../tap';

export const MSG_HARD = 'Dit was lastig. Volgende keer gaat het vast beter!';
export const MSG_EGG = 'Je kunt een ei kopen in de Dinowinkel!';

export const pointsText = (n: number): string => `${n} ${Math.abs(n) === 1 ? 'punt' : 'punten'}`;

export interface SummaryOptions {
  summary: SessionSummary;
  /** Preview (Probeer) earns nothing, so no points lines. */
  showPoints?: boolean;
  /** True when the new total pays for an egg the kid can buy. */
  canBuyEgg?: boolean;
  /** A cap message such as "Genoeg geoefend voor vandaag..." */
  message?: string | null;
  onDone: () => void;
  now?: () => number;
}

export interface SummaryView {
  element: HTMLElement;
  destroy(): void;
}

export function createSummary(options: SummaryOptions): SummaryView {
  const s = options.summary;
  const showPoints = options.showPoints !== false;
  const root = el('section', { class: 'break-summary', attrs: { 'aria-label': 'Klaar' } });

  if (s.hard) {
    root.append(el('h2', { class: 'summary-score summary-hard', text: MSG_HARD }));
  } else {
    root.append(el('h2', { class: 'summary-score', text: `${s.right} van de ${s.total} goed!` }));
  }

  if (showPoints) {
    const lines = el('div', { class: 'summary-lines' });
    if (!s.hard) {
      lines.append(el('p', { class: 'summary-earned', text: `Verdiend in deze pauze: ${pointsText(s.earned)}` }));
      if (s.bonus > 0) lines.append(el('p', { class: 'summary-bonus', text: `Bonus voor alles goed: +${s.bonus}` }));
    }
    lines.append(el('p', { class: 'summary-total', text: `Je hebt nu ${pointsText(s.pointsTotal)}` }));
    root.append(lines);
    if (options.message) root.append(el('p', { class: 'summary-note', text: options.message }));
    if (options.canBuyEgg) root.append(el('p', { class: 'summary-egg', text: MSG_EGG }));
  }

  const button = el('button', { class: 'break-button', text: 'Terug naar de wereld', attrs: { type: 'button' } });
  root.append(button);
  let done = false;
  const off = onTap(
    button,
    () => {
      if (done) return;
      done = true;
      options.onDone();
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
