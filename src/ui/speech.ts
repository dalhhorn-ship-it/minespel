// The speech line (v17): `say(text)` shows one short line at the top centre, under the top bar, for a few seconds.
// textContent only, aria-live polite, no taps. At most 3 lines wait; a 4th is dropped. Never near the hotbar or the
// Hakken and Bouwen buttons (it sits at the top). No sound here, no network.
import '../styles/speech.css';
import { registerHook } from '../dev/e2e-hooks';

export const MAX_WAITING = 3;
export const DEFAULT_SPEECH_MS = 2500;

/** Who says the line. `mole` lines (v22) get their own channel: V22b drops waiting mole lines when a new one comes. */
export type SpeechKind = 'mole';

interface Line {
  text: string;
  ms: number;
  kind?: SpeechKind;
}

/** One line that was shown, for the e2e hook `toastLog` (E2E builds only; V22b fills it). */
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
  n.textContent = line.text;
  n.hidden = false;
  timer = setTimeout(() => {
    timer = null;
    next();
  }, line.ms);
}

/** Shows `text` now, or after the line that is showing. At most 3 wait; more are dropped. `kind` is `mole` for the mole's own lines. */
export function say(text: string, ms: number = DEFAULT_SPEECH_MS, kind?: SpeechKind): void {
  if (typeof text !== 'string' || text.length === 0) return;
  const line: Line = { text, ms: Number.isFinite(ms) && ms > 0 ? ms : DEFAULT_SPEECH_MS, kind };
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
  node?.remove();
  node = null;
  toastEntries.length = 0;
}

if (__E2E__) registerHook('toastLog', () => toastEntries.map((e) => ({ ...e })));
