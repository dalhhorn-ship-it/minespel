// Left thumb stick. A floating stick: it starts where the thumb lands in the left half.
import { el } from '../ui/dom';
import type { PointerOwner } from './pointer-router';

export const STICK_RADIUS = 60; // points
export const STICK_DEADZONE = 0.15;

export interface Stick extends PointerOwner {
  /** x: -1 left to 1 right. y: -1 forward (finger up) to 1 back. Zero when idle. */
  vector(): { x: number; y: number };
  readonly element: HTMLElement;
}

export function createStick(): Stick {
  const knob = el('div', { class: 'stick-knob' });
  const element = el('div', { class: 'stick-base', attrs: { 'aria-hidden': 'true' } }, [knob]);
  element.hidden = true;
  let id: number | null = null;
  let ox = 0;
  let oy = 0;
  let vx = 0;
  let vy = 0;

  const reset = () => {
    id = null;
    vx = 0;
    vy = 0;
    element.hidden = true;
  };
  const update = (e: PointerEvent) => {
    let dx = e.clientX - ox;
    let dy = e.clientY - oy;
    const len = Math.hypot(dx, dy);
    if (len > STICK_RADIUS) {
      dx = (dx / len) * STICK_RADIUS;
      dy = (dy / len) * STICK_RADIUS;
    }
    const nx = dx / STICK_RADIUS;
    const ny = dy / STICK_RADIUS;
    const mag = Math.hypot(nx, ny);
    if (mag < STICK_DEADZONE) {
      vx = 0;
      vy = 0;
    } else {
      vx = nx;
      vy = ny;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  return {
    element,
    vector: () => ({ x: vx, y: vy }),
    down(e) {
      id = e.pointerId;
      ox = e.clientX;
      oy = e.clientY;
      element.style.left = `${ox}px`;
      element.style.top = `${oy}px`;
      element.hidden = false;
      update(e);
    },
    move(e) {
      if (e.pointerId === id) update(e);
    },
    up(e) {
      if (e.pointerId === id) reset();
    },
    cancel(e) {
      if (e.pointerId === id) reset();
    },
  };
}
