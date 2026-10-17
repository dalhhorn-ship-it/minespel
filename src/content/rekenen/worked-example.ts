// Worked examples for the Rekenen teach moment (PRD 4.10, AC146). Short Dutch steps for kids of
// 8 to 10, with the topic's strategy: splitsen, rijgen, tafeltrucs, delen als omgekeerd keer.
// Pure. The last step always ends with "= answer".
import { formatNumber, formatTenths } from '../../core/numbers';

/** The sum behind a Rekenen item. Decimal sums hold whole tenths (34 means 3,4). */
export type Sum =
  | { kind: 'plus' | 'min'; a: number; b: number; decimal: boolean }
  | { kind: 'keer'; a: number; b: number }
  | { kind: 'deel'; n: number; d: number };

export interface WorkedStep {
  /** One short sentence. */
  text: string;
  /** The calculation of this step, for example "47 + 30 = 77". */
  sum: string;
}

export interface WorkedExample {
  steps: WorkedStep[];
  /** The right answer as plain text, comma decimals, no thin space. Same as the last step ends with. */
  answer: string;
}

const f = (n: number): string => formatNumber(n);
const plain = (n: number): string => String(n);

/** 38 becomes [30, 8], 1204 becomes [1000, 200, 4]. Zero parts are left out. */
export function placeParts(n: number): number[] {
  const parts: number[] = [];
  let unit = 1;
  while (unit * 10 <= n) unit *= 10;
  for (let u = unit; u >= 1; u /= 10) {
    const digit = Math.floor(n / u) % 10;
    if (digit > 0) parts.push(digit * u);
  }
  return parts;
}

const joinPlus = (parts: number[]): string => parts.map(f).join(' + ');

function plusSteps(a: number, b: number): WorkedStep[] {
  const parts = placeParts(b);
  const steps: WorkedStep[] = [];
  if (parts.length > 1) {
    steps.push({ text: `Splits ${f(b)} in ${parts.length} stukken.`, sum: `${f(b)} = ${joinPlus(parts)}` });
  }
  let run = a;
  for (const p of parts) {
    const next = run + p;
    const ones = run % 10;
    let text: string;
    if (p < 10 && ones + p > 10) {
      const fill = 10 - ones;
      text = `Via de tien: eerst ${f(fill)} erbij tot ${f(run + fill)}, dan nog ${f(p - fill)}.`;
    } else {
      text = `Tel ${f(p)} erbij.`;
    }
    steps.push({ text, sum: `${f(run)} + ${f(p)} = ${f(next)}` });
    run = next;
  }
  return steps;
}

function minSteps(a: number, b: number): WorkedStep[] {
  const parts = placeParts(b);
  const steps: WorkedStep[] = [];
  if (parts.length > 1) {
    steps.push({ text: `Splits ${f(b)} in ${parts.length} stukken.`, sum: `${f(b)} = ${joinPlus(parts)}` });
  }
  let run = a;
  for (const p of parts) {
    const next = run - p;
    const ones = run % 10;
    let text: string;
    if (p < 10 && ones > 0 && ones < p) {
      text = `Via de tien: eerst ${f(ones)} eraf tot ${f(run - ones)}, dan nog ${f(p - ones)}.`;
    } else {
      text = `Haal ${f(p)} eraf.`;
    }
    steps.push({ text, sum: `${f(run)} - ${f(p)} = ${f(next)}` });
    run = next;
  }
  return steps;
}

function decimalSteps(a: number, b: number, sign: '+' | '-'): WorkedStep[] {
  const r = sign === '+' ? a + b : a - b;
  return [
    {
      text: 'Reken in tienden. Een komma-getal is een aantal tienden.',
      sum: `${formatTenths(a)} = ${plain(a)} tienden en ${formatTenths(b)} = ${plain(b)} tienden`,
    },
    {
      text: sign === '+' ? 'Tel de tienden bij elkaar.' : 'Haal de tienden van elkaar af.',
      sum: `${plain(a)} ${sign} ${plain(b)} = ${plain(r)}`,
    },
    { text: 'Maak er weer een komma-getal van.', sum: `${plain(r)} tienden = ${formatTenths(r)}` },
  ];
}

/** Tafeltrucs for a table fact a x b (both 1 to 10). */
function factSteps(a: number, b: number): WorkedStep[] {
  const r = a * b;
  const half = (a * 10) / 2;
  if (a === 1 || b === 1) {
    return [{ text: 'Keer 1 verandert niets.', sum: `${f(a)} × ${f(b)} = ${f(r)}` }];
  }
  if (a === 10 || b === 10) {
    const other = a === 10 ? b : a;
    return [
      { text: `Keer 10: zet een 0 achter ${f(other)}.`, sum: `${f(a)} × ${f(b)} = ${f(r)}` },
    ];
  }
  if (b === 2) {
    return [
      { text: 'Keer 2 is dubbel.', sum: `${f(a)} + ${f(a)} = ${f(r)}` },
    ];
  }
  if (b === 5) {
    return [
      { text: `Keer 10 is makkelijk.`, sum: `${f(a)} × 10 = ${f(a * 10)}` },
      { text: 'Keer 5 is de helft van keer 10.', sum: `${f(a * 10)} : 2 = ${f(r)}` },
    ];
  }
  if (b === 3) {
    return [
      { text: 'Splits 3 in 2 en 1.', sum: '3 = 2 + 1' },
      { text: `${f(a)} × 2 is dubbel, ${f(a)} × 1 blijft ${f(a)}.`, sum: `${f(a)} × 2 = ${f(a * 2)}` },
      { text: 'Tel de stukken bij elkaar.', sum: `${f(a * 2)} + ${f(a)} = ${f(r)}` },
    ];
  }
  if (b % 2 === 0) {
    const h = b / 2;
    return [
      { text: `Splits ${f(b)} in twee gelijke stukken.`, sum: `${f(b)} = ${f(h)} + ${f(h)}` },
      { text: `Reken ${f(a)} × ${f(h)} uit.`, sum: `${f(a)} × ${f(h)} = ${f(a * h)}` },
      { text: 'Tel de twee stukken bij elkaar.', sum: `${f(a * h)} + ${f(a * h)} = ${f(r)}` },
    ];
  }
  // b is 7 or 9: 5 plus a rest.
  const rest = b - 5;
  return [
    { text: `Splits ${f(b)} in 5 en ${f(rest)}.`, sum: `${f(b)} = 5 + ${f(rest)}` },
    { text: `Keer 5 is de helft van keer 10: ${f(a * 10)} : 2.`, sum: `${f(a)} × 5 = ${f(half)}` },
    { text: `Reken ${f(a)} × ${f(rest)} uit.`, sum: `${f(a)} × ${f(rest)} = ${f(a * rest)}` },
    { text: 'Tel de stukken bij elkaar.', sum: `${f(half)} + ${f(a * rest)} = ${f(r)}` },
  ];
}

function keerSteps(a: number, b: number): WorkedStep[] {
  const r = a * b;
  if (a <= 10) return factSteps(a, b);
  if (a % 10 === 0) {
    const t = a / 10;
    return [
      { text: `${f(a)} is ${f(t)} tientallen. Reken eerst ${f(t)} × ${f(b)}.`, sum: `${f(t)} × ${f(b)} = ${f(t * b)}` },
      { text: `${f(t * b)} tientallen is ${f(r)}.`, sum: `${f(a)} × ${f(b)} = ${f(r)}` },
    ];
  }
  const tens = a - (a % 10);
  const ones = a % 10;
  return [
    { text: `Splits ${f(a)} in ${f(tens)} en ${f(ones)}.`, sum: `${f(a)} = ${f(tens)} + ${f(ones)}` },
    { text: `Reken ${f(tens)} × ${f(b)} uit.`, sum: `${f(tens)} × ${f(b)} = ${f(tens * b)}` },
    { text: `Reken ${f(ones)} × ${f(b)} uit.`, sum: `${f(ones)} × ${f(b)} = ${f(ones * b)}` },
    { text: 'Tel de twee stukken bij elkaar.', sum: `${f(tens * b)} + ${f(ones * b)} = ${f(r)}` },
  ];
}

function deelSteps(n: number, d: number): WorkedStep[] {
  const q = n / d;
  if (q <= 10) {
    return [
      { text: 'Delen is omgekeerd keer. Welke keer-som hoort erbij?', sum: `${f(d)} × ? = ${f(n)}` },
      { text: `Zoek het antwoord in de tafel van ${f(d)}.`, sum: `${f(d)} × ${f(q)} = ${f(n)}` },
      { text: 'Dus de deel-som is:', sum: `${f(n)} : ${f(d)} = ${f(q)}` },
    ];
  }
  if (q % 10 === 0) {
    const t = n / 10;
    return [
      { text: `${f(n)} is ${f(t)} tientallen. Deel eerst de tientallen.`, sum: `${f(t)} : ${f(d)} = ${f(q / 10)}` },
      { text: `${f(q / 10)} tientallen is ${f(q)}.`, sum: `${f(n)} : ${f(d)} = ${f(q)}` },
    ];
  }
  const tens = q - (q % 10);
  const ones = q % 10;
  const big = d * tens;
  const small = n - big;
  return [
    { text: `Haal een groot stuk weg dat goed deelbaar is: ${f(d)} × ${f(tens)}.`, sum: `${f(d)} × ${f(tens)} = ${f(big)}` },
    { text: `Dit blijft over: ${f(n)} - ${f(big)}.`, sum: `${f(n)} - ${f(big)} = ${f(small)}` },
    { text: 'Deel het restant.', sum: `${f(small)} : ${f(d)} = ${f(ones)}` },
    { text: 'Tel de twee antwoorden bij elkaar.', sum: `${f(tens)} + ${f(ones)} = ${f(q)}` },
  ];
}

/** The answer of a sum as plain text (comma decimals, no thin space). */
export function answerOf(sum: Sum): string {
  switch (sum.kind) {
    case 'plus':
      return sum.decimal ? plainTenths(sum.a + sum.b) : plain(sum.a + sum.b);
    case 'min':
      return sum.decimal ? plainTenths(sum.a - sum.b) : plain(sum.a - sum.b);
    case 'keer':
      return plain(sum.a * sum.b);
    case 'deel':
      return plain(sum.n / sum.d);
  }
}

/** Whole tenths as plain text: 91 is "9,1", 30 is "3". Never a thin space. */
export function plainTenths(t: number): string {
  const whole = Math.floor(t / 10);
  const tenth = t % 10;
  return tenth ? `${whole},${tenth}` : String(whole);
}

export function workedExample(sum: Sum): WorkedExample {
  let steps: WorkedStep[];
  switch (sum.kind) {
    case 'plus':
      steps = sum.decimal ? decimalSteps(sum.a, sum.b, '+') : plusSteps(sum.a, sum.b);
      break;
    case 'min':
      steps = sum.decimal ? decimalSteps(sum.a, sum.b, '-') : minSteps(sum.a, sum.b);
      break;
    case 'keer':
      steps = keerSteps(sum.a, sum.b);
      break;
    case 'deel':
      steps = deelSteps(sum.n, sum.d);
      break;
  }
  return { steps, answer: answerOf(sum) };
}
