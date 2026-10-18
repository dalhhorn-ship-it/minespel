// Parent PIN gate screen (T48b, AC73, AC74, AC75):
// - First time (no PIN set yet): a grown up sum in words first (same as PIN vergeten, shared lockout,
//   decision 52), then the parent chooses a 4-digit PIN and types it a second time to confirm.
// - Existing PIN: checks the 4-digit PIN with 3-wrong-tries 1-minute lockout.
// - "PIN vergeten?": asks a fresh Dutch word arithmetic question (`makeResetQuestion`),
//   with 2-wrong-tries 10-minute lockout, then lets the parent choose a new 4-digit PIN.

import '../../styles/parent.css';
import type { Clock } from '../../core/clock';
import type { Rng } from '../../core/rng';
import {
  blockMsLeft,
  checkPin,
  checkResetAnswer,
  hasPin,
  isValidPin,
  setPin,
} from '../../gate/pin';
import { isRightAnswer, makeResetQuestion, type ResetQuestion } from '../../gate/reset-question';
import type { Records } from '../../storage/records';
import type { GateRecord } from '../../storage/schema';
import { el } from '../dom';
import { onTap } from '../tap';

export interface GateScreenOptions {
  records: Pick<Records, 'get' | 'put'>;
  clock: Clock;
  rng: Rng;
  initialRecord: GateRecord;
  /** Force "choose a new PIN" mode (e.g. from Instellingen -> Pincode wijzigen). */
  forceSetPin?: boolean;
  onUnlocked: () => void;
  onCancel: () => void;
}

export interface GateScreen {
  readonly element: HTMLElement;
  destroy(): void;
}

type GateMode = 'enter-pin' | 'set-pin' | 'confirm-pin' | 'reset-question';

export function createGateScreen(options: GateScreenOptions): GateScreen {
  let record: GateRecord = { ...options.initialRecord };
  // forceSetPin comes from Instellingen, so the parent already passed the gate. A first PIN needs the sum.
  const firstPin = !options.forceSetPin && !hasPin(record);
  let mode: GateMode = options.forceSetPin
    ? 'set-pin'
    : !hasPin(record)
      ? 'reset-question'
      : 'enter-pin';
  let digits = '';
  let firstDigits = '';
  let statusMsg: string | null = null;
  let resetQuestion: ResetQuestion | null = null;
  let cleanups: Array<() => void> = [];

  const root = el('div', {
    class: 'parent parent-gate',
    attrs: { role: 'dialog', 'aria-label': 'Oudertoegang' },
  });

  function clearCleanups() {
    for (const c of cleanups) c();
    cleanups = [];
  }

  async function saveGateRecord(next: GateRecord) {
    record = next;
    await options.records.put('gate', record);
  }

  function formatBlockMessage(ms: number): string {
    const secs = Math.max(1, Math.ceil(ms / 1000));
    return `Te vaak fout geprobeerd. Wacht nog ${secs} seconden.`;
  }

  async function submitDigits() {
    const blocked = blockMsLeft(record, options.clock);
    if (blocked > 0) {
      statusMsg = formatBlockMessage(blocked);
      digits = '';
      render();
      return;
    }

    if (!isValidPin(digits)) return;

    if (mode === 'set-pin') {
      firstDigits = digits;
      digits = '';
      mode = 'confirm-pin';
      statusMsg = null;
      render();
      return;
    }

    if (mode === 'confirm-pin') {
      if (digits !== firstDigits) {
        digits = '';
        firstDigits = '';
        mode = 'set-pin';
        statusMsg = 'De twee pincodes zijn niet hetzelfde. Kies je pincode nog een keer.';
        render();
        return;
      }
      const next = setPin(record, digits, options.rng);
      await saveGateRecord(next);
      options.onUnlocked();
      return;
    }

    const outcome = checkPin(record, digits, options.clock);
    await saveGateRecord(outcome.record);
    digits = '';
    if (outcome.result === 'ok') {
      options.onUnlocked();
      return;
    }
    if (outcome.result === 'blocked') {
      statusMsg = formatBlockMessage(outcome.msLeft);
    } else {
      statusMsg = 'Onjuiste pincode. Probeer het opnieuw.';
    }
    render();
  }

  function onDigit(d: string) {
    const blocked = blockMsLeft(record, options.clock);
    if (blocked > 0) {
      statusMsg = formatBlockMessage(blocked);
      render();
      return;
    }
    if (digits.length >= 4) return;
    digits += d;
    statusMsg = null;
    render();
    if (digits.length === 4) {
      void submitDigits();
    }
  }

  function onBackspace() {
    if (digits.length > 0) {
      digits = digits.slice(0, -1);
      render();
    }
  }

  function render() {
    clearCleanups();
    root.replaceChildren();

    const blocked = blockMsLeft(record, options.clock);
    const card = el('div', { class: 'parent-gate-card' });

    if (mode === 'reset-question') {
      if (!resetQuestion) {
        resetQuestion = makeResetQuestion(options.rng);
      }
      const q = resetQuestion;
      const title = el('h2', {
        class: 'parent-gate-title',
        text: firstPin && !hasPin(record) ? 'Eerst een vraag voor grote mensen' : 'Pincode vergeten',
      });
      const prompt = el('p', { text: q.text });
      const input = el('input', {
        class: 'parent-input',
        attrs: {
          type: 'text',
          inputmode: 'numeric',
          placeholder: 'Antwoord in cijfers',
          'aria-label': 'Antwoord in cijfers',
        },
      });

      const msgEl =
        blocked > 0
          ? el('p', { class: 'parent-gate-msg', text: formatBlockMessage(blocked) })
          : statusMsg
            ? el('p', { class: 'parent-gate-msg', text: statusMsg })
            : null;

      const checkBtn = el('button', {
        class: 'parent-btn parent-btn-primary',
        text: 'Controleer',
        attrs: { type: 'button' },
      });
      const backBtn = el('button', {
        class: 'parent-btn',
        text: 'Terug',
        attrs: { type: 'button' },
      });

      cleanups.push(
        onTap(
          checkBtn,
          () => {
            void (async () => {
              const right = isRightAnswer(q, input.value);
              const out = checkResetAnswer(record, right, options.clock);
              await saveGateRecord(out.record);
              if (out.result === 'ok') {
                mode = 'set-pin';
                digits = '';
                statusMsg = 'Kies nu een nieuwe pincode van 4 cijfers.';
                resetQuestion = null;
                render();
                return;
              }
              resetQuestion = makeResetQuestion(options.rng);
              statusMsg =
                out.result === 'blocked'
                  ? formatBlockMessage(out.msLeft)
                  : 'Dat antwoord klopt niet. Probeer de nieuwe rekensom.';
              render();
            })();
          },
          { now: () => options.clock.now() },
        ),
      );

      cleanups.push(
        onTap(
          backBtn,
          () => {
            statusMsg = null;
            if (!hasPin(record)) {
              options.onCancel();
              return;
            }
            mode = 'enter-pin';
            render();
          },
          { now: () => options.clock.now() },
        ),
      );

      card.append(title, prompt, input);
      if (msgEl) card.append(msgEl);
      card.append(el('div', { class: 'parent-gate-footer' }, [backBtn, checkBtn]));
      root.append(card);
      return;
    }

    const titleText =
      mode === 'set-pin'
        ? 'Kies een pincode voor ouders (4 cijfers)'
        : mode === 'confirm-pin'
          ? 'Typ dezelfde pincode nog een keer'
          : 'Ouderscherm — Voer pincode in';
    const title = el('h2', { class: 'parent-gate-title', text: titleText });

    const dots = el(
      'div',
      { class: 'parent-gate-dots', attrs: { 'aria-label': `${digits.length} van 4 cijfers` } },
      [0, 1, 2, 3].map((i) =>
        el('span', { class: `parent-gate-dot${i < digits.length ? ' filled' : ''}` }),
      ),
    );

    const pad = el('div', { class: 'parent-gate-pad' });
    for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Wis', '0', 'Sluiten']) {
      const btn = el('button', {
        class: 'parent-gate-key',
        text: d,
        attrs: { type: 'button', 'data-key': d },
      });
      if (d === 'Wis') {
        cleanups.push(onTap(btn, onBackspace, { now: () => options.clock.now() }));
      } else if (d === 'Sluiten') {
        cleanups.push(onTap(btn, options.onCancel, { now: () => options.clock.now() }));
      } else {
        cleanups.push(onTap(btn, () => onDigit(d), { now: () => options.clock.now() }));
      }
      pad.append(btn);
    }

    card.append(title, dots);
    if (blocked > 0) {
      card.append(el('p', { class: 'parent-gate-msg', text: formatBlockMessage(blocked) }));
    } else if (statusMsg) {
      card.append(el('p', { class: 'parent-gate-msg', text: statusMsg }));
    }
    card.append(pad);

    if (mode === 'enter-pin') {
      const forgotBtn = el('button', {
        class: 'parent-btn',
        text: 'Pincode vergeten?',
        attrs: { type: 'button' },
      });
      cleanups.push(
        onTap(
          forgotBtn,
          () => {
            mode = 'reset-question';
            resetQuestion = makeResetQuestion(options.rng);
            statusMsg = null;
            render();
          },
          { now: () => options.clock.now() },
        ),
      );
      card.append(el('div', { class: 'parent-gate-footer' }, [forgotBtn]));
    }

    root.append(card);
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
