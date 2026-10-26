// Voortgang (decision 115): the parent sees the week report, charts over time, every topic and the hardest
// questions. Behind the parent gate, worked out on the iPad, nothing leaves the device.
// Charts are small inline SVGs: one measure per chart, a recessive grid, a title per bar for a tap or hover,
// and every chart has its numbers in a table below it.
import { addDays } from '../../core/clock';
import {
  minutes,
  type DayTime,
  type ProgressStats,
  type TopicStats,
  type WeekNumbers,
} from '../../learning/progress-stats';
import { el } from '../dom';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export interface ProgressScreenOptions {
  stats: ProgressStats;
}

export interface ProgressScreen {
  readonly element: HTMLElement;
  destroy(): void;
}

/** "26 okt" for a day key. */
export function shortDay(day: string): string {
  const [, m, d] = day.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ''}`;
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, text?: string) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A bar with a rounded top and a square foot on the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

interface BarSeries {
  name: string;
  cls: string;
  values: readonly (number | null)[];
}

interface BarChartOptions {
  label: string;
  labels: readonly string[];
  series: readonly BarSeries[];
  max: number;
  /** Text for a value in a title and on the axis. */
  format: (v: number) => string;
  /** Gridlines at these values. */
  ticks: readonly number[];
  testId: string;
}

/** A bar chart in SVG. More than one series: grouped bars with a 2px gap and a legend above. */
function barChart(o: BarChartOptions): HTMLElement {
  const W = 640;
  const H = 220;
  const left = 44;
  const bottom = 28;
  const top = 12;
  const plotW = W - left - 8;
  const plotH = H - top - bottom;
  const n = o.labels.length;
  const slot = plotW / Math.max(1, n);
  const groupW = Math.min(slot * 0.7, 18 * o.series.length + 2 * (o.series.length - 1));
  const barW = (groupW - 2 * (o.series.length - 1)) / o.series.length;
  const max = o.max > 0 ? o.max : 1;
  const yOf = (v: number) => top + plotH - (Math.min(v, max) / max) * plotH;

  const root = svg('svg', {
    viewBox: `0 0 ${W} ${H}`,
    class: 'progress-chart',
    role: 'img',
    'aria-label': o.label,
    'data-testid': o.testId,
  });
  for (const t of o.ticks) {
    const y = yOf(t);
    root.append(svg('line', { x1: left, x2: W - 8, y1: y, y2: y, class: 'progress-grid' }));
    root.append(svg('text', { x: left - 6, y: y + 4, class: 'progress-axis', 'text-anchor': 'end' }, o.format(t)));
  }
  root.append(svg('line', { x1: left, x2: W - 8, y1: top + plotH, y2: top + plotH, class: 'progress-baseline' }));

  const every = n > 7 ? 2 : 1;
  o.labels.forEach((label, i) => {
    const cx = left + slot * i + slot / 2;
    if ((n - 1 - i) % every === 0) {
      root.append(svg('text', { x: cx, y: H - 8, class: 'progress-axis', 'text-anchor': 'middle' }, label));
    }
    const titles = o.series.map((s) => `${s.name}: ${s.values[i] === null ? 'geen' : o.format(s.values[i] ?? 0)}`);
    const group = svg('g', { class: 'progress-bar-group' });
    group.append(svg('title', {}, `${label}. ${titles.join(', ')}`));
    // A hit area as tall as the plot, so a finger finds the bar.
    group.append(svg('rect', { x: left + slot * i, y: top, width: slot, height: plotH, class: 'progress-hit' }));
    o.series.forEach((s, j) => {
      const v = s.values[i];
      if (v === null || v === undefined || v <= 0) return;
      const x = cx - groupW / 2 + j * (barW + 2);
      const y = yOf(v);
      group.append(svg('path', { d: barPath(x, y, barW, top + plotH - y), class: `progress-bar ${s.cls}` }));
    });
    root.append(group);
  });

  const wrap = el('figure', { class: 'progress-figure' });
  if (o.series.length > 1) {
    wrap.append(
      el(
        'div',
        { class: 'progress-legend' },
        o.series.map((s) =>
          el('span', { class: 'progress-legend-item' }, [el('span', { class: `progress-swatch ${s.cls}` }), el('span', { text: s.name })]),
        ),
      ),
    );
  }
  wrap.append(root as unknown as HTMLElement);
  return wrap;
}

function table(head: readonly string[], rows: readonly (readonly string[])[], testId?: string): HTMLElement {
  return el('table', { class: 'progress-table', attrs: testId ? { 'data-testid': testId } : {} }, [
    el('thead', {}, [el('tr', {}, head.map((h) => el('th', { text: h })))]),
    el('tbody', {}, rows.map((r) => el('tr', {}, r.map((c) => el('td', { text: c }))))),
  ]);
}

function asTable(summary: string, content: HTMLElement): HTMLElement {
  return el('details', { class: 'progress-details' }, [el('summary', { text: summary }), content]);
}

const pctText = (v: number | null) => (v === null ? '–' : `${v}%`);

function arrow(now: number | null, before: number | null): string {
  if (now === null || before === null || now === before) return '';
  return now > before ? ' ↑' : ' ↓';
}

function tile(label: string, value: string, before: string, testId: string): HTMLElement {
  return el('div', { class: 'progress-tile', attrs: { 'data-testid': testId } }, [
    el('span', { class: 'progress-tile-label', text: label }),
    el('span', { class: 'progress-tile-value', text: value }),
    el('span', { class: 'progress-tile-before', text: `vorige week ${before}` }),
  ]);
}

function weekReport(stats: ProgressStats): HTMLElement {
  const { thisWeek: w, lastWeek: l, lines } = stats.report;
  const range = `${shortDay(w.start)} tot en met ${shortDay(addDays(w.start, 6))}`;
  return el('section', { class: 'parent-card progress-report', attrs: { 'data-testid': 'progress-week-report' } }, [
    el('h3', { class: 'progress-title', text: `Weekrapport (${range})` }),
    el('ul', { class: 'progress-lines' }, lines.map((t) => el('li', { text: t }))),
    el('div', { class: 'progress-tiles' }, [
      tile('Vragen', `${w.questions}${arrow(w.questions, l.questions)}`, String(l.questions), 'progress-tile-questions'),
      tile('Meteen goed', `${pctText(w.pct)}${arrow(w.pct, l.pct)}`, pctText(l.pct), 'progress-tile-pct'),
      tile('Leertijd', `${minutes(w.learnMs)} min`, `${minutes(l.learnMs)} min`, 'progress-tile-learn'),
      tile('Speeltijd', `${minutes(w.playMs)} min`, `${minutes(l.playMs)} min`, 'progress-tile-play'),
      tile('Leerpauzes', String(w.breaks), String(l.breaks), 'progress-tile-breaks'),
      tile('Punten verdiend', String(w.pointsEarned), String(l.pointsEarned), 'progress-tile-earned'),
      tile('Punten uitgegeven', String(w.pointsSpent), String(l.pointsSpent), 'progress-tile-spent'),
    ]),
  ]);
}

function weeksCharts(weeks: readonly WeekNumbers[]): HTMLElement {
  const labels = weeks.map((w) => shortDay(w.start));
  const maxQ = Math.max(10, ...weeks.map((w) => w.questions));
  const step = maxQ <= 50 ? 10 : maxQ <= 200 ? 50 : 100;
  const topQ = Math.ceil(maxQ / step) * step;
  const qTicks: number[] = [];
  for (let v = 0; v <= topQ; v += step) qTicks.push(v);
  return el('section', { class: 'parent-card' }, [
    el('h3', { class: 'progress-title', text: 'Meteen goed per week (laatste 12 weken)' }),
    barChart({
      label: 'Percentage meteen goed per week',
      labels,
      series: [{ name: 'Meteen goed', cls: 'progress-s1', values: weeks.map((w) => w.pct) }],
      max: 100,
      format: (v) => `${v}%`,
      ticks: [0, 25, 50, 75, 100],
      testId: 'progress-chart-pct',
    }),
    el('h3', { class: 'progress-title', text: 'Vragen per week' }),
    barChart({
      label: 'Aantal vragen per week',
      labels,
      series: [{ name: 'Vragen', cls: 'progress-s1', values: weeks.map((w) => w.questions) }],
      max: topQ,
      format: (v) => String(v),
      ticks: qTicks,
      testId: 'progress-chart-questions',
    }),
    asTable(
      'Toon de weken als tabel',
      table(
        ['Week van', 'Vragen', 'Meteen goed', 'Leertijd', 'Speeltijd'],
        weeks.map((w) => [shortDay(w.start), String(w.questions), pctText(w.pct), `${minutes(w.learnMs)} min`, `${minutes(w.playMs)} min`]),
      ),
    ),
  ]);
}

function daysChart(days: readonly DayTime[]): HTMLElement {
  const maxMin = Math.max(10, ...days.map((d) => Math.max(minutes(d.learnMs), minutes(d.playMs))));
  const step = maxMin <= 40 ? 10 : maxMin <= 120 ? 30 : 60;
  const top = Math.ceil(maxMin / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return el('section', { class: 'parent-card' }, [
    el('h3', { class: 'progress-title', text: 'Leren en spelen per dag (minuten, laatste 14 dagen)' }),
    barChart({
      label: 'Minuten leren en spelen per dag',
      labels: days.map((d) => shortDay(d.day)),
      series: [
        { name: 'Leren', cls: 'progress-s1', values: days.map((d) => minutes(d.learnMs)) },
        { name: 'Spelen', cls: 'progress-s2', values: days.map((d) => minutes(d.playMs)) },
      ],
      max: top,
      format: (v) => `${v} min`,
      ticks,
      testId: 'progress-chart-days',
    }),
    asTable(
      'Toon de dagen als tabel',
      table(
        ['Dag', 'Leren', 'Spelen'],
        days.map((d) => [shortDay(d.day), `${minutes(d.learnMs)} min`, `${minutes(d.playMs)} min`]),
      ),
    ),
  ]);
}

const TREND_TEXT: Record<NonNullable<TopicStats['trend']>, string> = {
  beter: '↑ beter',
  lager: '↓ lager',
  gelijk: '→ gelijk',
};

function topicsTable(topics: readonly TopicStats[]): HTMLElement {
  const rows = topics.map((t) => {
    const p = t.pct30 ?? t.pctAll ?? 0;
    const fill = el('span', { class: 'progress-meter-fill' });
    fill.style.width = `${p}%`;
    return el('tr', { attrs: { 'data-topic': `${t.moduleId}/${t.topic}` } }, [
      el('td', { text: t.label }),
      el('td', { text: String(t.answered) }),
      el('td', {}, [
        el('span', { class: 'progress-meter', attrs: { 'aria-hidden': 'true' } }, [fill]),
        el('span', { text: pctText(t.pct30) }),
      ]),
      el('td', { text: pctText(t.pctAll) }),
      el('td', { class: t.trend ? `progress-trend-${t.trend}` : '', text: t.trend ? TREND_TEXT[t.trend] : '–' }),
    ]);
  });
  return el('section', { class: 'parent-card' }, [
    el('h3', { class: 'progress-title', text: 'Per onderwerp' }),
    el('p', {
      class: 'progress-note',
      text: 'Meteen goed in de laatste 30 dagen en altijd. De trend vergelijkt de laatste 2 weken met de 2 weken ervoor.',
    }),
    topics.length === 0
      ? el('p', { text: 'Nog geen vragen beantwoord.' })
      : el('table', { class: 'progress-table', attrs: { 'data-testid': 'progress-topics' } }, [
          el('thead', {}, [
            el('tr', {}, ['Onderwerp', 'Vragen', '30 dagen', 'Altijd', 'Trend'].map((h) => el('th', { text: h }))),
          ]),
          el('tbody', {}, rows),
        ]),
  ]);
}

function hardList(stats: ProgressStats): HTMLElement {
  const items = stats.hard.map((h) =>
    el('li', { class: 'progress-hard-item' }, [
      el('div', { class: 'progress-hard-head' }, [
        el('strong', { text: h.prompt }),
        el('span', { class: 'progress-hard-count', text: `${h.wrong}× fout` }),
      ]),
      el('div', { class: 'progress-hard-meta', text: h.label }),
      el('div', { text: `Laatste antwoord: ${h.lastGiven || '(leeg)'}` }),
      ...(h.explain ? [el('div', { class: 'progress-hard-explain', text: h.explain })] : []),
    ]),
  );
  return el('section', { class: 'parent-card' }, [
    el('h3', { class: 'progress-title', text: 'Lastige vragen (laatste 30 dagen)' }),
    items.length === 0
      ? el('p', { text: 'Geen vragen fout bij de eerste keer. Knap!' })
      : el('ol', { class: 'progress-hard', attrs: { 'data-testid': 'progress-hard' } }, items),
  ]);
}

export function createProgressScreen(options: ProgressScreenOptions): ProgressScreen {
  const { stats } = options;
  const children: HTMLElement[] = [el('h2', { class: 'parent-section-title', text: 'Voortgang' })];
  if (stats.totalQuestions === 0 && stats.report.thisWeek.playMs === 0) {
    children.push(
      el('div', { class: 'parent-card', attrs: { 'data-testid': 'progress-empty' } }, [
        el('p', { text: 'Nog geen vragen beantwoord. Na de eerste leerpauze zie je hier de voortgang.' }),
      ]),
    );
  } else {
    children.push(weekReport(stats), weeksCharts(stats.weeks), daysChart(stats.days), topicsTable(stats.topics), hardList(stats));
  }
  const root = el('div', { class: 'progress', attrs: { 'data-testid': 'progress-screen' } }, children);
  return {
    element: root,
    destroy() {
      root.remove();
    },
  };
}
