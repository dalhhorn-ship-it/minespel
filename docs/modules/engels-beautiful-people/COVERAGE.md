# Engels: Beautiful People: where the content comes from

Source: a photo of an English school sheet from the founder on 2026-10-24 (song "Beautiful People", song 3, lesson 2). The sheet has three parts: Words to know, Phrases and Zo moedig je iemand aan. No photo is kept in the repo.

The sheet text is in `BRON.md` (decision 127). It is rebuilt from the lessons and NOT YET CHECKED against the sheet: the founder still has to send a photo. The `blad` topic is made from it.

The words and phrases on the sheet are what the kid has to learn, so they appear as they are. Every question sentence around them is newly written.

| Source part | Topic | Skills | Question styles |
|---|---|---|---|
| Words to know (9 words) | `woorden` | `woord-betekenis`, `woord-engels`, `woord-in-zin`, `woord-spellen` | pick the meaning, pick the English word, pick the word that fits a sentence, type the word, find the misspelled word |
| Phrases (4 sentences) | `zinnen` | `zin-betekenis`, `zin-engels`, `zin-gebruiken`, `zin-afmaken` | pick the meaning, pick the English sentence, pick the sentence for a situation, type the missing word, find the wrong word |
| Zo moedig je iemand aan (5 sentences) | `aanmoedigen` | `aanmoedigen-betekenis`, `aanmoedigen-engels`, `aanmoedigen-kiezen` | pick the meaning, pick the English sentence, pick the cheer for a situation, type the missing word, find the wrong word |
| The whole sheet, as it is | `blad` (Precies van het blad) | `blad-woord-betekenis`, `blad-woord-engels`, `blad-woord-schrijven`, `blad-zin-betekenis`, `blad-zin-engels`, `blad-zin-schrijven`, `blad-aanmoedigen-betekenis`, `blad-aanmoedigen-engels`, `blad-aanmoedigen-schrijven` | pick the meaning, pick the English word or sentence, type it exactly as on the sheet |

Levels: M6 asks the meaning and the translation, E6 adds sentences, situations and spelling.

Exams: one per sheet part (Words to know 12, Phrases 8, Zo moedig je iemand aan 8), Toets Beautiful People (20 questions over all parts, words weigh double like on the sheet) and Toets: precies van het blad (18 questions, 18 minutes, only the `blad` topic).

Only sheet text, founder 2026-11-15 ("ja alleen het blad zelf, verzin er nooit iets bij!"): the topic `blad` and its exam Toets: precies van het blad use only what is on the sheet. Every question is a sheet word or sentence with its sheet meaning, in a short wrapper like "Wat betekent ...?". The answer options are only other words or meanings from the same sheet part. No new sentences, situations, names or invented distractors. The lesson is one page that lists the sheet. M6 has the choice questions both ways (36), E6 the typed ones (18).

Typed answers accept a lower case or a capital first letter. "Buiten" also accepts outside.

Overlap: no other module teaches English yet.

The content still needs one check by a teacher or parent (AC124).

**Hidden for now (founder, 2026-11-15):** the `blad` topic and its exam are parked in `blad.json.wacht-op-foto` and left out of `module.json`, because BRON.md is not yet checked against the sheet (decision 127). To bring them back: fix BRON.md from the photo, rerun the generator, rename the file to `blad.json`, and add the topic and the exam to `module.json` again.
