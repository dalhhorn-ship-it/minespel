# Learning modules

A module is a pack of lessons, practice questions and exams for one subject. The game loads modules. Parents can make their own modules in the same format.

Every folder here with a `module.json` is a built in module. The game loads them all by itself (`src/content/folder-modules.ts`), with no copy step and no code change. To make a new one from photos of a workbook or test, run `/module` (`.claude/skills/module/SKILL.md`).

| Folder | Module | Levels |
|---|---|---|
| `cito-taalverzorging/` | Taalverzorging (Cito en IEP stijl), groep 6 and 7 | M6, E6, M7, E7 |
| `taal-e6/` | Taal E6: lastige woorden, meervoud, ontleden, leestekens, werkwoorden | M6, E6 |

A folder may also hold a `COVERAGE.md` that says which source the content is based on. The validator and the game only read the `.json` files.

## Folder layout

```
docs/modules/<module-id>/
  module.json        about the module, its topics and its exams
  <topic-id>.json    one file per topic: the lesson plus the questions
```

Check a module with:

```
python3 docs/modules/validate.py docs/modules/<module-id>
```

## module.json

```json
{
  "id": "cito-taalverzorging",
  "title": "Taalverzorging",
  "subject": "taal",
  "version": 1,
  "language": "nl",
  "levels": ["M6", "E6", "M7", "E7"],
  "topics": ["komma", "apostrof"],
  "exams": [
    {
      "id": "examen-m6",
      "title": "Oefenexamen M6",
      "levels": ["M6"],
      "questionCount": 30,
      "timeLimitMinutes": 30,
      "passPercent": 70,
      "mix": { "komma": 2, "apostrof": 1 }
    }
  ]
}
```

* `levels`: the levels this module uses, easiest first. Cito and IEP style levels are used here: M6 (midden groep 6), E6 (eind groep 6), M7, E7.
* `topics`: topic file names without `.json`, in teaching order.
* `generator`: optional, for example `"rekenen-basis"`. Only built in code modules use it. Such a module has no topic files, and its items come from code. `validate.py` is for folder modules and does not check these.
* `exams`: fixed blueprints. An exam picks `questionCount` questions from the listed `levels`. `mix` gives each topic a weight, so a topic with weight 2 gets twice as many questions as one with weight 1. `timeLimitMinutes` may be `null` for no time limit.

## Topic file

```json
{
  "id": "komma",
  "title": "De komma",
  "groups": [6, 7],
  "lesson": {
    "pages": [
      {
        "title": "Komma bij een opsomming",
        "text": "Noem je een rijtje dingen op? Zet dan een komma tussen de dingen. Voor het laatste ding staat 'en' of 'of'. Daar komt geen komma.",
        "examples": [
          { "good": "Ik zag een T-rex, een raptor en een stegosaurus.", "bad": "Ik zag een T-rex, een raptor, en een stegosaurus." }
        ],
        "tip": "Tel de dingen. Tussen elk paar komt een komma, behalve bij 'en'."
      }
    ]
  },
  "items": []
}
```

* `groups`: the school years (groep) the topic is for.
* `lesson.pages`: short pages the kid reads one by one. Each page has a `title`, a `text`, one or more `examples` (`good` is required, `bad` and `why` are optional) and an optional `tip`.
* `lesson.pages[].skill`: optional. It names the skill (the same text as the item `skill`) that the page teaches. The teach moment shows the page whose `skill` matches the item, else the first page. When present it must not be empty.

### Module bundle

In the app, a module is one object, also used as the export file:

```json
{
  "app": "Dino Blokwereld",
  "kind": "module",
  "formatVersion": 1,
  "createdAt": "2026-10-17T10:00:00.000Z",
  "module": { "id": "...", "title": "...", "subject": "taal", "version": 1, "language": "nl", "levels": ["M6"], "topics": ["komma"], "exams": [] },
  "topics": [ { "id": "komma", "title": "...", "groups": [6], "lesson": { "pages": [] }, "items": [] } ]
}
```

`module` is the `module.json` content. `topics` holds every topic file, in `module.topics` order. The built in Taal module is built from exactly the folder `docs/modules/cito-taalverzorging/`.

## Items (questions)

Every item has these fields:

| Field | Meaning |
|---|---|
| `id` | Unique within the module, for example `komma-012`. Never reuse or renumber an id: progress is saved by id. |
| `type` | `choice`, `find-error`, `type` or `punctuate` (see below). |
| `level` | One of the module `levels`. |
| `skill` | A short name for the exact rule practised, for example `opsomming`. Parents can switch skills on and off. |
| `prompt` | The question, in Dutch. |
| `explain` | Kid friendly feedback shown after the answer: the right answer and the rule, in one or two short sentences. |

### `choice`: pick the right answer

```json
{ "id": "ww-tt-001", "type": "choice", "level": "M6", "skill": "hij-t",
  "prompt": "Welk woord moet op de stippen?",
  "sentence": "De dino ... over het hek.",
  "options": ["springd", "springt", "sprindt", "spring"],
  "answer": 1,
  "explain": "Hij springt: stam (spring) plus t." }
```

`sentence` is optional. `answer` is the index in `options`, starting at 0. Use 2 to 4 options.

### `find-error`: tap the word that is spelled wrong

```json
{ "id": "spel-004", "type": "find-error", "level": "E6", "skill": "ei-ij",
  "prompt": "Welk woord is fout geschreven?",
  "words": ["De", "dino", "legt", "een", "groot", "ij", "in", "het", "nest."],
  "answer": 5,
  "correction": "ei",
  "explain": "Een ei schrijf je met ei. Het is een ei uit de lijst met ei woorden." }
```

`words` is the sentence split on spaces, with punctuation stuck to its word. `answer` is the index of the wrong word, or `-1` when there is no mistake (the kid then taps "Geen fout"). `correction` is the right spelling of the wrong word, or `null` when `answer` is `-1`. At most one wrong word per sentence.

### `type`: type the answer

```json
{ "id": "ww-vt-010", "type": "type", "level": "M7", "skill": "verleden-kofschip",
  "prompt": "Schrijf het werkwoord in de verleden tijd.",
  "sentence": "Gisteren (fietsen) ik naar de dinoschool.",
  "answer": ["fietste"],
  "explain": "Fietsen: de s zit in 't kofschip, dus te. Ik fietste." }
```

`answer` lists every accepted answer. The check ignores spaces at the start and end, and is case sensitive (capital letters matter in spelling).

### `punctuate`: tap where the mark goes

```json
{ "id": "komma-003", "type": "punctuate", "level": "M6", "skill": "opsomming",
  "prompt": "Tik waar een komma moet.",
  "mark": ",",
  "words": ["Ik", "zag", "een", "raptor", "een", "T-rex", "en", "een", "ei."],
  "answer": [3],
  "explain": "Tussen raptor en een T-rex komt een komma. Voor 'en' niet." }
```

Gap `i` is the space right after `words[i]`. `answer` lists every gap that needs the mark, and may be empty when no mark is needed. The kid must tap all the right gaps and no wrong ones. `mark` is `,` for this module. Other marks may be added later.

## What `validate.py` checks

Besides the fields and types above, it fails on:

* two equal options in a `choice` item;
* two items in the module with the same `prompt` and the same sentence (`sentence`, else `words`, else `options`), also across topics;
* a `type` item without an accepted answer;
* a sentence over 15 words at M6 or E6, or over 20 words at M7 or E7;
* an empty lesson page `skill`;
* too few items per level, an exam that asks for more items than exist, duplicate ids.

## Rules for writing content

* Write original sentences. Copy the style and the skills of Cito and IEP tests, never their actual questions.
* Dinos, blocks, nature, school and family make good sentences. Nothing scary, nothing violent, no real people's names other than common first names.
* Follow the official Dutch spelling (Groene Boekje, woordenlijst.org).
* Keep sentences short: at most 15 words at M6 and E6, 20 at M7 and E7. The validator counts the `sentence`, the `words`, or each option when the options are the sentences.
* Every `explain` names the rule, not only the answer.
