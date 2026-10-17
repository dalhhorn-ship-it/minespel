# Decisions

Every notable decision. Founder decisions are marked `NEEDS FOUNDER` until answered, then `DECIDED`.

| # | Date | Decision | Options considered | Chosen | Who | Status |
|---|---|---|---|---|---|---|
| 1 | 2026-10-17 | Players and language | 5 to 7, 8 to 10, siblings, 11+; English, Dutch, both | One kid age 8 to 10; Dutch | Founder | DECIDED |
| 2 | 2026-10-17 | Concept | Dino Hatchery, Time Rift Archaeologists, Dino Farm Craft, Dino Rescue Island | Free 3D Minecraft world with Minecraft style dinos | Founder | DECIDED |
| 3 | 2026-10-17 | Built in subjects for v1 | Math, Spelling, Grammar, parent made only | Math and Grammar, plus parent made modules with fine grained settings | Founder | DECIDED |
| 4 | 2026-10-17 | Learning break skip rules | No skip but finish early, parent delay, fully strict | No skip, can finish early | Founder | DECIDED |
| 5 | 2026-10-17 | First built in Taal module | none, founder request | Cito LVS and IEP style module for groep 6 and 7: taalverzorging, spelling, komma, apostrof, with lessons, tests and exams. Spelling is now in v1 (updates #3). | Founder | DECIDED |
| 6 | 2026-10-17 | Module format and where content lives before signoff | JSON in docs/modules, or wait for the architect | JSON per topic in `docs/modules/<id>/`, checked by `docs/modules/validate.py`. The same format is used for parent made modules. The architect may adapt it. | Operator | DECIDED |
| 7 | 2026-10-17 | Cito copyright | copy real items, write original items | Original items in Cito and IEP style. Real test items are copyrighted. | Operator | DECIDED |
| 8 | 2026-10-17 | F1: v1 size | build v1a then v1b, both in v1; cut v1b to Later | All at once: no v1a/v1b split, everything ships together in v1 | Founder | DECIDED |
| 9 | 2026-10-17 | F2: How a learning break ends | questions done or time up, with Geen limiet setting; questions only; time only | Break ends when questions are done. A wrong answer is retried once. Still wrong: a short teach moment, malus points, then the kid moves on. No time limit ends a break. | Founder | DECIDED |
| 10 | 2026-10-17 | F3: Parent gate type | 4 digit pincode with adult reset question; adult question only | 4 digit PIN | Founder | DECIDED |
| 11 | 2026-10-17 | F4: Strength of PIN vergeten | new two step question plus 10 minute block; simple question | Strong reset: fresh two step grown up question, 10 minute block after 2 wrong tries | Founder | DECIDED |
| 12 | 2026-10-17 | F5: Rewards | food to tame dinos, kleurblokken, golden dino for exam; other | All dinos are earned through learning: points buy dino eggs in a dino shop, bigger dinos cost more, eggs hatch into walking dinos. Normal blocks are freely available, nothing block related is earned. | Founder | DECIDED |
| 13 | 2026-10-17 | F6: Rewards for zero effort | no chest at 0 right and Extra oefenen max 10 per day; always reward | No points for a break with 0 right; Extra oefenen earns at most 10 points a day | Founder | DECIDED |
| 14 | 2026-10-17 | F7: Golden egg at 12 tame dinos | golden dinos do not count to 12; egg waits | Golden dinos do not count toward the 12 | Founder | DECIDED |
| 15 | 2026-10-17 | F8: Exam score for the kid | score with kind message; parent only | Kid sees a full review of mistakes after an exam, with the right answers | Founder | DECIDED |
| 16 | 2026-10-17 | F9: Hosting | public workers.dev; workers.dev behind Cloudflare Access; local network only | Public workers.dev address | Founder | DECIDED |
| 17 | 2026-10-17 | F10: Reference iPad | model and iPadOS version from founder | iPad 2018 or newer, iPadOS 16+ | Founder | DECIDED |
| 18 | 2026-10-17 | F11: Rekenen scope | plus, minus, tafels, delen; smaller; bigger | Plus, minus, tafels, delen | Founder | DECIDED |
| 19 | 2026-10-17 | F12: App name | kid picks; keep Dino Blokwereld | Not answered; keep Dino Blokwereld as working title | Founder | DECIDED (default) |
| 20 | 2026-10-17 | F13: Small scope changes | snel geklikt mark in v1a; Groter lettertype to Later | Snel geklikt mark: yes. Groter lettertype to Later: not approved, stays in v1 | Founder | DECIDED |
