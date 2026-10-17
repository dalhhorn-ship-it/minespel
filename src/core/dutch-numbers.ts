// Whole numbers in Dutch words, for the PIN vergeten question. Pure.

const ONES = [
  'nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien',
  'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien',
];
const TENS = ['', '', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig', 'tachtig', 'negentig'];

function below100(n: number): string {
  if (n < 20) return ONES[n] as string;
  const unit = n % 10;
  const ten = TENS[Math.floor(n / 10)] as string;
  if (unit === 0) return ten;
  const u = ONES[unit] as string;
  // twee and drie take a diaeresis before "en": tweeëntwintig, drieëndertig.
  const joiner = unit === 2 || unit === 3 ? 'ën' : 'en';
  return `${u}${joiner}${ten}`;
}

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h === 0) return below100(rest);
  const head = h === 1 ? 'honderd' : `${ONES[h] as string}honderd`;
  return rest === 0 ? head : `${head}${below100(rest)}`;
}

/** 0 to 9999 as Dutch words, for example 21 is "eenentwintig". */
export function numberToDutch(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 9999) throw new RangeError(`Cannot spell ${n}`);
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  if (th === 0) return below1000(rest);
  const head = th === 1 ? 'duizend' : `${ONES[th] as string}duizend`;
  return rest === 0 ? head : `${head}${below1000(rest)}`;
}
