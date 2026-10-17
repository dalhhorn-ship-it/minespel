# Plan

Task graph written by the architect. The operator updates status as work moves.
Status values: `todo`, `in progress`, `done`, `blocked`.
Tasks in the same parallel group can run at the same time because they touch different files.

| ID | Task | Depends on | Group | Files | Acceptance | Milestone | Status |
|---|---|---|---|---|---|---|---|
| T1 | Scaffold project, smoke test, working scripts/check.sh | none | A | | check.sh passes | M1 | todo |
