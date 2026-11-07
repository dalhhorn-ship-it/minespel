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


TECH_DEBT = """> Known tech debt.

# Tech debt

| Id | Severity | Item | Where | Size | Source | Status |
|---|---|---|---|---|---|---|
| TD1 | low | Tidy a file. | `a.ts` | S | review | open |
| TD2 | major | A refresh can lose a block. | `save.ts:62` | S | N2 | open |
| TD3 | medium | Big shop file. | `shop.ts` | M | SIMPLIFY | open |
| TD4 | major | Main was red. | `x.spec.ts` | S | N1 | done |
| TD5 | Major | Worlds stop saving. | `world-save.ts` | S | N2 | open |
"""


def run(i, day, concl, branch="feature", minutes=3):
    start = "2026-11-%02dT10:00:00Z" % day
    return {"id": i, "name": "CI", "event": "push", "head_branch": branch, "status": "completed",
            "conclusion": concl, "created_at": start, "run_started_at": start,
            "updated_at": "2026-11-%02dT10:%02d:00Z" % (day, minutes), "html_url": "https://example.test/%d" % i}


class TechDebtTest(unittest.TestCase):
    def test_counts_and_order(self):
        res = d.parse_tech_debt(TECH_DEBT)
        self.assertEqual(res["total"], 5)
        self.assertEqual(res["open_total"], 4)
        self.assertEqual(res["open"], {"major": 2, "medium": 1, "low": 1})
        self.assertEqual([r["id"] for r in res["items"]], ["TD2", "TD5", "TD3", "TD1"])
        self.assertEqual(res["items"][0]["where"], "save.ts:62")

    def test_no_table_is_unknown(self):
        self.assertEqual(d.parse_tech_debt("# Tech debt\n\nNothing yet.\n"), d.UNKNOWN)
        self.assertEqual(d.parse_tech_debt(None), d.UNKNOWN)


class CiRunsTest(unittest.TestCase):
    TODAY = d.datetime.date(2026, 11, 6)  # a Friday in ISO week 45

    def runs(self):
        return [
            run(1, 6, "success", "main", 2),
            run(2, 5, "failure", "main", 4),
            run(3, 5, "cancelled", "feature", 1),
            run(4, 4, "skipped", "feature", 0),
            run(5, 3, "success", "feature", 6),
            run(6, 2, "failure", "feature", 8),
        ]

    def test_metrics(self):
        m = d.ci_metrics(self.runs(), self.TODAY)
        self.assertEqual(m["runs"], 6)
        self.assertEqual(m["decided_30"], 4)
        self.assertEqual(m["pass_rate_30"], 50)
        self.assertEqual(m["main_pass_rate"], 50)
        self.assertEqual(m["median_min"], 5.0)  # 2, 4, 6, 8
        self.assertEqual(m["p90_min"], 8.0)
        self.assertEqual(m["last_failure"]["url"], "https://example.test/2")
        self.assertEqual(m["last_main_failure"]["date"], "2026-11-05")
        self.assertEqual(m["weeks"][-1], "2026-W45")
        self.assertEqual(len(m["weeks"]), 8)
        self.assertEqual(m["runs_per_week"][-1], 6)   # Monday 2 to Friday 6 November
        self.assertEqual(m["runs_per_week"][-2], 0)
        self.assertEqual(m["pass_per_week"][-1], 50)  # 2 of 4 finished runs
        self.assertEqual(m["pass_per_week"][-2], d.UNKNOWN)

    def test_parse_file_text(self):
        text = '{"source": "x", "runs": [\n%s\n]}' % ",\n".join(d.json.dumps(r) for r in self.runs())
        self.assertEqual(len(d.parse_ci_runs(text)), 6)
        self.assertEqual(d.parse_ci_runs("not json"), d.UNKNOWN)
        self.assertEqual(d.parse_ci_runs(None), d.UNKNOWN)
        self.assertEqual(d.ci_metrics(d.UNKNOWN, self.TODAY), d.UNKNOWN)
        self.assertEqual(d.ci_metrics([], self.TODAY), d.UNKNOWN)

    def test_deploys(self):
        m = d.deploy_metrics(["2026-11-06", "2026-11-02", "2026-10-26", "bad"], self.TODAY)
        self.assertEqual(m["total"], 3)
        self.assertEqual(m["last"], "2026-11-06")
        self.assertEqual(m["per_week"][-1], 2)
        self.assertEqual(m["per_week"][-2], 1)
        self.assertEqual(d.deploy_metrics(d.UNKNOWN, self.TODAY), d.UNKNOWN)


class ReleaseTest(unittest.TestCase):
    def test_intervals(self):
        text = ("## Unreleased\n\n* x\n\n## 0.4.0 (2026-10-24)\n\n## 0.3.0 (2026-10-22)\n\n"
                "## 0.2.0 (2026-10-19)\n\n## 0.1.0 (2026-10-19)\n")
        m = d.release_metrics(text, d.datetime.date(2026, 11, 6))
        self.assertEqual(m["count"], 4)
        self.assertEqual(m["median_gap_days"], 2)  # gaps 0, 3, 2
        self.assertEqual(m["days_since_last"], 13)
        self.assertEqual(m["versions"][0]["version"], "0.1.0")

    def test_no_dated_release(self):
        self.assertEqual(d.release_metrics("## Unreleased\n\n* x\n", d.datetime.date(2026, 11, 6)), d.UNKNOWN)
        self.assertEqual(d.release_metrics(None, d.datetime.date(2026, 11, 6)), d.UNKNOWN)


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
            "modules": d.UNKNOWN, "sources": [], "ci": d.UNKNOWN, "deploys": d.UNKNOWN,
            "releases": d.UNKNOWN, "debt": d.UNKNOWN,
        }
        page = d.render(data)
        self.assertIn("<title>Minespel dashboard</title>", page)
        self.assertIn("No CI data. Run python3 scripts/ci_runs.py", page)
        self.assertIn("| CI | unknown |", d.summary(data))
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
        page = d.render(data, refresh_trigger="")
        self.assertNotIn("<script>", page)
        self.assertIn("&lt;script&gt;", page)


ROADMAP_BACKLOG = """## Ranked backlog

| Rank | Release | What the kids or the parent feel | Size | Value for the kids | Plan tasks | Status |
|---|---|---|---|---|---|---|
| | **v1** | The block world | | | every v1 task | shipped (0.1.0) |
| | **R1** (refactor, not a release) | Buttons work. | S | | R1a to R1e | shipped |
| 1 | **v3 Dino's veilig** | A backup file. | M | High. | T18, T55 | next (0.6.0) |
| 2 | **v6 Wat heb ik geleerd** | A parent dashboard. | M | High. | T21 | candidate, after v3 |
| 3 | **v12 Dino-Hoed** | Hats for dinos. #foundation | S | High. | about 3 | candidate |
| 4 | **v4 Altijd spelen** | Starts without internet. | M | | T52 | later (after v3) |
| 5 | **v5 Veilig en juist** | Safe and smooth. #value | M | | T63 | candidate |
| | **v7 Eigen woorden** | | | | T40 | dropped (decision 79) |
"""

ROADMAP_PLAN = """| ID | Task | Depends on | Group | Files | Acceptance | Milestone | Status |
|---|---|---|---|---|---|---|---|
| T18 | Backup file | none | V3-A | src/a.ts | AC1 | v3 | todo |
| T55a | Settings | none | V3-B | src/b.ts | AC2 | v3 | doing |
| T19 | Share helpers | none | V3-A | src/c.ts | AC3 | v3 | done |
| T21 | Results queries | T67 | E | src/d.ts | AC4 | M5 | todo |
| T52 | Robustness with a `a | b` pipe in the text | T18 | K | src/e.ts | AC5 | M5 | todo |
| T63 | Kid safety suite | T20 | M | tests/e2e/f.ts | AC6 | M7 | todo |
| R3a | Split the shop | none | R | src/ui/shop.ts | AC7 | R3 | todo |
| R2a | Boot out of main | none | R | src/main.ts | AC8 | R2 | done |
"""


class RoadmapTest(unittest.TestCase):
    def build(self):
        backlog = d.parse_backlog(ROADMAP_BACKLOG)
        plan = d.parse_plan_tasks(ROADMAP_PLAN)
        return d.roadmap(backlog, plan, d.parse_tech_debt(TECH_DEBT))

    def test_plan_tasks_read_milestone_and_status_from_the_end(self):
        plan = d.parse_plan_tasks(ROADMAP_PLAN)
        self.assertEqual([(t["id"], t["milestone"], t["status"]) for t in plan][:5], [
            ("T18", "v3", "todo"), ("T55a", "v3", "doing"), ("T19", "v3", "done"),
            ("T21", "M5", "todo"), ("T52", "M5", "todo")])
        self.assertEqual(d.parse_plan_tasks(None), d.UNKNOWN)

    def test_lane_rule(self):
        rows = {r["id"]: r for r in d.parse_backlog(ROADMAP_BACKLOG)}
        self.assertEqual(d.lane_of(rows["v3"]), "value")
        self.assertEqual(d.lane_of(rows["R1"]), "foundation")      # refactor round
        self.assertEqual(d.lane_of(rows["v4"]), "foundation")      # LANE_OVERRIDES
        self.assertEqual(d.lane_of(rows["v12"]), "foundation")     # #foundation tag
        self.assertEqual(d.lane_of(rows["v5"]), "value")           # #value beats the override
        self.assertEqual(rows["v12"]["tags"], ["foundation"])

    def test_columns_lanes_and_numbers(self):
        rm = self.build()
        cols = rm["columns"]
        self.assertEqual([c["name"] for c in cols], ["Now", "Then", "Later", "Tech debt to schedule"])
        lane = lambda i, k: [(x["title"], x["seq"]) for x in cols[i]["lanes"][k]]
        self.assertEqual(lane(0, "value"), [("v3 Dino's veilig", 1)])
        self.assertEqual(lane(0, "foundation"), [("R3 refactor round", 1)])   # open R3, done R2 is left out
        self.assertEqual(lane(1, "value"), [("v6 Wat heb ik geleerd", 2), ("v5 Veilig en juist", 3)])
        self.assertEqual(lane(1, "foundation"), [("v12 Dino-Hoed", 2)])
        self.assertEqual(lane(2, "foundation"), [("v4 Altijd spelen", 3)])
        self.assertEqual([x["title"] for x in cols[3]["lanes"]["foundation"]],
                         ["TD2", "TD5", "TD3", "TD1"])                       # major first
        self.assertEqual(cols[3]["lanes"]["foundation"][0]["seq"], 4)
        self.assertEqual(rm["open"], {"value": 3, "foundation": 7})
        self.assertEqual(rm["shipped"], 2)

    def test_release_tasks_from_milestone_and_plan_cell(self):
        now = self.build()["columns"][0]["lanes"]["value"][0]
        self.assertEqual([(t["id"], t["status"]) for t in now["tasks"]],
                         [("T18", "todo"), ("T55a", "doing"), ("T19", "done")])  # T55 finds T55a
        then = self.build()["columns"][1]["lanes"]["value"][0]
        self.assertEqual([t["id"] for t in then["tasks"]], ["T21"])

    def test_render_roadmap(self):
        page = d.render_roadmap(self.build())
        self.assertIn("Technical foundation", page)
        self.assertIn("Value for kids and parents", page)
        self.assertIn("Tech debt to schedule", page)
        self.assertIn("Dino&#x27;s veilig", page)
        self.assertNotIn("v7 Eigen woorden", page)
        self.assertIn("No roadmap yet", d.render_roadmap(d.roadmap(d.UNKNOWN, d.UNKNOWN, d.UNKNOWN)))

    def test_page_has_two_css_tabs(self):
        data = {
            "generated": "now", "version": "1", "changelog": d.parse_changelog(None),
            "backlog": d.parse_backlog(ROADMAP_BACKLOG), "tasks": [], "decisions": d.parse_decisions(""),
            "status": d.parse_status(None), "friction": d.parse_friction(""),
            "tests": {"e2e_specs": 0, "e2e_tests": 0, "unit_files": 0, "unit_tests": 0},
            "git": {"branch": "b", "commits": [], "ahead": 0, "tags": []}, "modules": [], "sources": [],
            "roadmap": self.build(),
        }
        page = d.render(data)
        self.assertIn('id="tab-overview" class="tab-input" checked', page)
        self.assertIn('id="tab-roadmap"', page)
        self.assertIn('class="panel panel-roadmap"', page)
        self.assertIn('class="panel panel-overview"', page)
        self.assertIn("Roadmap: proposed sequence", page)
        self.assertNotIn("<script", d.render(data, refresh_trigger=""))


class RefreshButtonTest(unittest.TestCase):
    """Decision 121: the Ververs button fires the dashboard Routine through the mcp capability."""

    def page(self, trigger):
        data = {
            "generated": "2026-11-07 10:00 UTC", "version": "1", "changelog": d.parse_changelog(None),
            "backlog": d.UNKNOWN, "tasks": [], "decisions": d.parse_decisions(""),
            "status": d.parse_status(None), "friction": d.parse_friction(""),
            "tests": {"e2e_specs": 0, "e2e_tests": 0, "unit_files": 0, "unit_tests": 0},
            "git": {"branch": "b", "commits": [], "ahead": 0, "tags": []}, "modules": [], "sources": [],
        }
        return d.render(data, refresh_trigger=trigger)

    def test_default_trigger_is_the_dashboard_routine(self):
        if "DASHBOARD_REFRESH_TRIGGER" not in os.environ:
            self.assertEqual(d.REFRESH_TRIGGER, "trig_01E4LwguiwHKSMXYFywVuiFP")

    def test_button_present_with_the_id(self):
        page = self.page("trig_ABC123")
        self.assertIn('id="refresh-btn" hidden>Ververs</button>', page)
        self.assertIn('"trig_ABC123"', page)
        self.assertIn('"Claude Code Remote"', page)
        self.assertIn('"fire_trigger"', page)
        self.assertIn("Ververs werkt alleen in claude.ai.", page)
        self.assertIn("Gemaakt: 2026-11-07 10:00 UTC", page)
        self.assertIn("{ trigger_id: TRIGGER }", page)
        self.assertNotIn("callTool(SERVER, TOOL", page.split("addEventListener")[0])

    def test_only_one_inline_script(self):
        page = self.page("trig_ABC123")
        self.assertEqual(page.count("<script"), 1)
        self.assertNotIn("<script src", page)
        self.assertNotIn("http", page.split("<script>")[1].split("</script>")[0])

    def test_absent_when_empty(self):
        page = self.page("")
        self.assertNotIn("refresh-btn", page)
        self.assertNotIn("<script", page)
        self.assertIn("Gemaakt: 2026-11-07 10:00 UTC", page)

    def test_unsafe_id_gives_no_button(self):
        page = self.page('x"</script><b>')
        self.assertNotIn("refresh-btn", page)
        self.assertNotIn("<script", page)


if __name__ == "__main__":
    unittest.main()
