// Pick a backup file with one hidden file input (T19, AC195 size part, AC133).

export const TOO_BIG_MESSAGE = 'Dit bestand is te groot.';

export type PickResult = { ok: true; name: string; text: string } | { ok: false; message: string };

export interface PickOptions {
  maxBytes: number;
  doc?: Document;
}

/** Resolves null when nothing is picked. A file over the limit is refused before it is read. */
export function pickFile(opts: PickOptions): Promise<PickResult | null> {
  const doc = opts.doc ?? document;
  return new Promise((resolve) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.hidden = true;
    let done = false;
    const finish = (r: PickResult | null) => {
      if (done) return;
      done = true;
      input.remove();
      resolve(r);
    };
    input.addEventListener('cancel', () => finish(null));
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return finish(null);
      if (file.size > opts.maxBytes) return finish({ ok: false, message: TOO_BIG_MESSAGE });
      file.text().then(
        (text) => finish({ ok: true, name: file.name, text }),
        () => finish({ ok: false, message: 'Dit bestand kan niet gelezen worden.' }),
      );
    });
    doc.body.appendChild(input);
    input.click();
  });
}
