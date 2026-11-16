// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createActorLabels, labelPoint, MAX_LABELS, type LabelStyle } from './actor-labels';

afterEach(() => {
  document.body.textContent = '';
});

function setup() {
  const container = document.createElement('div');
  document.body.append(container);
  return { container, labels: createActorLabels({ container }) };
}
const nodes = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('.actor-label')];

describe('actor labels (decision 144)', () => {
  it('makes at most 16 nodes, refuses a 17th, and reuses a freed node', () => {
    const { container, labels } = setup();
    for (let i = 0; i < MAX_LABELS; i++) expect(labels.show(`k${i}`, `t${i}`, 'speech')).toBe(true);
    expect(labels.show('extra', 'nee', 'zzz')).toBe(false);
    expect(nodes(container)).toHaveLength(16);
    labels.hide('k3');
    expect(labels.show('extra', 'ja', 'zzz')).toBe(true);
    expect(nodes(container)).toHaveLength(16);
    expect(labels.count()).toBe(16);
  });

  it('shows plain text only, never takes a tap, and has one class per style', () => {
    const { container, labels } = setup();
    const styles: LabelStyle[] = ['speech', 'zzz', 'sign', 'shield', 'snack'];
    styles.forEach((s, i) => labels.show(`k${i}`, '<b>Hihi!</b>', s));
    const all = nodes(container);
    expect(all[0]?.textContent).toBe('<b>Hihi!</b>');
    expect(container.querySelector('b')).toBeNull();
    all.forEach((n, i) => expect(n.classList.contains(`actor-label-${styles[i]}`)).toBe(true));
    // The stylesheet sets pointer-events none; the nodes are plain divs, never buttons or links.
    all.forEach((n) => expect(n.tagName === 'DIV' && !n.hasAttribute('tabindex')).toBe(true));
  });

  it('a label shows only once it has a point, and place null hides it', () => {
    const { container, labels } = setup();
    labels.show('a', 'Zzz', 'zzz');
    const n = nodes(container)[0] as HTMLElement;
    expect(n.hidden).toBe(true);
    labels.place('a', { x: 100.4, y: 50 });
    expect(n.hidden).toBe(false);
    expect(n.style.transform).toContain('translate(100px, 50px)');
    labels.place('a', null);
    expect(n.hidden).toBe(true);
  });

  it('writes no DOM when nothing changed', () => {
    const { container, labels } = setup();
    labels.show('a', 'Zzz', 'zzz');
    labels.place('a', { x: 10, y: 20 });
    const n = nodes(container)[0] as HTMLElement;
    const seen: MutationRecord[] = [];
    const obs = new MutationObserver((m) => seen.push(...m));
    obs.observe(container, { attributes: true, childList: true, characterData: true, subtree: true });
    labels.show('a', 'Zzz', 'zzz');
    labels.place('a', { x: 10, y: 20 });
    labels.place('a', { x: 10.2, y: 20.1 });
    labels.step(0.1);
    labels.setRunning(true);
    expect(obs.takeRecords()).toHaveLength(0);
    labels.place('a', { x: 11, y: 20 });
    expect(obs.takeRecords().length).toBeGreaterThan(0);
    obs.disconnect();
    expect(n.textContent).toBe('Zzz');
    expect(seen).toHaveLength(0);
  });

  it('hides everything while not running, keeps the times still, and shows again after', () => {
    const { container, labels } = setup();
    labels.show('a', 'Hihi!', 'speech', 1000);
    labels.place('a', { x: 5, y: 5 });
    const n = nodes(container)[0] as HTMLElement;
    labels.setRunning(false);
    expect(n.hidden).toBe(true);
    labels.step(5);
    labels.place('a', { x: 6, y: 6 });
    expect(n.hidden).toBe(true);
    labels.setRunning(true);
    expect(n.hidden).toBe(false);
    expect(labels.has('a')).toBe(true);
    labels.step(0.5);
    expect(labels.has('a')).toBe(true);
    labels.step(0.6);
    expect(labels.has('a')).toBe(false);
    expect(n.hidden).toBe(true);
  });

  it('a label with no time stays until hidden, and an empty text shows nothing', () => {
    const { labels } = setup();
    expect(labels.show('a', '', 'sign')).toBe(false);
    labels.show('a', 'Gevangen!', 'sign');
    labels.step(1000);
    expect(labels.has('a')).toBe(true);
    labels.hide('a');
    labels.hide('a');
    expect(labels.count()).toBe(0);
  });

  it('labelPoint hides a point behind the camera and beyond 16 blocks', () => {
    const pose = { x: 0, y: 10, z: 0, yaw: 0, pitch: 0 };
    expect(labelPoint(pose, 1000, 600, { x: 0, y: 10, z: 5 })).not.toBeNull();
    expect(labelPoint(pose, 1000, 600, { x: 0, y: 10, z: -5 })).toBeNull();
    expect(labelPoint(pose, 1000, 600, { x: 0, y: 10, z: 17 })).toBeNull();
  });
});
