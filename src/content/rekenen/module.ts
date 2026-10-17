// The built in Rekenen module (PRD 4.10). Items are not stored: the generator makes them
// from ids like tafels:7x8 (ARCHITECTURE "Built in Rekenen"). So every topic has items: [].
import { APP_NAME, FORMAT_VERSION } from '../format';
import type { Exam, ModuleBundle, ModuleInfo, Topic } from '../format';
import { aftrekkenLesson, delenLesson, optellenLesson, tafelsLesson } from './lessons';

export const REKENEN_MODULE_ID = 'rekenen-basis';
export const REKENEN_GENERATOR = 'rekenen-basis';

/** Fixed, so the bundle is the same every time. */
export const REKENEN_CREATED_AT = '2026-10-17T00:00:00.000Z';

export const REKENEN_LEVELS = ['M6', 'E6', 'M7', 'E7'] as const;
export const REKENEN_TOPICS = ['optellen', 'aftrekken', 'tafels', 'delen'] as const;
export type RekenenTopicId = (typeof REKENEN_TOPICS)[number];

const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const M6_TABLES = [...range(1, 5), 10];
const E6_TABLES = range(6, 9);

/** Skills per topic and level, as in the ARCHITECTURE table. */
export const REKENEN_SKILLS: Readonly<Record<RekenenTopicId, Readonly<Record<string, readonly string[]>>>> = {
  optellen: { M6: ['plus'], E6: ['plus'], M7: ['plus'], E7: ['plus'] },
  aftrekken: { M6: ['min'], E6: ['min'], M7: ['min'], E7: ['min'] },
  tafels: {
    M6: M6_TABLES.map((n) => `tafel-${n}`),
    E6: E6_TABLES.map((n) => `tafel-${n}`),
    M7: ['tientallen-keer'],
    E7: ['twee-cijfers-keer'],
  },
  delen: {
    M6: M6_TABLES.map((n) => `deel-${n}`),
    E6: E6_TABLES.map((n) => `deel-${n}`),
    M7: ['tientallen-delen'],
    E7: ['drie-cijfers-delen'],
  },
};

/** All skills of a topic, in teaching order, without doubles. */
export function skillsOfTopic(topic: RekenenTopicId): string[] {
  return [...new Set(REKENEN_LEVELS.flatMap((lv) => REKENEN_SKILLS[topic][lv] ?? []))];
}

function exam(level: (typeof REKENEN_LEVELS)[number]): Exam {
  return {
    id: `rekentoets-${level.toLowerCase()}`,
    title: `Rekentoets ${level}`,
    levels: [level],
    questionCount: 20,
    timeLimitMinutes: 20,
    passPercent: 70,
    mix: { optellen: 1, aftrekken: 1, tafels: 1, delen: 1 },
  };
}

function info(): ModuleInfo {
  return {
    id: REKENEN_MODULE_ID,
    title: 'Rekenen basis',
    subject: 'rekenen',
    version: 1,
    language: 'nl',
    description: 'Plus, min, tafels en delen. De sommen worden steeds nieuw gemaakt.',
    levels: [...REKENEN_LEVELS],
    topics: [...REKENEN_TOPICS],
    generator: REKENEN_GENERATOR,
    exams: REKENEN_LEVELS.map(exam),
  };
}

function topics(): Topic[] {
  return [
    { id: 'optellen', title: 'Optellen', groups: [6, 7], lesson: optellenLesson, items: [] },
    { id: 'aftrekken', title: 'Aftrekken', groups: [6, 7], lesson: aftrekkenLesson, items: [] },
    { id: 'tafels', title: 'Tafels', groups: [6, 7], lesson: tafelsLesson, items: [] },
    { id: 'delen', title: 'Delen', groups: [6, 7], lesson: delenLesson, items: [] },
  ];
}

export const rekenenBundle: ModuleBundle = {
  app: APP_NAME,
  kind: 'module',
  formatVersion: FORMAT_VERSION,
  createdAt: REKENEN_CREATED_AT,
  module: info(),
  topics: topics(),
};
