// The speech line (v17): `say(text)` shows one short line at the top centre, under the top bar, for a few seconds.
// textContent only, aria-live polite, no taps. At most 3 lines wait; a 4th is dropped. Never near the hotbar or the
// Hakken and Bouwen buttons (it sits at the top). No sound here, no network.
import '../styles/speech.css';
import { registerHook } from '../dev/e2e-hooks';

export const MAX_WAITING = 3;
export const DEFAULT_SPEECH_MS = 2500;

/** Who says the line. `mole` lines (v22) get their own channel: they go before other lines, in order, and cut what shows. */
export type SpeechKind = 'mole';

interface Line {
  text: string;
  ms: number;
  kind?: SpeechKind;
}

/** Longest a showing line of another kind runs on once a mole line is waiting (AC293). */
export const MOLE_CUT_MS = 1000;
/**
 * Longest a showing mole line runs on once a newer mole line comes (AC293, AC330). A little under `MOLE_CUT_MS`, so every
 * mole line shows within 1 second of the one before it, timer jitter included: the old Pas op, the rumble, "terug" and the help line.
 */
export const MOLE_FOLLOW_MS = 900;

/** One line that was shown, for the e2e hook `toastLog` (E2E builds only). */
export interface ToastLogEntry {
  text: string;
  /** Loop ms of play time when it showed. */
  playMs: number;
}
const toastEntries: ToastLogEntry[] = [];
/** The lines shown so far, oldest first. The same array every call. */
export const toastLog = (): readonly ToastLogEntry[] => toastEntries;

let node: HTMLElement | null = null;
let queue: Line[] = [];
let showing = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let shownKind: SpeechKind | undefined;
let endsAt = 0;
let playClock: () => number = () => Math.round(performance.now());

/** The clock `toastLog` stamps its lines with, in loop ms of play time (boot passes the monster system's). Default: page time. */
export function setSpeechClock(fn: (() => number) | null): void {
  playClock = fn ?? (() => Math.round(performance.now()));
}

function ensureNode(): HTMLElement {
  if (node && node.isConnected) return node;
  node = document.createElement('div');
  node.className = 'speech-line';
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('role', 'status');
  node.hidden = true;
  document.body.append(node);
  return node;
}

function next(): void {
  const line = queue.shift();
  const n = ensureNode();
  if (!line) {
    showing = false;
    n.hidden = true;
    n.textContent = '';
    return;
  }
  showing = true;
  shownKind = line.kind;
  // A mole line with another mole line waiting runs on at most `MOLE_FOLLOW_MS` (the pair of one event, AC293, AC330).
  const ms = line.kind === 'mole' && queue.some((l) => l.kind === 'mole') ? Math.min(line.ms, MOLE_FOLLOW_MS) : line.ms;
  endsAt = Date.now() + ms;
  n.textContent = line.text;
  n.hidden = false;
  if (__E2E__) toastEntries.push({ text: line.text, playMs: playClock() });
  timer = setTimeout(() => {
    timer = null;
    next();
  }, ms);
}

/** Cuts the line that shows to at most `ms` more. */
function cutShowing(ms: number): void {
  if (!timer || endsAt - Date.now() <= ms) return;
  clearTimeout(timer);
  endsAt = Date.now() + ms;
  timer = setTimeout(() => {
    timer = null;
    next();
  }, ms);
}

/**
 * Shows `text` now, or after the line that is showing. At most 3 wait; more are dropped. `kind` is `mole` for the
 * mole's own lines (AC293): they keep their order, go before every line of another kind, and a line of another kind that
 * shows is cut to at most 1000 ms more. A mole line that shows is cut to at most 900 ms more, so every mole line of one
 * event (and the next event's first one) shows within 1 second.
 */
export function say(text: string, ms: number = DEFAULT_SPEECH_MS, kind?: SpeechKind): void {
  if (typeof text !== 'string' || text.length === 0) return;
  const line: Line = { text, ms: Number.isFinite(ms) && ms > 0 ? ms : DEFAULT_SPEECH_MS, kind };
  if (kind === 'mole') {
    // After the mole lines that wait (their order is the order of the events), before every other line.
    let at = 0;
    while (at < queue.length && queue[at]?.kind === 'mole') at++;
    queue.splice(at, 0, line);
    // Over the cap the oldest waiting mole line goes (the newest event is the one that counts); with none, the last line.
    while (queue.length > MAX_WAITING) {
      if (queue[0]?.kind === 'mole' && queue[0] !== line) queue.shift();
      else queue.pop();
    }
    if (!showing) next();
    else cutShowing(shownKind === 'mole' ? MOLE_FOLLOW_MS : MOLE_CUT_MS);
    return;
  }
  if (!showing) {
    queue.push(line);
    next();
    return;
  }
  if (queue.length < MAX_WAITING) queue.push(line);
}

/** Empties the line and the queue. For tests and for a world reset. */
export function clearSpeech(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  queue = [];
  showing = false;
  shownKind = undefined;
  node?.remove();
  node = null;
  toastEntries.length = 0;
}

if (__E2E__) registerHook('toastLog', () => toastEntries.map((e) => ({ ...e })));
