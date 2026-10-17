import { describe, expect, it } from "vitest";
import type { ChoiceItem, Item, TypeItem } from "../content/format";
import { createRng } from "../core/rng";
import { createExamTimer } from "../core/timers";
import {
  currentEntry,
  pickExamItems,
  questionNumber,
  reduce,
  restoreExam,
  reviewIndexes,
  splitByMix,
  startExam,
  type ExamConfig,
  type ExamEffect,
  type ExamEvent,
  type ExamState,
} from "./exam-session";

const DAY = "2026-10-17";

function item(i: number): ChoiceItem {
  return {
    id: `t${i}`,
    type: "choice",
    level: "M6",
    skill: "s",
    prompt: "p",
    explain: "e",
    options: ["a", "b"],
    answer: 0,
  };
}
const right = { type: "choice", index: 0 } as const;
const wrong = { type: "choice", index: 1 } as const;

function config(n: number, over: Partial<ExamConfig> = {}): ExamConfig {
  return {
    moduleId: "m",
    exam: { id: "e1", timeLimitMinutes: 20, passPercent: 70 },
    entries: Array.from({ length: n }, (_, i) => ({
      item: item(i),
      box: 0,
      topic: i % 2 ? "b" : "a",
    })),
    day: DAY,
    at: 1000,
    ...over,
  };
}

function run(
  state: ExamState,
  events: ExamEvent[],
): { state: ExamState; effects: ExamEffect[] } {
  let s = state;
  const effects: ExamEffect[] = [];
  for (const ev of events) {
    const r = reduce(s, ev);
    s = r.state;
    effects.push(...r.effects);
  }
  return { state: s, effects };
}

const answers = (kinds: ("r" | "w")[]): ExamEvent[] =>
  kinds.map((k, i) => ({
    type: "answer",
    at: 2000 + i * 1000,
    response: k === "r" ? right : wrong,
  }));

describe("start", () => {
  it("opens on question 1 with the full time (AC64)", () => {
    const { state } = startExam(config(10));
    expect(state.phase).toBe("question");
    expect(state.timeLimitMs).toBe(20 * 60_000);
    expect(state.msLeft).toBe(20 * 60_000);
    expect(questionNumber(state)).toBe(1);
    expect(currentEntry(state)?.item.id).toBe("t0");
  });
  it("continues with saved time left (AC71)", () => {
    const { state } = startExam(config(10, { msLeft: 18 * 60_000 }));
    expect(state.msLeft).toBe(18 * 60_000);
  });
  it("has no time without a limit", () => {
    const { state } = startExam(
      config(3, { exam: { id: "e", timeLimitMinutes: null, passPercent: 70 } }),
    );
    expect(state.msLeft).toBeNull();
    expect(reduce(state, { type: "tick", at: 1, msLeft: 0 }).state.phase).toBe(
      "question",
    );
  });
  it("an empty exam ends at once, not passed", () => {
    const { state, effects } = startExam(config(0));
    expect(state.phase).toBe("end");
    expect(state.result?.passed).toBe(false);
    expect(effects.some((e) => e.type === "goldenEgg")).toBe(false);
  });
});

describe("answering (AC65)", () => {
  it("moves on at once, no retry, no feedback phase, no way back", () => {
    const { state } = startExam(config(3));
    const r = reduce(state, { type: "answer", at: 2000, response: wrong });
    expect(r.state.phase).toBe("question");
    expect(r.state.index).toBe(1);
    expect(r.state.shownAt).toBe(2000);
    const types = r.effects.map((e) => e.type);
    expect(types).toEqual(["answer", "box"]);
    // Nothing in the event type lets the kid go back.
    expect(
      reduce(r.state, { type: "answer", at: 3000, response: right, q: 0 })
        .state,
    ).toBe(r.state);
  });
  it("logs the single try with its time and moves the box", () => {
    const { state } = startExam(config(2));
    const r = reduce(state, { type: "answer", at: 4500, response: right });
    expect(r.effects[0]).toMatchObject({
      type: "answer",
      itemId: "t0",
      try: 1,
      correct: true,
      ms: 3500,
    });
    expect(r.effects[1]).toMatchObject({ type: "box", itemId: "t0", box: 2 });
  });
  it("a wrong answer sends the item to box 1", () => {
    const { state } = startExam(config(2));
    const r = reduce(state, { type: "answer", at: 2000, response: wrong });
    expect(r.effects[1]).toMatchObject({ type: "box", itemId: "t0", box: 1 });
  });
  it("ignores a double tap on the same question", () => {
    const { state } = startExam(config(3));
    const r = run(state, [
      { type: "answer", at: 2000, response: right, q: 0 },
      { type: "answer", at: 2010, response: right, q: 0 },
    ]);
    expect(r.state.index).toBe(1);
    expect(r.effects.filter((e) => e.type === "answer")).toHaveLength(1);
  });
  it("never emits a points effect and has no points in the state", () => {
    const { state, effects } = run(
      startExam(config(4)).state,
      answers(["r", "r", "w", "r"]),
    );
    expect(effects.some((e) => (e.type as string) === "points")).toBe(false);
    expect(JSON.stringify(state)).not.toContain("economy");
  });
});

describe("ending and the result (AC68, AC69)", () => {
  it("passes at exactly the pass percent and asks for the golden egg", () => {
    const { state, effects } = run(
      startExam(config(10)).state,
      answers(["r", "r", "r", "r", "r", "r", "r", "w", "w", "w"]),
    );
    expect(state.phase).toBe("end");
    expect(state.result).toMatchObject({
      status: "done",
      score: 7,
      total: 10,
      percent: 70,
      passed: true,
    });
    expect(effects.filter((e) => e.type === "goldenEgg")).toHaveLength(1);
    expect(effects.filter((e) => e.type === "result")).toHaveLength(1);
  });
  it("just below the pass percent gives no egg", () => {
    const { state, effects } = run(
      startExam(config(10)).state,
      answers(["r", "r", "r", "r", "r", "r", "w", "w", "w", "w"]),
    );
    expect(state.result?.passed).toBe(false);
    expect(effects.some((e) => e.type === "goldenEgg")).toBe(false);
  });
  it("saves every question with the kid answer, and the score per topic", () => {
    const { state } = run(
      startExam(config(4)).state,
      answers(["r", "w", "r", "r"]),
    );
    expect(state.result?.questions[1]).toEqual({
      itemId: "t1",
      topic: "b",
      given: wrong,
      correct: false,
    });
    expect(state.result?.byTopic).toEqual({
      a: { right: 2, total: 2 },
      b: { right: 1, total: 2 },
    });
    expect(state.result?.moduleId).toBe("m");
    expect(state.result?.examId).toBe("e1");
  });
  it("rounds the pass check on integers, not floats", () => {
    // 2 of 3 is 66.6 percent: not a pass at 66.7, a pass at 66.
    const cfg = (p: number) =>
      config(3, { exam: { id: "e", timeLimitMinutes: null, passPercent: p } });
    const kinds: ("r" | "w")[] = ["r", "r", "w"];
    expect(
      run(startExam(cfg(66)).state, answers(kinds)).state.result?.passed,
    ).toBe(true);
    expect(
      run(startExam(cfg(67)).state, answers(kinds)).state.result?.passed,
    ).toBe(false);
  });
});

describe("time out (AC67)", () => {
  it("counts down on ticks and does not end while time is left", () => {
    const { state } = startExam(config(3));
    const r = reduce(state, { type: "tick", at: 5000, msLeft: 60_000 });
    expect(r.state.msLeft).toBe(60_000);
    expect(r.state.phase).toBe("question");
  });
  it("ends at zero: open questions are wrong and logged as not answered", () => {
    const s0 = run(startExam(config(4)).state, answers(["r"])).state;
    const r = reduce(s0, { type: "tick", at: 9000, msLeft: 0 });
    expect(r.state.phase).toBe("end");
    expect(r.state.result?.score).toBe(1);
    expect(
      r.effects
        .filter((e) => e.type === "unanswered")
        .map((e) => (e as { itemId: string }).itemId),
    ).toEqual(["t1", "t2", "t3"]);
    expect(r.state.result?.questions[2]?.given).toBeNull();
  });
  it("checks a typed but not sent answer as given", () => {
    const typeItem: TypeItem = {
      id: "x",
      type: "type",
      level: "M6",
      skill: "s",
      prompt: "2+2",
      explain: "e",
      answer: ["4"],
    };
    const cfg = config(0);
    cfg.entries = [
      { item: typeItem as Item, box: 0, topic: "a", numeric: true },
      { item: item(1), box: 0, topic: "a" },
    ];
    const a = run(startExam(cfg).state, [
      { type: "draft", at: 2000, response: { type: "type", text: "4,0" } },
      { type: "tick", at: 3000, msLeft: 0 },
    ]);
    expect(a.state.result?.questions[0]).toMatchObject({
      correct: true,
      given: { type: "type", text: "4,0" },
    });
    expect(a.effects.filter((e) => e.type === "box")).toHaveLength(1);
    const b = run(startExam(cfg).state, [
      { type: "draft", at: 2000, response: { type: "type", text: "5" } },
      { type: "tick", at: 3000, msLeft: 0 },
    ]);
    expect(b.state.result?.questions[0]?.correct).toBe(false);
    expect(b.state.result?.questions[0]?.given).toEqual({
      type: "type",
      text: "5",
    });
  });
  it("a draft is dropped when Klaar is tapped and not carried to the next question", () => {
    const s = run(startExam(config(3)).state, [
      { type: "draft", at: 1500, response: wrong },
      { type: "answer", at: 2000, response: right },
    ]).state;
    expect(s.draft).toBeNull();
    const r = reduce(s, { type: "tick", at: 3000, msLeft: 0 });
    expect(r.state.result?.score).toBe(1);
  });
  it("works with the real exam timer", () => {
    const timer = createExamTimer(20, 10_000);
    expect(timer).not.toBeNull();
    const { state } = startExam(
      config(2, { msLeft: timer?.remainingMs() ?? 0 }),
    );
    expect(state.msLeft).toBe(10_000);
    timer?.advance(10_000);
    const r = reduce(state, {
      type: "tick",
      at: 20_000,
      msLeft: timer?.remainingMs() ?? null,
    });
    expect(r.state.phase).toBe("end");
  });
  it("ignores ticks after the exam ended", () => {
    const s = run(startExam(config(1)).state, answers(["r"])).state;
    expect(reduce(s, { type: "tick", at: 9000, msLeft: 0 }).effects).toEqual(
      [],
    );
  });
});

describe("stop (AC70)", () => {
  it("saves gestopt, no egg, no review, ends the session", () => {
    const s0 = run(startExam(config(5)).state, answers(["r", "r"])).state;
    const r = reduce(s0, { type: "stop", at: 9000 });
    expect(r.state.phase).toBe("done");
    expect(r.state.endReason).toBe("stopped");
    expect(r.state.result).toMatchObject({
      status: "gestopt",
      passed: false,
      score: 2,
      total: 5,
    });
    expect(r.effects.map((e) => e.type)).toEqual([
      "unanswered",
      "unanswered",
      "unanswered",
      "result",
      "end",
    ]);
    expect(reduce(r.state, { type: "review", at: 9100 }).state.phase).toBe(
      "done",
    );
  });
  it("even an all right stop gives no egg", () => {
    const s0 = run(
      startExam(config(5)).state,
      answers(["r", "r", "r", "r"]),
    ).state;
    const r = reduce(s0, { type: "stop", at: 9000 });
    expect(r.effects.some((e) => e.type === "goldenEgg")).toBe(false);
    expect(r.state.result?.passed).toBe(false);
  });
  it("is ignored on the end screen", () => {
    const s = run(startExam(config(1)).state, answers(["r"])).state;
    expect(reduce(s, { type: "stop", at: 9000 }).state).toBe(s);
  });
});

describe("review (AC153)", () => {
  const ended = () =>
    run(startExam(config(5)).state, answers(["r", "w", "r", "w", "r"])).state;
  it("lists wrong and open questions, pages with Volgende, closes with Klaar", () => {
    let s = ended();
    expect(reviewIndexes(s)).toEqual([1, 3]);
    s = reduce(s, { type: "review", at: 1 }).state;
    expect(s.phase).toBe("review");
    expect(s.reviewPage).toBe(0);
    s = reduce(s, { type: "reviewNext", at: 2 }).state;
    expect(s.reviewPage).toBe(1);
    expect(reduce(s, { type: "reviewNext", at: 3 }).state.reviewPage).toBe(1);
    s = reduce(s, { type: "reviewClose", at: 4 }).state;
    expect(s.phase).toBe("end");
  });
  it("3 wrong and 1 open make 4 pages", () => {
    const s0 = run(
      startExam(config(8)).state,
      answers(["r", "r", "r", "r", "w", "w", "w"]),
    ).state;
    const s = reduce(s0, { type: "tick", at: 99_000, msLeft: 0 }).state;
    expect(reviewIndexes(s)).toHaveLength(4);
  });
  it("has no review when everything is right", () => {
    const s = run(startExam(config(3)).state, answers(["r", "r", "r"])).state;
    expect(reviewIndexes(s)).toEqual([]);
    expect(reduce(s, { type: "review", at: 1 }).state.phase).toBe("end");
  });
  it("closed during the review comes back on the end screen", () => {
    const s = reduce(ended(), { type: "review", at: 1 }).state;
    expect(restoreExam(JSON.parse(JSON.stringify(s)) as ExamState).phase).toBe(
      "end",
    );
    expect(restoreExam(ended()).phase).toBe("end");
  });
  it("review gives no new effects, finish ends the exam", () => {
    const s = ended();
    expect(reduce(s, { type: "review", at: 1 }).effects).toEqual([]);
    const r = reduce(s, { type: "finish", at: 5 });
    expect(r.state.phase).toBe("done");
    expect(r.effects).toEqual([{ type: "end", reason: "complete", at: 5 }]);
  });
  it("finish does nothing during a question", () => {
    const { state } = startExam(config(2));
    expect(reduce(state, { type: "finish", at: 5 }).state).toBe(state);
  });
});

describe("JSON round trip (AC71)", () => {
  it("survives at every step and continues the same", () => {
    let s = startExam(config(4)).state;
    const events = [
      ...answers(["r", "w"]),
      { type: "draft", at: 5000, response: right } as ExamEvent,
      { type: "tick", at: 6000, msLeft: 600_000 } as ExamEvent,
    ];
    for (const ev of events) {
      s = reduce(s, ev).state;
      const copy = JSON.parse(JSON.stringify(s)) as ExamState;
      expect(copy).toEqual(s);
      expect(
        reduce(copy, { type: "answer", at: 7000, response: right }),
      ).toEqual(reduce(s, { type: "answer", at: 7000, response: right }));
    }
    expect(s.index).toBe(2);
    expect(s.msLeft).toBe(600_000);
  });
});

describe("picking by mix (AC64)", () => {
  const mix = { a: 1, b: 1, c: 1, d: 1 };
  it("splits by largest remainder and adds up", () => {
    expect(splitByMix(30, { a: 1, b: 1, c: 1 })).toEqual({
      a: 10,
      b: 10,
      c: 10,
    });
    expect(splitByMix(20, mix)).toEqual({ a: 5, b: 5, c: 5, d: 5 });
    const s = splitByMix(10, { a: 1, b: 1, c: 1 });
    expect(Object.values(s).reduce((x, y) => x + y, 0)).toBe(10);
    expect(s).toEqual({ a: 4, b: 3, c: 3 });
    expect(splitByMix(10, { a: 5, b: 3, c: 2 })).toEqual({ a: 5, b: 3, c: 2 });
    expect(splitByMix(7, { a: 2, b: 1 })).toEqual({ a: 5, b: 2 });
    expect(splitByMix(5, { a: 1, b: 0 })).toEqual({ a: 5 });
    expect(splitByMix(0, mix)).toEqual({});
  });
  const pool = (t: string, n: number): Item[] =>
    Array.from({ length: n }, (_, i) => ({ ...item(i), id: `${t}${i}` }));
  it("picks per topic, no duplicates, same seed same exam", () => {
    const pools = { a: pool("a", 20), b: pool("b", 20) };
    const exam = { questionCount: 10, mix: { a: 3, b: 7 } };
    const r1 = pickExamItems(pools, exam, createRng(5));
    const r2 = pickExamItems(pools, exam, createRng(5));
    expect(r1.picked.map((p) => p.item.id)).toEqual(
      r2.picked.map((p) => p.item.id),
    );
    expect(r1.picked).toHaveLength(10);
    expect(r1.short).toBe(false);
    expect(r1.picked.filter((p) => p.topic === "a")).toHaveLength(3);
    expect(new Set(r1.picked.map((p) => p.item.id)).size).toBe(10);
  });
  it("fills from other topics when one is short, and reports short when everything is used", () => {
    const exam = { questionCount: 10, mix: { a: 1, b: 1 } };
    const r = pickExamItems(
      { a: pool("a", 2), b: pool("b", 20) },
      exam,
      createRng(1),
    );
    expect(r.picked).toHaveLength(10);
    expect(r.picked.filter((p) => p.topic === "a")).toHaveLength(2);
    const s = pickExamItems(
      { a: pool("a", 2), b: pool("b", 3) },
      exam,
      createRng(1),
    );
    expect(s.picked).toHaveLength(5);
    expect(s.short).toBe(true);
  });
  it("ignores topics that are not in the mix", () => {
    const r = pickExamItems(
      { a: pool("a", 5), z: pool("z", 5) },
      { questionCount: 3, mix: { a: 1 } },
      createRng(2),
    );
    expect(r.picked.every((p) => p.topic === "a")).toBe(true);
  });
});
