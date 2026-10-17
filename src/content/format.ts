// The learning module format (docs/modules/README.md and ARCHITECTURE "How modules are loaded").
// Plain data types only. The rules live in validate.ts.

export const APP_NAME = 'Dino Blokwereld';
export const FORMAT_VERSION = 1;

export type ItemType = 'choice' | 'find-error' | 'type' | 'punctuate';

/** Cito and IEP style levels, easiest first. A module may list others, so this is a plain string. */
export type Level = string;

/** Longest sentence in words, per level (AC123). */
export const MAX_WORDS: Readonly<Record<string, number>> = { M6: 15, E6: 15, M7: 20, E7: 20 };

/** A built in or imported module needs at least this many items per topic and level. */
export const MIN_ITEMS_PER_LEVEL = 6;

interface ItemBase {
  /** Unique within the module. Never reused: progress is saved by id. */
  id: string;
  level: Level;
  /** The exact rule practised. Parents switch skills on and off. */
  skill: string;
  prompt: string;
  /** Feedback after the answer: the right answer and the rule. */
  explain: string;
}

export interface ChoiceItem extends ItemBase {
  type: 'choice';
  sentence?: string;
  options: string[];
  /** Index in options. */
  answer: number;
}

export interface FindErrorItem extends ItemBase {
  type: 'find-error';
  words: string[];
  /** Index of the wrong word, or -1 when there is no mistake. */
  answer: number;
  /** Right spelling of the wrong word, null when answer is -1. */
  correction: string | null;
}

export interface TypeItem extends ItemBase {
  type: 'type';
  sentence?: string;
  /** Every accepted answer. */
  answer: string[];
}

export interface PunctuateItem extends ItemBase {
  type: 'punctuate';
  /** The mark to place, a comma in v1. */
  mark: string;
  words: string[];
  /** Gap i is the space right after words[i]. May be empty. */
  answer: number[];
}

export type Item = ChoiceItem | FindErrorItem | TypeItem | PunctuateItem;

export interface LessonExample {
  good: string;
  bad?: string;
  why?: string;
}

export interface LessonPage {
  title: string;
  text: string;
  examples: LessonExample[];
  tip?: string;
  /** The item skill this page teaches. Teach moment shows the matching page, else the first. */
  skill?: string;
}

export interface Lesson {
  pages: LessonPage[];
}

export interface Exam {
  id: string;
  title: string;
  levels: Level[];
  questionCount: number;
  /** null for no time limit. */
  timeLimitMinutes: number | null;
  passPercent: number;
  /** Topic id to weight. */
  mix: Record<string, number>;
}

export interface ModuleInfo {
  id: string;
  title: string;
  subject: string;
  version: number;
  language: string;
  description?: string;
  levels: Level[];
  /** Topic ids in teaching order. */
  topics: string[];
  /** Built in code modules only (for example "rekenen-basis"): items come from code, not topic files. */
  generator?: string;
  exams: Exam[];
}

export interface Topic {
  id: string;
  title: string;
  /** School years (groep) the topic is for. */
  groups: number[];
  lesson: Lesson;
  items: Item[];
}

/** One module as one object. Also the export file. */
export interface ModuleBundle {
  app: typeof APP_NAME;
  kind: 'module';
  formatVersion: number;
  createdAt: string;
  module: ModuleInfo;
  /** Every topic, in module.topics order. */
  topics: Topic[];
}
