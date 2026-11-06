#!/usr/bin/env python3
"""Unit tests for scripts/dashboard.py. Run from the repo root:
  python3 -m unittest scripts/test_dashboard.py
  python3 scripts/test_dashboard.py
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dashboard as d  # noqa: E402

BACKLOG = """# Backlog

## Next steps

| Rank | Release | Status |
|---|---|---|
| 9 | **not this table** | next |

## Ranked backlog

| Rank | Release | What the kids or the parent feel | Size | Value for the kids | Plan tasks | Status |
|---|---|---|---|---|---|---|
| | **v1** | The block world with dinos | | | every v1 task | shipped (0.1.0) |
| | **R1** (refactor, not a release) | Buttons are never dead. | S to M | Medium. | R1a | shipped (2026-10-24) |
| 1 | **v11 Dorp** | Villages with houses and a villager who asks a question when I come close, then a dance and a rare block and much more text after that | M | High. | V11a | next (0.5.0) |
| 2 | **v3 Dino's veilig** | A backup file. | M | High. | T18 | candidate, next after v11 |
| | **v7 Eigen woorden** | | | | T40 | dropped (decision 79) |
| | **v99 Odd** | Something. | S | | | maybe one day |

Text after the table.

## Dropped

| | **v0** | x | | | | shipped |
"""

DECISIONS = """# Decisions

Founder decisions are marked `NEEDS FOUNDER` until answered.

| # | Date | Decision | Options considered | Chosen | Who | Status |
|---|---|---|---|---|---|---|
| 87 | 2026-10-22 | Kid says points do not add up | a; b | a | Founder | DECIDED |
| 88 | 2026-10-22 | Komma next to quotes | a | a | Founder | DECIDED |
| 89 | 2026-10-23 | Bigger world now or later | now; later | | Founder | NEEDS FOUNDER |
| 90 | 2026-10-24 | Release after R1 | a | a | Founder | DECIDED |
| 91 | 2026-10-24 | Dashboard | a | a | Founder | DECIDED |
| 92 | 2026-10-24 | Points per round | a | a | Founder | DECIDED |
"""

CHANGELOG = """# Changelog

## Unreleased

### Dinowinkel

* Herd of 25.
* Inruilen.
  Second line of the same bullet.

### Voor ouders

- Voortgang.

## 0.5.0 (2026-10-24)

* Villages.
* Villagers.

## 0.4.0 (2026-10-24)

* Older.
"""


class BacklogTest(unittest.TestCase):
    def test_rows_and_chips(self):
        rows = d.parse_backlog(BACKLOG)
        self.assertEqual([r["release"] for r in rows],
                         ["v1", "R1", "v11 Dorp", "v3 Dino's veilig", "v7 Eigen woorden", "v99 Odd"])
        self.assertEqual([r["chip"] for r in rows],
                         ["shipped", "shipped", "next", "candidate", "dropped", "other"])
        self.assertEqual(rows[1]["note"], "(refactor, not a release)")
        self.assertEqual(rows[1]["size"], "S to M")
        self.assertEqual(rows[2]["rank"], "1")
        self.assertEqual(rows[0]["status"], "shipped (0.1.0)")

    def test_feel_is_trimmed(self):
        rows = d.parse_backlog(BACKLOG)
        self.assertLessEqual(len(rows[2]["feel"]), 101)
        self.assertTrue(rows[2]["feel"].endswith("…"))

    def test_no_section_is_unknown(self):
        self.assertEqual(d.parse_backlog("# Backlog\n\nNothing here.\n"), d.UNKNOWN)


class DecisionsTest(unittest.TestCase):
    def test_counts_last_and_open(self):
        res = d.parse_decisions(DECISIONS)
        self.assertEqual(res["total"], 6)
        self.assertEqual([r["n"] for r in res["last"]], [92, 91, 90, 89, 88])
        self.assertEqual(res["last"][0]["title"], "Points per round")
        self.assertEqual(res["last"][0]["date"], "2026-10-24")
        self.assertEqual([r["n"] for r in res["open"]], [89])
        self.assertEqual(res["open"][0]["title"], "Bigger world now or later")

    def test_intro_line_is_not_a_decision(self):
        res = d.parse_decisions(DECISIONS)
        self.assertTrue(all(isinstance(r["n"], int) for r in res["open"]))


class ChangelogTest(unittest.TestCase):
    def test_unreleased_count_and_latest(self):
        res = d.parse_changelog(CHANGELOG)
        self.assertEqual(res["unreleased"], 3)
        self.assertEqual(res["latest"], "0.5.0")
        self.assertEqual(res["latest_date"], "2026-10-24")

    def test_no_unreleased_section(self):
        res = d.parse_changelog("# Changelog\n\n## 0.1.0 (2026-10-19)\n\n* First.\n")
        self.assertEqual(res["unreleased"], d.UNKNOWN)
        self.assertEqual(res["latest"], "0.1.0")


class OtherParsersTest(unittest.TestCase):
    def test_plan_ids(self):
        plan = ("| Milestone | x |\n|---|---|\n| **M1** | y |\n\n| ID | Task |\n|---|---|\n"
                "| T19 | a |\n| V11a | b |\n| R2e | c |\n| Not an id | d |\n")
        self.assertEqual(d.parse_plan(plan), ["T19", "V11a", "R2e"])

    def test_status_lines(self):
        res = d.parse_status("# Status\n\n**Phase:** small `releases`.\n**Blockers:** none.\n")
        self.assertEqual(res["phase"], "small releases.")
        self.assertEqual(res["blockers"], "none.")
        self.assertEqual(res["next"], d.UNKNOWN)

    def test_friction_last_three(self):
        text = "| Date | Step | Agent | What happened | How |\n|---|---|---|---|---|\n" + "".join(
            "| 2026-10-%02d | step%d | op | thing %d | fixed |\n" % (i, i, i) for i in range(1, 6))
        res = d.parse_friction(text)
        self.assertEqual(res["total"], 5)
        self.assertEqual([r["area"] for r in res["last"]], ["step5", "step4", "step3"])
        self.assertEqual(res["last"][0]["text"], "thing 5")


class MissingSourceTest(unittest.TestCase):
    def test_every_parser_gives_unknown(self):
        self.assertEqual(d.parse_package_version(None), d.UNKNOWN)
        self.assertEqual(d.parse_package_version("not json"), d.UNKNOWN)
        self.assertEqual(d.parse_changelog(None)["unreleased"], d.UNKNOWN)
        self.assertEqual(d.parse_backlog(None), d.UNKNOWN)
        self.assertEqual(d.parse_plan(None), d.UNKNOWN)
        self.assertEqual(d.parse_decisions(None), d.UNKNOWN)
        self.assertEqual(d.parse_friction(None), d.UNKNOWN)
        self.assertEqual(d.parse_status(None)["phase"], d.UNKNOWN)

    def test_read_missing_file(self):
        self.assertIsNone(d.read("docs/does-not-exist.md"))

    def test_render_with_everything_unknown(self):
        data = {
            "generated": "now", "version": d.UNKNOWN, "changelog": d.parse_changelog(None),
            "backlog": d.UNKNOWN, "tasks": d.UNKNOWN, "decisions": d.UNKNOWN,
            "status": d.parse_status(None), "friction": d.UNKNOWN,
            "tests": {"e2e_specs": d.UNKNOWN, "e2e_tests": d.UNKNOWN,
                      "unit_files": d.UNKNOWN, "unit_tests": d.UNKNOWN},
            "git": {"branch": d.UNKNOWN, "commits": [], "ahead": d.UNKNOWN, "tags": []},
            "modules": d.UNKNOWN, "sources": [],
        }
        page = d.render(data)
        self.assertIn("<title>Minespel dashboard</title>", page)
        self.assertIn("unknown", page)
        self.assertIn("| Open tasks | unknown |", d.summary(data))

    def test_text_is_escaped(self):
        rows = d.parse_backlog("## Ranked backlog\n\n| Rank | Release | What the kids or the parent feel | Size | Value | Tasks | Status |\n"
                               "|---|---|---|---|---|---|---|\n| | **<b>x</b>** | <script> | S | | | next |\n")
        data = {
            "generated": "now", "version": "1", "changelog": d.parse_changelog(None), "backlog": rows,
            "tasks": [], "decisions": d.parse_decisions(""), "status": d.parse_status(None),
            "friction": d.parse_friction(""),
            "tests": {"e2e_specs": 0, "e2e_tests": 0, "unit_files": 0, "unit_tests": 0},
            "git": {"branch": "b", "commits": [], "ahead": 0, "tags": []}, "modules": [], "sources": [],
        }
        page = d.render(data)
        self.assertNotIn("<script>", page)
        self.assertIn("&lt;script&gt;", page)


if __name__ == "__main__":
    unittest.main()
