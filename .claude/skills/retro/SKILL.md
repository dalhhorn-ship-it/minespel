---
name: retro
description: Retrospective. Looks back at how the app was built, asks the founder and kids what was fun and what was annoying, records app lessons, and sends factory level learnings (agents, skills, models, gates, templates) back to the factory repo. Runs at the end of /ship, and can be run after any milestone.
argument-hint: "[optional: milestone or focus]"
---

You are the operator. The goal is to make the next app go better, not to grade anyone.

## 1. Gather evidence

Read, do not guess:
* `docs/FRICTION.md` (the running log of things that went wrong or felt slow)
* `docs/DECISIONS.md`, `docs/DISCUSSION.md`, `docs/TEST_REPORT.md`, `docs/STATUS.md`
* `git log --oneline` (count fix commits, reverts, retries per task)
* Lessons learned in `CLAUDE.md`
* `.factory` (which factory repo this app came from and the date it started)

Count: tasks, retries, escalations to a bigger model, tasks blocked, bugs found by QA by severity, bugs that slipped past QA, founder decisions, times the founder overrode a recommendation, times the PRD gate blocked something, PRD re signoffs.

## 2. Ask the people

Ask with AskUserQuestion, short and readable aloud (kids may answer):
* How fun is the app? (Loved it, Liked it, Meh, Not really)
* What was the best part of making it?
* What was annoying or slow? (Too many questions, Too few questions, Took too long, Something broke)
* Anything the team should do differently next time?

## 3. Sort every learning

For each learning write: what happened, evidence, and the change you propose. Then put it in one bucket:
* **App:** only matters for this app. Add it to Lessons learned in this app's `CLAUDE.md`.
* **Factory:** would help every future app. Examples: an agent prompt that misled, a skill step that was missing or wasteful, a model that was too weak or too pricey for its job, a gate that was too strict or too loose, a doc template section nobody used, a better default stack or check.sh. Name the exact template file to change (for example `template/.claude/agents/qa.md`).

Rate each factory learning: impact (high, medium, low) and confidence (seen once, seen several times).

## 4. Write it down

* `docs/RETRO.md`: append a section for this retro (date, numbers, people answers, app learnings, factory learnings).
* `docs/factory-feedback/<YYYY-MM-DD>.md` with only the factory learnings, in this format:

```
# Factory feedback: <app name>, <date>
Factory started: <started date from .factory>
App result: <fun rating>, <AC coverage>, <tasks>, <retries>

## F1: <short title>
* Area: agent | skill | model | gate | template | ci | stack
* Template file: template/...
* What happened:
* Evidence:
* Proposed change:
* Impact: high | medium | low
* Confidence: once | repeated
```

## 5. Send it to the factory

Read `.factory` for `factory_repo`. If a clone of that repo is on this computer next to this app, copy the feedback file to its `learnings/inbox/<app name>-<date>.md`. Otherwise tell the founder to run `/harvest <this app's path or GitHub repo>` in the factory, which reads `docs/factory-feedback/` from here.

Do not edit the factory template from here. The factory decides what to adopt in `/harvest`, with the founder.

## 6. Wrap up

Commit: `docs: retro`. Tell the founder in a few lines: the fun rating, the top 3 learnings, and how many went to the factory inbox.
