// The speech line (v17): `say(text)` shows one short line at the top centre, under the top bar, for a few seconds.
// textContent only, aria-live polite, no taps. At most 3 lines wait; a 4th is dropped. Never near the hotbar or the
// Hakken and Bouwen buttons (it sits at the top). No sound here, no network.
import '../styles/speech.css';

export const MAX_WAITING = 3;
export const DEFAULT_SPEECH_MS = 2500;

interface Line {
  text: string;
  ms: number;
}

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

/** Shows `text` now, or after the line that is showing. At most 3 wait; more are dropped. */
export function say(text: string, ms: number = DEFAULT_SPEECH_MS): void {
  if (typeof text !== 'string' || text.length === 0) return;
  const line = { text, ms: Number.isFinite(ms) && ms > 0 ? ms : DEFAULT_SPEECH_MS };
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
}
