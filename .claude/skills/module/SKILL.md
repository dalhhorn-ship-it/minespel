---
name: module
description: Make a new learning module (lessons, practice questions and exams) from photos or screenshots of a workbook, a test or a school sheet, or from a topic the founder names. Works out the theory behind the questions, writes original kid friendly content in the module format, validates it and wires it into the game. Use when the founder drops pages of questions, says "make a module", "make lessons for this" or "add this subject".
argument-hint: "[subject, level or folder name, e.g. 'rekenen E6']"
---

You are the operator. A module is pure content: one folder in `docs/modules/<module-id>/`. The game loads every folder there by itself (`src/content/folder-modules.ts`), so a new module needs no code change. Follow these steps every time, so every module is built the same way.

## 1. Read the source

1. Look at every photo or screenshot. For each question write one line in a scratch table: number, section heading of the book, question style (pick the right word, fill in letters, put a mark, which word is a ..., type the form), and the exact rule or skill it tests.
2. Group the lines into topics (one topic per rule family, 3 to 8 topics per module) and skills (one skill per exact rule). Keep the book's sections as the exam parts.
3. Read the existing modules in `docs/modules/`. If a skill is already well covered there, say so. Only make what is missing or what the founder asked for.
4. Pick the levels from the source (for example `Oefenboek ... E6` means `["M6", "E6"]`: one level below for warm up, plus the target level).

If the subject, level or scope is not clear, ask the founder once with AskUserQuestion (2 to 4 options, recommendation first).

## 2. Write the theory (lessons)

For every topic write a lesson with one page per skill, set the page `skill` to the skill name. Each page:
* `text`: the rule in 2 to 4 short sentences a kid of 8 to 10 can read alone.
* `examples`: at least one `good`, and a `bad` with `why` when a common mistake exists.
* `tip`: a short trick or mnemonic (for example 't kofschip).

## 3. Write the questions (practice)

* Never copy a question, sentence or name from the source. Copy the style and the skill only. Use dinos, blocks, nature, school and family.
* Use the item types from `docs/modules/README.md`. Map the book's styles like this:
  * "In welke zin is het woord goed gespeld?" or "Omcirkel het goede antwoord": `choice`.
  * "Vul de juiste letter(s) in" or "Vul de goede vorm in": `type` with every accepted answer.
  * "Welk woord is fout?": `find-error` (include some with no mistake, `answer: -1`).
  * "Zet de komma (of !) op de juiste plek": `punctuate` with the right `mark`.
  * "Welk woord is een lidwoord / de persoonsvorm?": `choice` with the sentence and the words as options.
* At least 6 items per level per topic, better 7 to 10. Mix the types. Every `explain` names the rule, not only the answer.
* Item ids: `<short module prefix>-<topic prefix>-NNN`. Never renumber or reuse an id after it shipped: saved progress uses it.
* Keep sentences within the word limits (15 at M6 and E6, 20 at M7 and E7).
* Foreign language modules (Engels and the like): every item with a sentence in the other language and a gap (`...`) shows the Dutch meaning of the whole sentence in its `prompt`, as `Het betekent: <Nederlandse zin>`. Kids must know what the sentence says before they can pick or type the missing word (founder, decision 98).

For big modules, write the JSON with a small one off script in the scratchpad (helpers for each item type) instead of by hand. The JSON files are the source of truth afterwards; do not commit the script.

## 4. Make the exams

In `module.json` add one exam per book section (same parts as the source, for example "deel 1" and "deel 2"), plus one full exam over every topic. Set `questionCount` like the source, `timeLimitMinutes` about one minute per question, `passPercent: 70`, and `mix` weights that follow how many questions the source gives each topic.

## 5. Check

1. `python3 docs/modules/validate.py docs/modules/<module-id>` until it says OK. Fix the content, never the validator.
2. Read every item once more as a teacher: is the answer really right, is only one option right, is the Dutch spelling right (woordenlijst.org)? Ambiguous items get rewritten or removed.
3. Run `./scripts/check.sh`. When only `docs/modules/<module-id>/` and docs changed, it takes the content release path by itself (validator, module unit tests, build, no e2e, under a minute). `src/content/folder-modules.test.ts` validates every folder with the in app rules too. If it says "full", something outside the content changed: find out what, and keep it out of a content release.

## 6. Record and hand over

1. Write `docs/modules/<module-id>/COVERAGE.md`: which source sections and question styles map to which topics and skills. No photos and no copied questions in the repo.
2. Update `docs/modules/README.md` (list of modules), `CHANGELOG.md` (kid readable line) and `docs/STATUS.md`. Log the content choices in `docs/DECISIONS.md`.
3. Commit. Tell the founder in a few short lines: the topics, how many questions, the exams, and that a teacher or parent should check the content once (AC124). Ask if the module should be on by default for the kids.

## Quick release path

A module that stays inside the format is content, not a feature. It ships with the quick path:
* Only files in `docs/modules/<module-id>/` plus docs (`CHANGELOG.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/modules/README.md`) change. No code, no tests, no `validate.py`.
* `./scripts/check.sh` takes the content path, and CI does the same on the pull request: no e2e run.
* No PRD signoff round and no `/release` loop are needed. A deploy is still a founder decision (Gate 2), and `main` and deploys always run the full check.

Leave the quick path, and run the normal `/release` loop with the full check, when the module needs anything the format does not have: a new item type, a new screen, a new field, a code change or a change to `validate.py`. Bring that to the founder first (Gate 2). Never mix a feature into a content release.
