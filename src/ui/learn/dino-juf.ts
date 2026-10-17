// Dino Juf: the small dino teacher in the corner of the break screen (PRD 4.5).
// A drawing made of SVG shapes, no image files. The mood changes the eyes and the mouth.
// It is decoration only: aria-hidden, never takes taps.
import '../../styles/break.css';

export type JufMood = 'happy' | 'think' | 'cheer';

export interface DinoJuf {
  element: HTMLElement;
  setMood(mood: JufMood): void;
  mood(): JufMood;
}

const NS = 'http://www.w3.org/2000/svg';

function shape(doc: Document, tag: string, attrs: Record<string, string>): SVGElement {
  const node = doc.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node as SVGElement;
}

export function createDinoJuf(doc: Document = document): DinoJuf {
  const root = doc.createElement('div');
  root.className = 'juf juf-happy';
  root.setAttribute('aria-hidden', 'true');

  const svg = shape(doc, 'svg', { viewBox: '0 0 120 120', width: '100%', height: '100%' });
  svg.append(
    shape(doc, 'ellipse', { cx: '60', cy: '78', rx: '38', ry: '30', fill: '#4caf50' }),
    shape(doc, 'circle', { cx: '60', cy: '46', r: '30', fill: '#66bb6a' }),
    shape(doc, 'path', { d: 'M38 22 L46 8 L54 22 Z M56 18 L64 4 L72 18 Z M74 22 L82 8 L90 24 Z', fill: '#2e7d32' }),
    shape(doc, 'circle', { cx: '49', cy: '44', r: '7', fill: '#fff' }),
    shape(doc, 'circle', { cx: '71', cy: '44', r: '7', fill: '#fff' }),
    shape(doc, 'circle', { class: 'juf-pupil', cx: '50', cy: '45', r: '3.5', fill: '#1f2d3d' }),
    shape(doc, 'circle', { class: 'juf-pupil', cx: '72', cy: '45', r: '3.5', fill: '#1f2d3d' }),
    shape(doc, 'path', { class: 'juf-mouth', d: 'M48 58 Q60 68 72 58', fill: 'none', stroke: '#1f2d3d', 'stroke-width': '3', 'stroke-linecap': 'round' }),
    // Glasses and a little teacher book.
    shape(doc, 'circle', { cx: '49', cy: '44', r: '10', fill: 'none', stroke: '#1f2d3d', 'stroke-width': '2.5' }),
    shape(doc, 'circle', { cx: '71', cy: '44', r: '10', fill: 'none', stroke: '#1f2d3d', 'stroke-width': '2.5' }),
    shape(doc, 'rect', { x: '44', y: '86', width: '32', height: '22', rx: '3', fill: '#ffb74d', stroke: '#8a3b00', 'stroke-width': '2' }),
  );
  root.append(svg);

  let current: JufMood = 'happy';
  const mouths: Record<JufMood, string> = {
    happy: 'M48 58 Q60 68 72 58',
    think: 'M50 62 L70 62',
    cheer: 'M46 56 Q60 76 74 56 Z',
  };
  return {
    element: root,
    mood: () => current,
    setMood(mood) {
      current = mood;
      root.className = `juf juf-${mood}`;
      svg.querySelector('.juf-mouth')?.setAttribute('d', mouths[mood]);
    },
  };
}
