// Checks a module bundle. Same rules as docs/modules/validate.py (tests/unit/validators-agree.test.ts
// proves both give the same verdict). Messages are Dutch, for parents. Every message names the place.
import { MAX_WORDS, MIN_ITEMS_PER_LEVEL } from './format';

export interface ValidateOptions {
  /** Built in and imported modules: also demand MIN_ITEMS_PER_LEVEL items per topic and level. */
  builtIn?: boolean;
}

export interface ValidationResult {
  ok: boolean;
  /** Dutch messages, one per problem. Empty when ok. */
  problems: string[];
}

const ITEM_TYPES = ['choice', 'find-error', 'type', 'punctuate'];
const COMMON = ['id', 'type', 'level', 'skill', 'prompt', 'explain'];
const COMMON_NL: Record<string, string> = {
  id: 'id',
  type: 'soort vraag',
  level: 'niveau',
  skill: 'onderdeel (skill)',
  prompt: 'vraagtekst',
  explain: 'uitleg',
};

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const words = (s: string): string[] => s.split(/\s+/).filter((w) => w !== '');
const stringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Every sentence an item shows: sentence, else words joined, else each option. */
function textsOf(it: Obj): string[] {
  if (isText(it.sentence)) return [words(it.sentence).join(' ')];
  const w = it.words;
  if (Array.isArray(w) && w.length > 0 && stringList(w)) return [w.join(' ')];
  const o = it.options;
  if (stringList(o)) return o.map((x) => words(x).join(' '));
  return [];
}

/** What makes a question the same question. */
const identityOf = (it: Obj): string => textsOf(it).sort().join(' | ');

export function validateBundle(input: unknown, options: ValidateOptions = {}): ValidationResult {
  const problems: string[] = [];
  const err = (where: string, msg: string) => problems.push(`${where}: ${msg}`);
  const done = (): ValidationResult => ({ ok: problems.length === 0, problems });

  if (!isObj(input)) {
    err('Bestand', 'dit is geen module');
    return done();
  }
  const mod = input.module;
  if (!isObj(mod)) {
    err('Module', 'het onderdeel "module" ontbreekt');
    return done();
  }
  const levels: unknown[] = Array.isArray(mod.levels) ? mod.levels : [];
  if (levels.length === 0 || !levels.every(isText)) err('Module', 'levels moet een lijst met niveaus zijn');
  for (const key of ['id', 'title', 'subject', 'language']) {
    if (!isText(mod[key])) err('Module', `"${key}" ontbreekt of is leeg`);
  }
  const topicIds: unknown[] = Array.isArray(mod.topics) ? mod.topics : [];
  if (!Array.isArray(mod.topics)) err('Module', 'topics moet een lijst zijn');
  const bundleTopics: unknown[] = Array.isArray(input.topics) ? input.topics : [];
  if (!Array.isArray(input.topics)) err('Module', 'het onderdeel "topics" ontbreekt');
  if (bundleTopics.length > topicIds.length) err('Module', 'er zijn meer onderwerpen dan in de lijst van de module staan');
  const generated = isText(mod.generator);

  const idCount = new Map<string, number>();
  const moduleSeen = new Map<string, string>();
  const pool = new Map<string, Obj[]>();

  topicIds.forEach((topicId, n) => {
    const topic = bundleTopics[n];
    const label = `Onderwerp ${String(topicId)}`;
    if (!isObj(topic)) {
      err(label, 'het onderwerp ontbreekt');
      return;
    }
    if (topic.id !== topicId) err(label, `id "${String(topic.id)}" past niet bij de plek in de lijst`);
    if (!isText(topic.title)) err(label, 'titel ontbreekt');
    checkLesson(label, topic.lesson);

    const items: unknown[] = Array.isArray(topic.items) ? topic.items : [];
    if (!Array.isArray(topic.items)) err(label, 'items moet een lijst zijn');
    const seenQ = new Set<string>();
    const objs: Obj[] = [];
    items.forEach((raw, i) => {
      if (!isObj(raw)) {
        err(label, `vraag ${i + 1} is geen geldige vraag`);
        return;
      }
      objs.push(raw);
      const id = typeof raw.id === 'string' ? raw.id : '';
      const where = `${label}, vraag ${id || i + 1}`;
      idCount.set(id, (idCount.get(id) ?? 0) + 1);
      checkItem(where, raw, levels);
      const q = JSON.stringify([raw.prompt ?? null, raw.sentence ?? null, raw.words ?? null, raw.options ?? null]);
      if (seenQ.has(q)) err(where, 'dezelfde vraag staat twee keer in dit onderwerp');
      seenQ.add(q);
      const sentence = identityOf(raw);
      if (sentence) {
        const key = JSON.stringify([raw.prompt ?? null, sentence]);
        const first = moduleSeen.get(key);
        if (first !== undefined) err(where, `dezelfde vraagtekst en zin als vraag ${first}`);
        else moduleSeen.set(key, id || String(i + 1));
      }
    });
    if (options.builtIn && !generated) {
      for (const lv of levels) {
        const have = objs.filter((o) => o.level === lv).length;
        if (have < MIN_ITEMS_PER_LEVEL) {
          err(label, `maar ${have} vragen op niveau ${String(lv)}, het moeten er minstens ${MIN_ITEMS_PER_LEVEL} zijn`);
        }
      }
    }
    pool.set(String(topicId), objs);
  });

  for (const [id, count] of idCount) {
    if (count > 1) err('Module', `id "${id}" wordt ${count} keer gebruikt`);
  }

  if (!generated) {
    const exams: unknown[] = Array.isArray(mod.exams) ? mod.exams : [];
    for (const ex of exams) {
      if (!isObj(ex)) continue;
      const where = `Examen ${String(ex.id)}`;
      const mix = isObj(ex.mix) ? ex.mix : {};
      const weights = Object.values(mix).filter((w): w is number => typeof w === 'number');
      const total = weights.reduce((a, b) => a + b, 0);
      const count = typeof ex.questionCount === 'number' ? ex.questionCount : 0;
      const exLevels: unknown[] = Array.isArray(ex.levels) ? ex.levels : [];
      for (const [topic, weight] of Object.entries(mix)) {
        const items = pool.get(topic);
        if (!items) {
          err(where, `de mix noemt het onbekende onderwerp "${topic}"`);
          continue;
        }
        const need = total > 0 && typeof weight === 'number' ? Math.ceil((count * weight) / total) : 0;
        const have = items.filter((it) => exLevels.includes(it.level)).length;
        if (have < need) err(where, `onderwerp ${topic} heeft ${have} vragen op deze niveaus, er zijn er ${need} nodig`);
      }
    }
  }

  return done();

  function checkLesson(where: string, lesson: unknown): void {
    const pages = isObj(lesson) ? lesson.pages : undefined;
    if (!Array.isArray(pages) || pages.length === 0) {
      err(where, 'de les heeft minstens één pagina nodig');
      return;
    }
    pages.forEach((p: unknown, n) => {
      const w = `${where}, lespagina ${n + 1}`;
      if (!isObj(p)) {
        err(w, 'geen geldige pagina');
        return;
      }
      if (!isText(p.title)) err(w, 'titel ontbreekt');
      if (!isText(p.text)) err(w, 'tekst ontbreekt');
      const ex = p.examples;
      if (!(Array.isArray(ex) && ex.length > 0 && ex.every((e) => isObj(e) && isText(e.good)))) {
        err(w, 'er is minstens één voorbeeld met "good" nodig');
      }
      if ('skill' in p && !isText(p.skill)) err(w, 'skill mag niet leeg zijn');
    });
  }

  function checkItem(where: string, it: Obj, lvls: unknown[]): void {
    for (const key of COMMON) {
      if (!isText(it[key])) err(where, `"${COMMON_NL[key]}" ontbreekt of is leeg`);
    }
    const t = it.type;
    if (typeof t !== 'string' || !ITEM_TYPES.includes(t)) {
      err(where, `onbekend soort vraag "${String(t)}"`);
      return;
    }
    if (!lvls.includes(it.level)) err(where, `niveau "${String(it.level)}" hoort niet bij de niveaus van de module`);
    const limit = typeof it.level === 'string' ? MAX_WORDS[it.level] : undefined;
    const nWords = Math.max(0, ...textsOf(it).map((s) => words(s).length));
    if (limit !== undefined && nWords > limit) {
      err(where, `de zin heeft ${nWords} woorden, op niveau ${String(it.level)} mogen het er ${limit} zijn`);
    }

    if (t === 'choice') {
      const opts = it.options;
      if (!(Array.isArray(opts) && opts.length >= 2 && opts.length <= 4 && opts.every(isText))) {
        err(where, 'een meerkeuzevraag heeft 2 tot 4 antwoorden die niet leeg zijn');
        return;
      }
      if (new Set(opts.map((o) => o.trim())).size !== opts.length) err(where, 'twee antwoorden zijn gelijk');
      const a = it.answer;
      if (!(isInt(a) && a >= 0 && a < opts.length)) err(where, 'het goede antwoord moet een plek in de antwoorden zijn');
    } else if (t === 'find-error') {
      const w = it.words;
      if (!(Array.isArray(w) && w.length > 0 && w.every((x) => isText(x) && !/\s/.test(x)))) {
        err(where, 'words moet een lijst met losse woorden zijn');
        return;
      }
      const a = it.answer;
      if (!(isInt(a) && a >= -1 && a < w.length)) {
        err(where, 'het goede antwoord moet -1 zijn of een plek in de woorden');
      } else if (a === -1) {
        if (it.correction !== null && it.correction !== undefined) err(where, 'correction moet leeg (null) zijn als er geen fout is');
      } else {
        const c = it.correction;
        if (!isText(c)) err(where, 'correction is nodig als een woord fout is');
        else if (c === w[a]) err(where, 'de verbetering is hetzelfde als het foute woord');
      }
    } else if (t === 'type') {
      const a = it.answer;
      if (!(Array.isArray(a) && a.length > 0 && a.every(isText))) {
        err(where, 'een typevraag heeft minstens één goed antwoord nodig (een lijst met tekst)');
      }
    } else {
      const w = it.words;
      if (!(Array.isArray(w) && w.length >= 2 && w.every((x) => isText(x) && !/\s/.test(x)))) {
        err(where, 'words moet een lijst zijn met minstens 2 losse woorden');
        return;
      }
      if (!isText(it.mark)) err(where, 'mark ontbreekt');
      const a = it.answer;
      if (!(Array.isArray(a) && a.every((i) => isInt(i) && i >= 0 && i < w.length - 1))) {
        err(where, 'answer moet plekken noemen tussen 0 en het aantal woorden min 2');
      } else if (new Set(a).size !== a.length) {
        err(where, 'answer noemt een plek dubbel');
      } else {
        const mark = typeof it.mark === 'string' ? it.mark : '';
        for (const i of a as number[]) {
          if ((w[i] as string).endsWith(mark)) err(where, `woord ${i} eindigt al op het teken, het kind kan het niet zetten`);
        }
      }
    }
  }
}
