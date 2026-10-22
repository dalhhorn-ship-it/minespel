# Content check: Taal (T65, AC124, founder decision 81)

Date: 2026-10-22. By: QA. Module JSON was not changed. Nothing is fixed yet.

## How this was done

* All 513 items in the four Taal folder modules were read in full: question, sentence, options, answer, correction, explain text, and every lesson page (text, examples, tip).
* The built in Taal content (`src/content/taal.ts`) is only a loader for `docs/modules/cito-taalverzorging`. There is no separate Taal content in `src/content`. Rekenen is out of scope.
* Spelling was checked against the Woordenlijst Nederlandse Taal (Groene Boekje, spelling 2015) and the usual school rules.
* **Limit of this check:** web access was blocked in this session (proxy returned 403 for taaladvies.net, and a status check was denied). No finding below was looked up live. Sources are named from knowledge of the Woordenlijst and Taaladvies.net. Every finding marked "confirm" should be looked up on woordenlijst.org or taaladvies.net by the founder or a teacher. A short lookup list is at the end.
* The kid keyboard is custom (`src/ui/learn/kid-keyboard.ts`) and has a straight apostrof key, so iPad smart punctuation (curly quotes) cannot break answers like pizza's. Good.

| Module | Topic file | Items read | Ids |
|---|---|---|---|
| kofschip | verleden-tijd | 18 | kf-vt-001 to 018 |
| kofschip | voltooid-deelwoord | 17 | kf-vd-001 to 017 |
| kofschip | lastige-gevallen | 16 | kf-lg-001 to 016 |
| leestekens | punt | 14 | ls-pt-001 to 014 |
| leestekens | komma | 14 | ls-km-001 to 014 |
| leestekens | dubbele-punt | 13 | ls-dp-001 to 013 |
| leestekens | puntkomma | 13 | ls-pk-001 to 013 |
| leestekens | apostrof | 15 | ls-ap-001 to 015 |
| taal-e6 | meervoud | 17 | e6-mv-001 to 017 |
| taal-e6 | werkwoordspelling | 22 | e6-ww-001 to 022 |
| taal-e6 | lastige-klanken | 17 | e6-kl-001 to 017 |
| taal-e6 | hoofdletters-leestekens | 16 | e6-hl-001 to 016 |
| taal-e6 | woorden-maken | 16 | e6-wm-001 to 016 |
| taal-e6 | ontleden | 17 | e6-on-001 to 017 |
| cito-taalverzorging | komma | 28 | km-001 to 028 |
| cito-taalverzorging | leestekens | 28 | lt-001 to 028 |
| cito-taalverzorging | apostrof | 28 | ap-001 to 028 |
| cito-taalverzorging | klanken | 28 | kl-001 to 028 |
| cito-taalverzorging | hoofdletters | 28 | hl-001 to 028 |
| cito-taalverzorging | trema-koppelteken | 28 | tk-001 to 028 |
| cito-taalverzorging | leenwoorden | 28 | lw-001 to 028 |
| cito-taalverzorging | woordvormen | 28 | wv-001 to 028 |
| cito-taalverzorging | ww-tegenwoordig | 32 | ww-tt-001 to 032 |
| cito-taalverzorging | ww-verleden | 32 | ww-vt-001 to 032 |

## Overall result

Very clean. Every spelling, every 't kofschip form, every meervoud, verkleinwoord, trema, koppelteken, hoofdletter and apostrof answer checked out. No misspelled word was found in any question, option or lesson text. All 't kofschip forms (verleden tijd and voltooid deelwoord) are correct, including the hard ones (verfde, reisden, gerepareerd, geloofd, verhuisd, gerelaxt, gesurft, beloofde, versierd, vergist).

The findings below are about rules, not spelling. The most important one is a conflict between two modules about the komma next to aanhalingstekens.

Severity words: wrong answer (a kid is marked wrong for a correct answer, or taught something wrong), ambiguous (more than one defensible answer, only one accepted), typo, style.

## Findings

### F1. Komma and aanhalingstekens: two modules teach opposite things (confirm first)

* **Items:** cito `lt-023` (and `lt-022`, lesson page "Het leesteken binnen de aanhalingstekens") against leestekens `ls-dp-012` (lesson page "Dubbele punt voor wat iemand zegt") and taal-e6 `e6-hl-010` (lesson page "Iemand zegt iets").
* **What is wrong:** cito says the komma goes inside: `"Ik ben moe," zei de dino.` and marks `"Ik ben moe." zei de dino.` as the fault, with correction `moe,"`. leestekens and taal-e6 say the komma goes outside: `"Kom binnen", zegt oma.` and `"Ik heb honger", zegt de dino.` A kid who plays two modules is told two different things.
* **Correct form:** my understanding is that Dutch norm puts the komma after the closing aanhalingsteken: `"Ik ben moe", zei de dino.` A vraagteken or uitroepteken stays inside: `"Kijk, een ei!" riep Mila.` The English style (komma inside) is common in school books, so a teacher must say which one the school method uses.
* **Source:** Taaladvies.net, "aanhalingstekens en andere leestekens" (not looked up live, confirm).
* **Severity:** wrong answer in one of the two modules. Fix both to the same rule. Items to change if outside is right: `lt-023` (answer and correction, explain), `lt-022` explain, cito lesson page 4 text and example, and its bad example. Check that no item uses the other form.

### F2. `ww-vt-027` explain teaches a wrong subject

* **Item:** ww-vt-027, "Wat ... er als de dino het ei laat vallen?" Answer gebeurt (right).
* **What is wrong:** explain says "Het onderwerp is het, dus stam gebeur plus t". There is no "het" in the first part. The onderwerp of "Wat gebeurt er" is "wat" (with "er" as a placeholder).
* **Correct form:** "Wat is één ding, dus stam gebeur plus t: gebeurt. Er staat geen is of heeft bij."
* **Severity:** wrong (explain only, answer is right).

### F3. `e6-on-008` and the zelfstandig naamwoord test (ambiguous)

* **Item:** e6-on-008, "Welk woord is geen zelfstandig naamwoord?" Options boom, fiets, springen, appel. Answer springen. Explain says "Je kunt niet zeggen: de springen."
* **What is wrong:** the answer is the intended one, but "het springen" is correct Dutch (a werkwoord used as zelfstandig naamwoord, "het springen is leuk"). The explain and the lesson test "kun je de, het of een ervoor zetten?" give a false result for such words. A sharp kid or teacher can object.
* **Correct form:** change the explain to something true, for example "Springen is wat je doet, een werkwoord. Boom, fiets en appel zijn dingen." Or replace the test words with ones where this cannot happen. Lesson page "Zelfstandig naamwoord" could add "een ding, dier, mens of plek".
* **Source:** Woordenlijst lists springen as werkwoord, and nominalised infinitives (het springen) are normal Dutch.
* **Severity:** ambiguous. Related: `e6-on-015` "Je kunt niet zeggen: wij snel" is fine.

### F4. `e6-kl-004` ijsje or eisje (ambiguous)

* **Item:** e6-kl-004, "Na het zwemmen eten wij een ...sje." Answer ij only.
* **What is wrong:** "eisje" (a little egg) is a real word, and the lesson even uses it as a bad example. Eating "een eisje" after swimming is not likely, but a kid who types ei is marked wrong and the sentence alone does not rule it out.
* **Correct form:** add a clue, for example "Na het zwemmen eten wij een koud ...sje." or "een ...sje met aardbeien", or keep ij and add the picture word "ijs" in the sentence.
* **Severity:** ambiguous.

### F5. Komma between bijvoeglijke naamwoorden (ambiguous, confirm)

* **Items:** cito `km-019` (answer: komma after lieve and after slimme) and `km-025` ("Ik zag een grote, groene dino." is the only right option), plus lesson page "Extra uitleg, rijtjes woorden en geen komma".
* **What is wrong:** with two or three adjectives, a komma is a choice, not a must. "Een grote groene dino" is common and not wrong. A kid who leaves the komma out is marked wrong, and in `km-019` any one missing komma fails the whole item.
* **Correct form:** keep the rule only where it is clearly right, for example where the adjectives are a real list ("lieve, slimme en grappige dino" needs no komma before en), or drop the items. Also the lesson says "nooit vlak voor het ding zelf", which is right.
* **Source:** Taaladvies.net, "komma bij bijvoeglijke naamwoorden" (confirm).
* **Severity:** ambiguous.

### F6. Punt or uitroepteken, both fine (ambiguous)

* **Items:** taal-e6 `e6-hl-005` ("Pas op, daar komt een grote T-rex aan", answer !), `e6-hl-012` ("Kijk eens, wat een prachtige regenboog", answer !), also `e6-hl-004` and `e6-hl-013` (these ask only for ! so they are fine). leestekens `ls-pt-005` offers an uitroepteken as a wrong option for "Mijn hond heet Max".
* **What is wrong:** a punt is also defensible at the end of `e6-hl-005` and `e6-hl-012`. The uitroepteken is the nicer answer but not the only one. The lesson says "Roept iemand iets, of is iemand blij, boos of bang? Dan een uitroepteken." which fits, but the options include a punt.
* **Correct form:** make the context clearly shouted, for example "Pas op, een T-rex" with "!" in the speech, or add "roept Sam". Remove "een punt" from the options of `e6-hl-012` and `e6-hl-005`, or accept both.
* **Severity:** ambiguous (minor).

### F7. `e6` lesson "Persoonsvorm": a rule that is only half true

* **Lesson page:** taal-e6 ontleden, "Persoonsvorm". Text: "In een vraag staat de persoonsvorm helemaal vooraan."
* **What is wrong:** true only for ja/nee vragen ("Ga jij mee?"). In "Waar ga jij heen?" the persoonsvorm is second. A kid may later pick the wrong word.
* **Correct form:** "In een vraag waar je ja of nee op kunt zeggen, staat de persoonsvorm helemaal vooraan." Item `e6-on-012` ("Ga jij vanmiddag naar de bieb?") is fine.
* **Severity:** wrong (lesson text, minor).

### F8. Komma rules that are advice, taught as must (style, confirm)

* **Items:** leestekens `ls-km-003`, `ls-km-004`, `ls-km-009`, `ls-km-010`, cito `km-006`, `km-013`, `km-015`, `km-016`, `km-017` (komma after ja or nee, and after an opening bijzin), `km-009` and lesson page "Twee zinnen aan elkaar" (komma between two hele zinnen without en: "De dino had honger, hij at een boom leeg.").
* **What is wrong:** these are normal school rules (the cito module is built on the school books), and the Taaladvies says the komma is common but not compulsory after ja or nee and after an opening bijzin. Two hele zinnen with only a komma is called a "komma splice" by some teachers, who prefer a punt or puntkomma. Kids who skip a komma that is optional are marked wrong.
* **Correct form:** keep as is if the school method teaches them (this is the likely case), but a teacher should confirm. If not, change `km-009` to use "want" or a punt.
* **Severity:** style.

### F9. Small lesson inconsistencies between modules (style)

* cito `ww-verleden` lesson page "Het voltooid deelwoord" lists "be, ver, ont of ge". kofschip and taal-e6 list "be, ge, ver, her, ont". Add "her" (and the lesson is otherwise right).
* leestekens `apostrof` lesson page "Van wie is het?" says a name on s gets only an apostrof. cito says "s, x of z". Add x and z (e.g. Max' pet).
* cito `klanken` lesson page "ei of ij" says "Daar is geen regel voor". taal-e6 teaches the rules -heid (ei) and -lijk (ij). Say "Meestal moet je de woorden leren. Maar -heid heeft altijd ei en -lijk altijd ij."
* taal-e6 `meervoud` lesson page "-en of -s" says -el, -em, -en, -er, -je get only an s. There are exceptions (for example engelen). Say "meestal".

### F10. Typo and wording (typo, style)

* cito `kl-004` explain: "Dat is een ei woord dat je moet leren" should be "Dat is een ei-woord dat je moet leren" (typo).
* taal-e6 `meervoud` lesson, "Zonder 's zou je auto-s anders lezen." is odd. Better: "Zonder 's lees je autos met een korte o."
* cito `tk-008` explain: "Je zou eee samen lezen" is confusing. Better: "Je zou ee en e samen als één klank lezen."
* leestekens `ls-dp-013` explain: "Na zegt tegen de hond komt wat papa zegt" is clumsy. Better: "Papa zegt tegen de hond: dan volgt wat hij zegt."
* cito `ww-tt-028` explain: "Hij staat achter het werkwoord" (it means "mijn broer"). Better: "Mijn broer staat achter het werkwoord, maar het is één persoon."
* cito `woordvormen` lesson examples: "We eten pannenkoeken met een verjaardagstaart toe." and "Ik maak een tekening van mijn vrijheid." read oddly. Use "We eten pannenkoeken en een verjaardagstaart." and "Ik maak een tekening van mijn nieuwe fiets."
* cito `ww-vt-021` and `ww-vt-024`: tegenwoordige tijd items sit in the verleden file. Fine for the exam mix, only a note.

### F11. Titles rule (style, confirm)

* **Item:** cito `hl-019` ("De kleine dino", only first word capital) and lesson page "Titels en namen met van of de".
* **Note:** only the first word with a hoofdletter is the common rule, but "De Kleine Dino" is not a spelling error in the Woordenlijst. The item is fine as a school rule. A teacher should confirm the school wants it.
* **Severity:** style.

### F12. Words that may be hard for age 8 to 10 (style)

Fine for groep 7, check for groep 6 where the topic is marked groep 6:

* Terms: persoonsvorm, bijvoeglijk naamwoord, directe rede (cito `leestekens` lesson), aanhalingstekens, klankgroep, leenwoord, samenstelling, verkleinwoord, voltooid deelwoord.
* Words: nieuwsgierigheid (e6-wm-016), elektriciteit, kwaliteit, presentatie, verschrikkelijk (kl-022), reusachtig (kl-023), schaduwrijke (kl-025), onderzoekers, avontuur, "des ochtends / des nachts" (ap lesson, archaic).
* Group 7 only (trema-koppelteken): reünie, poëzie, beïnvloeden, geïnteresseerd, naïef, ruïne. These match group 7 but are hard.
* Informal: "bieb" (used in several items), "m'n" (ap-019, allowed in the Woordenlijst as informal).

None of these need to change, they are a list for the teacher.

## What checked out (no finding)

* All 't kofschip answers (kofschip, taal-e6 `werkwoordspelling`, cito `ww-verleden`, kf-vt, kf-vd, kf-lg): correct, explains correct, only one right option each.
* Meervoud and 's rules (e6-mv, ls-ap, ap): correct. auto's, kiwi's, baby's, pony's, oma's, tantes, cafés, Anna's, Toms, Joris', Max', Klaas', Sannes, Peters, auto'tje, baby'tje, foto'tje, cd's, tv's, 's avonds, 's Avonds.
* Verkleinwoorden: boekje, stoeltje, boompje, balletje, ringetje, koninkje, kussentje, kammetje, sjaaltje: correct.
* Leenwoorden and klanken: cadeau, bureau, chauffeur, restaurant, bacterie, thee, theater, politie, vakantie, informatie, logisch, fantastisch, elektrisch, cactus, circus, kiwi, taxi, safari, computer, game, team, hobby: correct.
* Trema and koppelteken: ideeën, knieën, zeeën, skiën, drieën, ruïne, reünie, poëzie, beïnvloeden, geïnteresseerd, naïef, zee-egel, zee-eend, auto-ongeluk, radio-omroep, politieagent, wc-papier, tv-programma, T-shirt, oud-leerling, ex-kampioen, Noord-Holland, Zuid-Holland, Zuid-Afrika, Noordzee: correct.
* Hoofdletters: dagen, maanden, seizoenen klein; Pasen, Koningsdag, Kerstmis groot; paasei, paashaas, kerstvakantie klein; Franse kaas, Belgische friet, Nederlandse vlag, Engels; Verenigde Staten, Middellandse Zee, Den Haag; Lisa van Dijk, juf Van Dam: correct.
* Ontleden: lidwoord, zelfstandig naamwoord, bijvoeglijk naamwoord, werkwoord, persoonsvorm (verleden tijd test), onderwerp (wie of wat): the answers are right (see F3 and F7 for two details).
* Werkwoordspelling tegenwoordige tijd (e6-ww, ww-tt): jij and u rules, d and t stams (word, vind, houd, rijd), onderwerp far from the werkwoord: correct. Note: `ww-tt-029` explain says "houd jij (of hou jij)". Both are allowed by the Woordenlijst. No type item exists that would reject "hou", so nothing to change.

## Top 5 to fix

1. **F1** komma and aanhalingstekens: pick one rule for all three modules (`lt-022`, `lt-023`, cito lesson page 4, against `ls-dp-012`, `e6-hl-010` and their lessons).
2. **F2** `ww-vt-027` explain says "het onderwerp is het". Fix the sentence.
3. **F3** `e6-on-008` and the zelfstandig naamwoord test: "het springen" is correct Dutch.
4. **F5** `km-019` and `km-025`: komma between adjectives is optional, so a correct kid answer can be marked wrong.
5. **F4 and F6** ambiguous answers: `e6-kl-004` (ijsje or eisje) and `e6-hl-005`, `e6-hl-012` (punt or uitroepteken).

## 20 items for the founder or a teacher (10 minutes)

Read the question, decide if the expected answer is the only good one. Items marked (*) are the ones with a finding above. The rest are hard ones where the answer is right but worth a human eye.

| # | Id | Question (as the kid sees it) | Expected answer |
|---|---|---|---|
| 1 | kf-lg-002 | Schrijf het werkwoord in de verleden tijd. "Wij (reizen) met de trein naar oma." | reisden |
| 2 | kf-vd-009 | Schrijf het voltooid deelwoord. "Mijn kapotte fiets is (repareren)." | gerepareerd |
| 3 | kf-lg-013 | Welk woord is fout geschreven? "Wij hebben het hele verhaal geloofd." | Geen fout |
| 4 | ls-dp-012 (*) | Tik waar een dubbele punt moet. `"Kom binnen", zegt oma.` | nergens (komma staat buiten de aanhalingstekens, zie F1) |
| 5 | ls-pk-007 | Tik waar een puntkomma moet. "Tim houdt van voetbal zijn zus houdt van hockey." | na voetbal |
| 6 | ls-ap-008 | Dat is ... tekening. Options: Joris' / Joris's / Jorises / Joriss | Joris' |
| 7 | ls-km-009 (*) | Tik waar een komma moet. "Als het morgen regent gaan wij naar het museum." | na regent (zie F8) |
| 8 | e6-mv-013 | Schrijf het meervoud. "Ik koop een bos (roos) voor mama." | rozen |
| 9 | e6-ww-016 | Welke zin is goed? Noor en Bas wandelden / wandelde / wandelten / wandelte door het bos. | Noor en Bas wandelden door het bos. |
| 10 | e6-kl-004 (*) | Welke letters moeten op de stippen? "Na het zwemmen eten wij een ...sje." | ij (maar eisje kan ook, zie F4) |
| 11 | e6-on-008 (*) | Welk woord is geen zelfstandig naamwoord? boom / fiets / springen / appel | springen (zie F3) |
| 12 | e6-hl-012 (*) | Welk leesteken moet aan het eind? "Kijk eens, wat een prachtige regenboog" | uitroepteken (!) (punt kan ook, zie F6) |
| 13 | e6-wm-013 | We kijken samen naar de ... . televisie / televitie / televizie / televisje | televisie |
| 14 | km-019 (*) | Tik waar een komma moet. "Rex is een lieve slimme grappige dino." | na lieve en na slimme (zie F5) |
| 15 | lt-023 (*) | Welk woord is fout geschreven? `"Ik ben moe." zei de dino.` | het woord moe., verbeterd tot `moe,"` (zie F1: of `moe",`) |
| 16 | ww-vt-027 (*) | "Wat ... er als de dino het ei laat vallen?" gebeurt / gebeurd / gebeurdt | gebeurt (zie F2 over de uitleg) |
| 17 | hl-021 | Schrijf het woord tussen haakjes goed op. "Wij gaan op vakantie naar de (verenigde staten)." | Verenigde Staten |
| 18 | tk-017 | We spelen met z'n ... drieën / drieen / drie-en | drieën |
| 19 | lw-014 | Verbeter het woord tussen haakjes. "Bij het eten krijgen we (puré) met worteltjes." | puree |
| 20 | wv-027 | Maak er één woord van. "een feest voor je verjaardag" | verjaardagsfeest |

Extra, if there is time: `ww-tt-029` (houd of hou), `ap-019` (m'n, informal), `hl-025` (Middellandse Zee), `ww-vt-030` ("pas (verven) bank" geverfde).

## Lookup list for woordenlijst.org (free, 2 minutes)

I am sure of all of these from the Woordenlijst, but they were not looked up live this session: puree (lw-014), verjaardagsfeest (wv-027), dinosaurusei (wv-020), wc-papier (tk-007), tv-programma (tk-018), paashaas, kerstvakantie, oud-leerling, ex-kampioen, gerelaxt, gesurft, gemaild, Middellandse Zee, bieb, m'n, cool, game, cd's, tv's, auto'tje, baby'tje, foto'tje.

## For the founder

* **Decision needed:** which komma rule next to aanhalingstekens the school method teaches (F1). Everything else can be fixed by the developer once a teacher confirms F5 and F8.
* After fixes, T65 also needs `validate.py` to stay OK and the item count to stay the same or T7 to read the new count (PLAN note).
* AC124 asks for the result in `docs/TEST_REPORT.md`. This file holds the full detail. When the fixes are in and the 20 items are read, add one summary line to `docs/TEST_REPORT.md` that points here.
