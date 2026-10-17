// A tiny fake AudioContext for unit tests. jsdom has none. It records what was started.

export interface FakeParam {
  value: number;
  setValueAtTime(v: number, t: number): FakeParam;
  linearRampToValueAtTime(v: number, t: number): FakeParam;
  exponentialRampToValueAtTime(v: number, t: number): FakeParam;
}

function param(): FakeParam {
  const p: FakeParam = {
    value: 0,
    setValueAtTime: () => p,
    linearRampToValueAtTime: () => p,
    exponentialRampToValueAtTime: () => p,
  };
  return p;
}

export interface FakeNode {
  connect(n: unknown): unknown;
  disconnect(): void;
}

export class FakeAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime = 0;
  sampleRate = 44100;
  destination: FakeNode = { connect: () => undefined, disconnect: () => undefined };
  resumeCalls = 0;
  /** Number of sources (oscillators and noise) that were started. */
  started = 0;
  /** Set to make every sound call throw, to test that sound never breaks the game. */
  broken = false;

  /** Simulates iOS suspending or interrupting the context when the app goes to the background. */
  suspend(): void {
    this.state = 'suspended';
  }

  resume(): Promise<void> {
    this.resumeCalls += 1;
    this.state = 'running';
    return Promise.resolve();
  }

  private node<T extends object>(extra: T): T & FakeNode {
    if (this.broken) throw new Error('fake audio is broken');
    return { connect: (n: unknown) => n, disconnect: () => undefined, ...extra };
  }

  createGain() {
    return this.node({ gain: param() });
  }

  createBiquadFilter() {
    return this.node({ type: 'lowpass', frequency: param(), Q: param() });
  }

  createOscillator() {
    return this.node({
      type: 'sine',
      frequency: param(),
      start: () => {
        this.started += 1;
      },
      stop: () => undefined,
    });
  }

  createBuffer(_channels: number, length: number) {
    if (this.broken) throw new Error('fake audio is broken');
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }

  createBufferSource() {
    return this.node({
      buffer: null as unknown,
      start: () => {
        this.started += 1;
      },
      stop: () => undefined,
    });
  }
}
