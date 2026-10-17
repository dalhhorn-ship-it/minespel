// Full replace of the save (T69): Alles wissen and Backup terugzetten. Everything runs inside queue.hold, so no
// flush can write old data while the new state goes in. One transaction over all stores writes the new state and
// clears the session record. Only after it succeeded the queue is stopped (still inside the hold, so flushes that
// waited see a stopped queue and write nothing) and the page reloads. If `write` fails, nothing changed, the
// queue keeps running and there is no reload.
import { request, transact } from '../storage/db';
import { STORE_NAMES } from '../storage/schema';
import type { AppEnv } from './app-env';

export interface ReplaceAllOptions {
  /** Injectable for tests. Default reloads the page. */
  reload?: () => void;
}

/** `write` must not open its own transaction. Rejects when the write fails. */
export async function replaceAll(
  env: Pick<AppEnv, 'db' | 'queue'>,
  write: (tx: IDBTransaction) => Promise<void> | void,
  options: ReplaceAllOptions = {},
): Promise<void> {
  const { db, queue } = env;
  if (!db) throw new Error('No storage to replace');
  const run = async () => {
    await transact(db, [...STORE_NAMES], 'readwrite', async (tx) => {
      await write(tx);
      await request(tx.objectStore('kv').delete('session'));
    });
    queue?.stop();
  };
  if (queue) await queue.hold(run);
  else await run();
  (options.reload ?? (() => window.location.reload()))();
}
