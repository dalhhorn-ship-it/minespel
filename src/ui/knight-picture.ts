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
  } else if (item.look.shape === 'plume-helm') {
    box(g, 'plume-helm', 39, 10, 42, 18, c);
    box(g, 'plume-helm-plume', 54, -4, 10, 16, hex(item.look.shine ?? 0xe91e63));
  } else {
    box(g, item.look.shape, 39, 8, 42, 20, c);
    box(g, `${item.look.shape}-shine`, 44, 11, 12, 5, hex(item.look.shine ?? item.look.color), 'none');
  }
}

function drawSchild(g: Element, item: GearItem): void {
  const c = hex(item.look.color);
  box(g, item.look.shape, 8, 52, 24, 32, c);
  if (item.look.shape === 'dragon-shield') {
    box(g, `${item.look.shape}-eye`, 14, 60, 7, 7, hex(item.look.shine ?? 0xf5d04a), 'none');
    box(g, `${item.look.shape}-horn`, 9, 47, 6, 8, '#c53030');
    box(g, `${item.look.shape}-horn`, 25, 47, 6, 8, '#c53030');
  } else if (item.look.shine) box(g, `${item.look.shape}-shine`, 12, 56, 7, 10, hex(item.look.shine), 'none');
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
  } else if (item.look.shape === 'staff') {
    box(g, 'staff', 93, 30, 6, 52, c);
    box(g, 'staff-ring', 88, 22, 16, 8, hex(item.look.shine ?? 0xcfe8ff));
    for (const [x, y, r] of [[96, 8, 5], [106, 16, 4]] as const) shape('circle', { cx: String(x), cy: String(y), r: String(r), fill: '#d6f1ff', stroke: '#7fb3d5', 'stroke-width': '1.5', 'data-part': 'staff-bubble' }, g);
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
  const lijf = at('lijf');
  const voeten = at('voeten');
  const vlag = at('vlag');

  if (mount) {
    const p = shape('g', { 'data-part': 'pony' }, svg);
    const c = hex(mount.look.color);
    if (mount.look.shape === 'triceratops') {
      box(p, 'triceratops-body', 10, 128, 92, 30, c);
      box(p, 'triceratops-head', 98, 134, 26, 20, c);
      box(p, 'triceratops-frill', 90, 114, 12, 38, hex(mount.look.shine ?? 0xe0a458));
      box(p, 'triceratops-horn', 118, 124, 5, 12, '#fff3d6', 'none');
      for (const x of [16, 38, 70, 88]) box(p, 'pony-leg', x, 156, 12, 20, '#4a3320');
    } else {
      box(p, 'pony-body', 14, 126, 90, 28, c);
      box(p, 'pony-neck', 96, 108, 16, 30, c);
      box(p, 'pony-head', 100, 104, 24, 16, c);
      box(p, 'pony-mane', 90, 108, 8, 22, '#4a3320', 'none');
      for (const x of [18, 36, 74, 92]) box(p, 'pony-leg', x, 152, 10, 24, c);
      if (mount.look.shape === 'horse') box(p, 'horse-tail', 6, 128, 8, 26, '#4a3320', 'none');
    }
  }

  if (vlag) {
    const f = hex(vlag.look.color);
    const pole = shape('g', { 'data-part': 'banner' }, svg);
    box(pole, 'banner-pole', 104, vlag.look.shine === undefined ? 40 : 30, 5, 100, WOOD);
    box(pole, 'banner-flag', 109, vlag.look.shine === undefined ? 44 : 34, 18, 14, f);
    if (vlag.look.shine !== undefined) box(pole, 'banner-top', 102, 24, 9, 9, hex(vlag.look.shine));
  }

  const k = shape('g', { transform: mount ? 'translate(5,38)' : 'translate(5,70)' }, svg);
  if (rug) box(k, rug.look.shape, 36, 34, 48, 62, hex(rug.look.color));
  box(k, 'leg', 42, 94, 14, 26, LEGS);
  box(k, 'leg', 64, 94, 14, 26, LEGS);
  if (voeten) {
    box(k, 'boots', 38, 110, 22, 10, hex(voeten.look.color));
    box(k, 'boots', 60, 110, 22, 10, hex(voeten.look.color));
  }
  const tunic = lijf ? hex(lijf.look.color) : TUNIC;
  box(k, lijf ? lijf.look.shape : 'body', 38, 40, 44, 54, tunic);
  if (lijf?.look.shape === 'mail') for (const y of [52, 64, 76]) box(k, 'mail-row', 38, y, 44, 4, '#6b7785', 'none');
  if (lijf?.look.shape === 'armour') box(k, 'armour-shine', 44, 46, 8, 36, hex(lijf.look.shine ?? 0xffffff), 'none');
  box(k, 'arm', 24, 44, 12, 34, tunic);
  box(k, 'arm', 84, 44, 12, 34, tunic);
  box(k, 'head', 42, 14, 36, 28, SKIN);
  box(k, 'eye', 51, 26, 4, 4, '#1f2d3d', 'none');
  box(k, 'eye', 65, 26, 4, 4, '#1f2d3d', 'none');
  drawHead(k, at('hoofd'));
  if (schild) drawSchild(k, schild);
  drawHand(k, at('hand'));
  return svg;
}
