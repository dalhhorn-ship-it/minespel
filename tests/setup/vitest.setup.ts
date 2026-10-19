import 'fake-indexeddb/auto';

// jsdom has no 2D canvas. Code that paints must have a pure part that is unit tested.
if (typeof HTMLCanvasElement !== 'undefined') HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
