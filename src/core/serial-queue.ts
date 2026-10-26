// A tiny queue that runs async jobs one at a time, in the order they were added.

export interface SerialQueue {
  /** Run `job` after all earlier jobs. Resolves after this job; a failed job does not stop the next. */
  run(job: () => Promise<unknown>): Promise<void>;
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
  };
}
