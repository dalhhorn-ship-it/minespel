// A tiny queue that runs async jobs one at a time, in the order they were added.
// A job that fails does not stop the next one.

export interface SerialQueue {
  /** Run `job` after every earlier job. Resolves after this job; never rejects. */
  run(job: () => Promise<unknown>): Promise<void>;
  /** Resolves when every job added so far has finished. */
  idle(): Promise<void>;
}

export function createSerialQueue(): SerialQueue {
  let tail: Promise<void> = Promise.resolve();
  return {
    run(job) {
      tail = tail.then(job).then(
        () => undefined,
        () => undefined,
      );
      return tail;
    },
    idle: () => tail,
  };
}
