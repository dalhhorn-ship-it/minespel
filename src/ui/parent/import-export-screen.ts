// Parent Import & Export (T53a, AC194, AC195, AC197): Backup maken and Backup terugzetten.
// The backup file is made when the section opens, so the "Backup maken" tap can call shareFile at once:
// iPad Safari only shares inside a tap. Every message and every value from a file is set with textContent only.

import { pickFile as defaultPick, type PickOptions, type PickResult } from '../../platform/file-pick';
import { shareFile as defaultShare, type ShareResult } from '../../platform/share';
import { MAX_BACKUP_BYTES, type BackupData } from '../../storage/backup';
import { checkBackup } from '../../storage/backup-check';
import { el } from '../dom';
import { onTap } from '../tap';

export interface ImportExportOptions {
  /** ISO time of the last backup, or null. */
  lastBackup: string | null;
  /** Builds the file. Called once when the section opens. */
  prepare: () => Promise<File>;
  /** Saves the date of a backup that was shared or opened. Resolves the new ISO time. */
  onBackupMade: () => Promise<string | null>;
  /** The one safe replace and the reload. May throw: the screen then says nothing changed. */
  onRestore: (data: BackupData) => Promise<void>;
  share?: (file: File) => Promise<ShareResult>;
  pick?: (opts: PickOptions) => Promise<PickResult | null>;
  now?: () => number;
}

export interface ImportExportScreen {
  readonly element: HTMLElement;
  destroy(): void;
}

/** "15 november 2026" in local time. */
export function formatBackupDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

type Phase = 'idle' | 'confirm' | 'restoring';

export function createImportExportScreen(options: ImportExportOptions): ImportExportScreen {
  const share = options.share ?? defaultShare;
  const pick = options.pick ?? defaultPick;
  let file: File | null = null;
  let prepareFailed = false;
  let lastBackup = options.lastBackup;
  let phase: Phase = 'idle';
  let pending: BackupData | null = null;
  let message: { text: string; ok: boolean } | null = null;
  let destroyed = false;
  let cleanups: Array<() => void> = [];
  const root = el('div', { class: 'parent-import-export' });

  function render() {
    for (const c of cleanups) c();
    cleanups = [];
    root.replaceChildren();
    const button = (text: string, cls: string, testid: string, run: () => void, disabled = false) => {
      const b = el('button', { class: `parent-btn ${cls}`.trim(), text, attrs: { type: 'button', 'data-testid': testid } });
      if (disabled) b.setAttribute('aria-disabled', 'true');
      else cleanups.push(onTap(b, run, { now: options.now }));
      return b;
    };

    const card = el('div', { class: 'parent-card' });
    card.append(el('h3', { class: 'parent-card-title', text: 'Backup' }));
    const last = el('p', { attrs: { 'data-testid': 'last-backup' } });
    last.textContent = lastBackup ? `Laatste backup: ${formatBackupDate(lastBackup)}` : 'Nog geen backup gemaakt';
    card.append(last);

    if (phase === 'confirm' && pending) {
      const p = el('p', { attrs: { 'data-testid': 'restore-confirm', role: 'alert' } });
      p.textContent = `Alles op deze iPad wordt vervangen door de backup van ${formatBackupDate(pending.createdAt)}`;
      card.append(
        p,
        el('div', { class: 'parent-btn-row' }, [
          button('Terugzetten', 'parent-btn-danger', 'restore-yes', () => void doRestore()),
          button('Annuleren', '', 'restore-cancel', () => {
            pending = null;
            phase = 'idle';
            message = null;
            render();
          }),
        ]),
      );
    } else {
      const ready = file !== null && phase === 'idle';
      card.append(
        el('div', { class: 'parent-btn-row' }, [
          button('Backup maken', 'parent-btn-primary', 'backup-make', makeBackup, !ready),
          button('Backup terugzetten', '', 'backup-restore', () => void startRestore(), phase !== 'idle'),
        ]),
      );
      if (prepareFailed) {
        card.append(el('p', { class: 'parent-note', text: 'De backup kon niet gemaakt worden. Er is niets veranderd.' }));
      }
    }

    if (message) {
      const m = el('p', { class: message.ok ? 'parent-note' : 'parent-note parent-note-error', attrs: { role: 'alert', 'data-testid': 'backup-message' } });
      m.textContent = message.text;
      card.append(m);
    }
    root.append(el('h2', { class: 'parent-section-title', text: 'Import & Export' }), card);
  }

  /** Straight from the tap: the file is already made and nothing is awaited before shareFile. */
  function makeBackup() {
    const f = file;
    if (!f) return;
    const sharing = share(f);
    void sharing.then(async (result) => {
      if (destroyed) return;
      if (result === 'shared' || result === 'opened') {
        try {
          lastBackup = (await options.onBackupMade()) ?? lastBackup;
        } catch {
          /* the date is only a note */
        }
        message = { text: 'De backup is gemaakt.', ok: true };
      } else if (result === 'failed') {
        message = { text: 'De backup kon niet worden bewaard. Probeer het nog eens.', ok: false };
      } else {
        message = null;
      }
      render();
    });
  }

  async function startRestore() {
    message = null;
    const picked = await pick({ maxBytes: MAX_BACKUP_BYTES });
    if (destroyed || !picked) return;
    if (!picked.ok) {
      message = { text: picked.message, ok: false };
      render();
      return;
    }
    const checked = checkBackup(picked.text);
    if (!checked.ok) {
      message = { text: checked.message, ok: false };
      render();
      return;
    }
    pending = checked.data;
    phase = 'confirm';
    render();
  }

  async function doRestore() {
    const data = pending;
    if (!data) return;
    phase = 'restoring';
    render();
    try {
      await options.onRestore(data);
    } catch {
      if (destroyed) return;
      pending = null;
      phase = 'idle';
      message = { text: 'Terugzetten is niet gelukt. Er is niets veranderd.', ok: false };
      render();
    }
  }

  render();
  options
    .prepare()
    .then((f) => {
      file = f;
    })
    .catch(() => {
      prepareFailed = true;
    })
    .finally(() => {
      if (!destroyed) render();
    });

  return {
    element: root,
    destroy() {
      destroyed = true;
      for (const c of cleanups) c();
      cleanups = [];
      root.remove();
    },
  };
}
