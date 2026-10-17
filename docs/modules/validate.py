#!/usr/bin/env python3
"""Check a learning module against the format in docs/modules/README.md.

Usage: python3 docs/modules/validate.py docs/modules/<module-id>
Prints every problem found and exits with 1 if there are any.
"""
import json
import sys
from collections import Counter
from pathlib import Path

ITEM_TYPES = {"choice", "find-error", "type", "punctuate"}
COMMON = ["id", "type", "level", "skill", "prompt", "explain"]
MIN_ITEMS_PER_LEVEL = 6
# AC123: longest sentence in words, per level.
MAX_WORDS = {"M6": 15, "E6": 15, "M7": 20, "E7": 20}

errors = []


def err(where, msg):
    errors.append(f"{where}: {msg}")


def is_text(v):
    return isinstance(v, str) and v.strip() != ""


def sentence_of(it):
    """The sentence an item shows: 'sentence', else the 'words' joined."""
    if is_text(it.get("sentence")):
        return " ".join(it["sentence"].split())
    w = it.get("words")
    if isinstance(w, list) and all(isinstance(x, str) for x in w):
        return " ".join(w)
    return ""


def texts_of(it):
    """Every sentence an item shows: 'sentence', 'words', or each option when
    the options are the sentences (a choice without 'sentence')."""
    if is_text(it.get("sentence")):
        return [sentence_of(it)]
    w = it.get("words")
    if isinstance(w, list) and w and all(isinstance(x, str) for x in w):
        return [" ".join(w)]
    o = it.get("options")
    if isinstance(o, list) and all(isinstance(x, str) for x in o):
        return [" ".join(x.split()) for x in o]
    return []


def identity_of(it):
    """What makes a question the same question: sentence, words or options."""
    return " | ".join(sorted(texts_of(it)))


def check_item(where, it, levels):
    for key in COMMON:
        if not is_text(it.get(key)):
            err(where, f"missing or empty '{key}'")
    t = it.get("type")
    if t not in ITEM_TYPES:
        err(where, f"unknown type {t!r}")
        return
    if it.get("level") not in levels:
        err(where, f"level {it.get('level')!r} is not one of the module levels")
    limit = MAX_WORDS.get(it.get("level"))
    n_words = max((len(t.split()) for t in texts_of(it)), default=0)
    if limit and n_words > limit:
        err(where, f"sentence has {n_words} words, at level {it.get('level')} the limit is {limit}")

    if t == "choice":
        opts = it.get("options")
        if not (isinstance(opts, list) and 2 <= len(opts) <= 4 and all(is_text(o) for o in opts)):
            err(where, "options must be 2 to 4 non empty strings")
            return
        if len(set(o.strip() for o in opts)) != len(opts):
            err(where, "two options are equal")
        a = it.get("answer")
        if not (isinstance(a, int) and 0 <= a < len(opts)):
            err(where, "answer must be an index into options")
    elif t == "find-error":
        words = it.get("words")
        if not (isinstance(words, list) and words and all(is_text(w) and " " not in w for w in words)):
            err(where, "words must be a list of single words")
            return
        a = it.get("answer")
        if not (isinstance(a, int) and -1 <= a < len(words)):
            err(where, "answer must be -1 or an index into words")
        elif a == -1 and it.get("correction") is not None:
            err(where, "correction must be null when answer is -1")
        elif a >= 0:
            c = it.get("correction")
            if not is_text(c):
                err(where, "correction is required when a word is wrong")
            elif c == words[a]:
                err(where, "correction is the same as the wrong word")
    elif t == "type":
        a = it.get("answer")
        if not (isinstance(a, list) and a and all(is_text(x) for x in a)):
            err(where, "type item needs an accepted answer: a non empty list of strings")
    elif t == "punctuate":
        words = it.get("words")
        if not (isinstance(words, list) and len(words) >= 2 and all(is_text(w) and " " not in w for w in words)):
            err(where, "words must be a list of at least 2 single words")
            return
        if not is_text(it.get("mark")):
            err(where, "mark is required")
        a = it.get("answer")
        if not (isinstance(a, list) and all(isinstance(i, int) and 0 <= i < len(words) - 1 for i in a)):
            err(where, "answer must list gap indices between 0 and len(words) - 2")
        elif len(set(a)) != len(a):
            err(where, "answer has duplicate gaps")
        else:
            mark = it.get("mark", "")
            for i in a:
                if words[i].endswith(mark):
                    err(where, f"word {i} already ends with the mark, the kid cannot add it")


def check_lesson(where, lesson):
    pages = (lesson or {}).get("pages")
    if not (isinstance(pages, list) and pages):
        err(where, "lesson needs at least one page")
        return
    for n, p in enumerate(pages):
        w = f"{where} page {n}"
        for key in ("title", "text"):
            if not is_text(p.get(key)):
                err(w, f"missing '{key}'")
        ex = p.get("examples")
        if not (isinstance(ex, list) and ex and all(is_text(e.get("good")) for e in ex)):
            err(w, "needs at least one example with 'good'")
        if "skill" in p and not is_text(p.get("skill")):
            err(w, "'skill' must be a non empty string when present")


def main(folder):
    folder = Path(folder)
    mod = json.loads((folder / "module.json").read_text(encoding="utf-8"))
    levels = mod.get("levels") or []
    for key in ("id", "title", "subject", "language"):
        if not is_text(mod.get(key)):
            err("module.json", f"missing '{key}'")

    ids = Counter()
    module_seen = {}  # (prompt, sentence) -> where it first appeared
    pool = {}  # topic -> list of items
    for topic in mod.get("topics", []):
        path = folder / f"{topic}.json"
        if not path.exists():
            err(path.name, "topic file is missing")
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            err(path.name, f"not valid JSON: {e}")
            continue
        if data.get("id") != topic:
            err(path.name, f"id {data.get('id')!r} does not match the file name")
        if not is_text(data.get("title")):
            err(path.name, "missing 'title'")
        check_lesson(path.name, data.get("lesson"))
        items = data.get("items") or []
        seen_q = set()
        for n, it in enumerate(items):
            where = f"{path.name} item {it.get('id', n)}"
            ids[it.get("id")] += 1
            check_item(where, it, levels)
            q = (it.get("prompt"), it.get("sentence"), json.dumps(it.get("words"), ensure_ascii=False), json.dumps(it.get("options"), ensure_ascii=False))
            if q in seen_q:
                err(where, "same question appears twice in this topic")
            seen_q.add(q)
            sentence = identity_of(it)
            if sentence:
                key = (it.get("prompt"), sentence)
                if key in module_seen:
                    err(where, f"same prompt and sentence as {module_seen[key]}")
                else:
                    module_seen[key] = it.get("id", n)
        per_level = Counter(it.get("level") for it in items)
        for lv in levels:
            if per_level[lv] < MIN_ITEMS_PER_LEVEL:
                err(path.name, f"only {per_level[lv]} items at level {lv}, need {MIN_ITEMS_PER_LEVEL}")
        pool[topic] = items

    for i, c in ids.items():
        if c > 1:
            err("module", f"id {i!r} is used {c} times")

    for ex in mod.get("exams", []):
        w = f"exam {ex.get('id')}"
        mix = ex.get("mix") or {}
        total = sum(mix.values())
        for topic, weight in mix.items():
            if topic not in pool:
                err(w, f"mix names unknown topic {topic!r}")
                continue
            need = -(-ex.get("questionCount", 0) * weight // total)
            have = sum(1 for it in pool[topic] if it.get("level") in ex.get("levels", []))
            if have < need:
                err(w, f"topic {topic} has {have} items at the exam levels, needs {need}")

    total_items = sum(len(v) for v in pool.values())
    if errors:
        print("\n".join(errors))
        print(f"\n{len(errors)} problem(s) in {total_items} items.")
        sys.exit(1)
    print(f"OK: {len(pool)} topics, {total_items} items, {len(mod.get('exams', []))} exams.")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
