// The flat picture of one knight for the Uitrusten screen (AC261, v19): an inline SVG made of boxes in the look
// colours. No canvas and no second renderer. Each worn item changes one part of the picture.
import { wornItems, type GearItem, type Worn } from '../knights/gear';

const NS = 'http://www.w3.org/2000/svg';
const SILVER = '#b8c2cc';
const WOOD = '#a0703c';
const SKIN = '#f1c9a5';
const TUNIC = '#3f6fb5';
const LEGS = '#4a4a5a';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

function shape(tag: string, attrs: Record<string, string>, parent: Element): SVGElement {
  const node = document.createElementNS(NS, tag) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent.append(node);
  return node;
}

function box(parent: Element, part: string, x: number, y: number, w: number, h: number, fill: string, stroke = '#1f2d3d'): void {
  shape('rect', { x: String(x), y: String(y), width: String(w), height: String(h), rx: '3', fill, stroke, 'stroke-width': '2', 'data-part': part }, parent);
}

function drawHead(g: Element, item: GearItem | undefined): void {
  if (!item) {
    box(g, 'helm-default', 41, 12, 38, 14, SILVER);
    return;
  }
  const c = hex(item.look.color);
  if (item.look.shape === 'kap') {
    box(g, 'kap', 40, 12, 40, 16, c);
    box(g, 'kap-flap', 38, 26, 8, 14, c);
    box(g, 'kap-flap', 74, 26, 8, 14, c);
  } else {
    box(g, item.look.shape, 39, 8, 42, 20, c);
    box(g, `${item.look.shape}-shine`, 44, 11, 12, 5, hex(item.look.shine ?? item.look.color), 'none');
  }
}

function drawSchild(g: Element, item: GearItem): void {
  const c = hex(item.look.color);
  box(g, item.look.shape, 8, 52, 24, 32, c);
  if (item.look.shine) box(g, `${item.look.shape}-shine`, 12, 56, 7, 10, hex(item.look.shine), 'none');
  else box(g, `${item.look.shape}-band`, 8, 66, 24, 5, '#6d4a26', 'none');
}

function drawHand(g: Element, item: GearItem | undefined): void {
  if (!item) {
    box(g, 'sword-default', 92, 36, 6, 46, WOOD);
    box(g, 'sword-default-guard', 86, 78, 18, 5, '#6d4a26');
    return;
  }
  const c = hex(item.look.color);
  if (item.look.shape === 'veer') {
    box(g, 'veer', 92, 30, 8, 50, c);
    box(g, 'veer-tip', 88, 24, 16, 12, '#f8bbd0');
  } else {
    box(g, item.look.shape, 92, 30, 7, 52, c);
    box(g, `${item.look.shape}-guard`, 85, 78, 21, 5, '#8a6d1a');
    box(g, `${item.look.shape}-shine`, 94, 33, 3, 14, '#fff6c2', 'none');
  }
}

/** The knight, drawn with the worn items. Not a canvas: a `svg.knight-picture` of rects. */
export function createKnightPicture(worn: Worn | undefined): SVGElement {
  const svg = document.createElementNS(NS, 'svg') as SVGElement;
  svg.setAttribute('class', 'knight-picture');
  svg.setAttribute('viewBox', '0 0 130 180');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Plaatje van je ridder');
  const items = wornItems(worn);
  const at = (slot: string) => items.find((g) => g.slot === slot);
  const mount = at('rijdier');
  const rug = at('rug');
  const schild = at('schild');

  if (mount) {
    const p = shape('g', { 'data-part': 'pony' }, svg);
    const c = hex(mount.look.color);
    box(p, 'pony-body', 14, 126, 90, 28, c);
    box(p, 'pony-neck', 96, 108, 16, 30, c);
    box(p, 'pony-head', 100, 104, 24, 16, c);
    box(p, 'pony-mane', 90, 108, 8, 22, '#4a3320', 'none');
    for (const x of [18, 36, 74, 92]) box(p, 'pony-leg', x, 152, 10, 24, c);
  }

  const k = shape('g', { transform: mount ? 'translate(5,38)' : 'translate(5,70)' }, svg);
  if (rug) box(k, rug.look.shape, 36, 34, 48, 62, hex(rug.look.color));
  box(k, 'leg', 42, 94, 14, 26, LEGS);
  box(k, 'leg', 64, 94, 14, 26, LEGS);
  box(k, 'body', 38, 40, 44, 54, TUNIC);
  box(k, 'arm', 24, 44, 12, 34, TUNIC);
  box(k, 'arm', 84, 44, 12, 34, TUNIC);
  box(k, 'head', 42, 14, 36, 28, SKIN);
  box(k, 'eye', 51, 26, 4, 4, '#1f2d3d', 'none');
  box(k, 'eye', 65, 26, 4, 4, '#1f2d3d', 'none');
  drawHead(k, at('hoofd'));
  if (schild) drawSchild(k, schild);
  drawHand(k, at('hand'));
  return svg;
}
