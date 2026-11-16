// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createImportExportScreen, formatBackupDate } from './import-export-screen';
import type { ImportExportOptions } from './import-export-screen';

function tap(el: Element | null | undefined) {
  if (!el) throw new Error('missing element');
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
}
const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
const q = (root: HTMLElement, id: string) => root.querySelector(`[data-testid="${id}"]`);
const FIXTURES = import.meta.glob('../../../tests/fixtures/backups/*', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const fixture = (n: string): string => FIXTURES[`../../../tests/fixtures/backups/${n}`] ?? '';

function make(over: Partial<ImportExportOptions> = {}) {
  let t = 0;
  const calls: string[] = [];
  const screen = createImportExportScreen({
    lastBackup: null,
    prepare: async () => new File(['{}'], 'dino-blokwereld-backup-2026-11-15.json'),
    onBackupMade: vi.fn(async () => '2026-11-15T10:00:00.000Z'),
    onRestore: vi.fn(async () => undefined),
    share: vi.fn(async () => {
      calls.push('share');
      return 'shared' as const;
    }),
    now: () => (t += 1000),
    ...over,
  });
  return { screen, root: screen.element, calls };
}

describe('Import & Export screen (T53a)', () => {
  it('AC194: says Nog geen backup gemaakt, then shows the date after Backup maken', async () => {
    const onBackupMade = vi.fn(async () => '2026-11-15T10:00:00.000Z');
    const { root } = make({ onBackupMade });
    expect(q(root, 'last-backup')?.textContent).toBe('Nog geen backup gemaakt');
    await flush();
    tap(q(root, 'backup-make'));
    await flush();
    expect(onBackupMade).toHaveBeenCalledOnce();
    expect(q(root, 'last-backup')?.textContent).toBe(`Laatste backup: ${formatBackupDate('2026-11-15T10:00:00.000Z')}`);
  });

  it('AC194: shareFile is called synchronously from the tap with the prepared file', async () => {
    const share = vi.fn<(f: File) => Promise<'cancelled'>>(async () => 'cancelled');
    const { root } = make({ share });
    await flush();
    tap(q(root, 'backup-make'));
    expect(share).toHaveBeenCalledOnce();
    expect(share.mock.calls[0]![0].name).toBe('dino-blokwereld-backup-2026-11-15.json');
  });

  it('AC194: a cancelled share does not save a date', async () => {
    const onBackupMade = vi.fn(async () => 'x');
    const { root } = make({ share: async () => 'cancelled', onBackupMade });
    await flush();
    tap(q(root, 'backup-make'));
    await flush();
    expect(onBackupMade).not.toHaveBeenCalled();
  });

  it('AC195: a bad file shows a plain text message and restores nothing', async () => {
    const onRestore = vi.fn();
    const pick = vi.fn(async () => ({ ok: true as const, name: 'x.json', text: fixture('bad-name-html.json') }));
    const { root } = make({ onRestore, pick });
    await flush();
    tap(q(root, 'backup-restore'));
    await flush();
    expect(q(root, 'backup-message')?.textContent).toMatch(/niets veranderd|niet klopt/);
    expect(root.querySelector('b, a')).toBeNull();
    expect(onRestore).not.toHaveBeenCalled();
  });

  it('AC195: a too big file message from the picker is shown', async () => {
    const pick = vi.fn(async () => ({ ok: false as const, message: 'Dit bestand is te groot.' }));
    const { root } = make({ pick });
    await flush();
    tap(q(root, 'backup-restore'));
    await flush();
    expect(q(root, 'backup-message')?.textContent).toBe('Dit bestand is te groot.');
  });

  it('AC197: a valid file asks to confirm with the date; Annuleren changes nothing, Terugzetten restores', async () => {
    const onRestore = vi.fn(async () => undefined);
    const pick = vi.fn(async () => ({ ok: true as const, name: 'x.json', text: fixture('v050-old-shapes.json') }));
    const { root } = make({ onRestore, pick });
    await flush();
    tap(q(root, 'backup-restore'));
    await flush();
    expect(q(root, 'restore-confirm')?.textContent).toMatch(/^Alles op deze iPad wordt vervangen door de backup van /);
    tap(q(root, 'restore-cancel'));
    expect(onRestore).not.toHaveBeenCalled();
    expect(q(root, 'restore-confirm')).toBeNull();
    tap(q(root, 'backup-restore'));
    await flush();
    tap(q(root, 'restore-yes'));
    await flush();
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it('AC197: a restore that throws says nothing changed', async () => {
    const pick = vi.fn(async () => ({ ok: true as const, name: 'x.json', text: fixture('v050-old-shapes.json') }));
    const { root } = make({ pick, onRestore: async () => { throw new Error('killed'); } });
    await flush();
    tap(q(root, 'backup-restore'));
    await flush();
    tap(q(root, 'restore-yes'));
    await flush();
    expect(q(root, 'backup-message')?.textContent).toContain('niets veranderd');
  });

  for (const name of ['bad-v0110-stone-id.json', 'bad-v0110-bought-not-found.json']) {
    it(`AC195 AC278: ${name} shows the friendly message and restores nothing`, async () => {
      const onRestore = vi.fn();
      const pick = vi.fn(async () => ({ ok: true as const, name: 'x.json', text: fixture(name) }));
      const { root } = make({ onRestore, pick });
      await flush();
      tap(q(root, 'backup-restore'));
      await flush();
      expect(q(root, 'backup-message')?.textContent).toMatch(/niets veranderd|niet klopt/);
      expect(q(root, 'restore-confirm')).toBeNull();
      expect(onRestore).not.toHaveBeenCalled();
    });
  }

  it('AC278: the 0.11.0 stones file asks to confirm', async () => {
    const pick = vi.fn(async () => ({ ok: true as const, name: 'x.json', text: fixture('v0110-stones.json') }));
    const { root } = make({ pick });
    await flush();
    tap(q(root, 'backup-restore'));
    await flush();
    expect(q(root, 'restore-confirm')).not.toBeNull();
  });
});
