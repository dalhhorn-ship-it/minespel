import { describe, expect, it, vi } from 'vitest';
import { shareFile, type ShareEnv } from './share';

const file = new File(['{}'], 'backup.json', { type: 'application/json' });

function env(over: Partial<ShareEnv>): ShareEnv {
  return {
    nav: {},
    open: vi.fn(() => ({})),
    createObjectURL: vi.fn(() => 'blob:x'),
    revokeObjectURL: vi.fn(),
    setTimeout: vi.fn(),
    ...over,
  };
}

describe('share helper (AC133)', () => {
  it('uses the share sheet when canShare allows files', async () => {
    const share = vi.fn(() => Promise.resolve());
    const e = env({ nav: { share, canShare: () => true } });
    expect(await shareFile(file, e)).toBe('shared');
    expect(share).toHaveBeenCalledWith({ files: [file] });
    expect(e.open).not.toHaveBeenCalled();
  });
  it('opens the new view when files cannot be shared, and revokes later', async () => {
    const e = env({ nav: { share: vi.fn(), canShare: () => false } });
    expect(await shareFile(file, e)).toBe('opened');
    expect(e.open).toHaveBeenCalledWith('blob:x');
    const fn = (e.setTimeout as ReturnType<typeof vi.fn>).mock.calls[0]![0] as () => void;
    fn();
    expect(e.revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });
  it('returns cancelled when the parent closes the sheet', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('x', 'AbortError')));
    const e = env({ nav: { share, canShare: () => true } });
    expect(await shareFile(file, e)).toBe('cancelled');
    expect(e.open).not.toHaveBeenCalled();
  });
  it('falls back to the new view when share fails for another reason', async () => {
    const share = vi.fn(() => Promise.reject(new Error('nope')));
    const e = env({ nav: { share, canShare: () => true } });
    expect(await shareFile(file, e)).toBe('opened');
  });
  it('returns failed when both fail', async () => {
    const e = env({ open: vi.fn(() => null) });
    expect(await shareFile(file, e)).toBe('failed');
    expect(e.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    const t = env({
      open: vi.fn(() => {
        throw new Error('x');
      }),
    });
    expect(await shareFile(file, t)).toBe('failed');
  });
});
