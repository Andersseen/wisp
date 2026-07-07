# Wisp — Spec-Driven Development (SDD) Workflow

> How work gets done in this repo. The spec is written and approved **before** the code. This exists so that any agent — including less capable models — can produce correct, in-scope changes without guessing intent.

## The rule

**No feature code without an approved spec.** Specs live in `docs/specs/NNN-slug.md` (three-digit sequential number). Exceptions that don't need a spec:

- Typos, comments, doc fixes.
- A bug fix ≤ ~20 lines that restores *documented* behavior — describe the bug and fix in the commit message instead.
- Updating `docs/STATE.md`.

Anything touching DB schema, API contracts, auth, or adding a dependency **always** needs a spec.

## Spec lifecycle

```
draft ──(owner approves)──► approved ──(work starts)──► in-progress ──(all acceptance criteria pass)──► done
                                                              │
                                                              └──► superseded (replaced by a newer spec — link it)
```

The `Status:` line in the spec header is the single source of truth. Only the **owner** (a human) moves `draft → approved`. Agents may write drafts and may move `approved → in-progress → done`.

## Agent session protocol

Follow this order every session. Do not skip steps.

1. **Orient** — read `AGENTS.md`, then `docs/STATE.md`.
2. **Pick work** — the task given by the user, or the top item in STATE.md "Next priorities". Find its spec.
   - No spec exists → write one from `docs/specs/_TEMPLATE.md`, set `Status: draft`, **stop and ask for approval**. Do not start implementing a draft.
   - Spec exists but contradicts the code or is ambiguous → stop and ask; never guess.
3. **Plan** — from the spec's Implementation checklist, pick the smallest unchecked slice that leaves the repo green.
4. **Implement** — only files inside the spec's scope. Follow `docs/CONVENTIONS.md` (copy the exemplar files). No opportunistic refactors, no new deps not listed in the spec.
5. **Verify** — run the gates: `bun run lint`, `bun run check-types`, `bun run test` (+ `bun run test:e2e` if UI changed). All green or you're not done. If you can, exercise the flow manually (curl the endpoint / drive the UI).
6. **Record** — tick the spec's checkboxes, update its `Status:`/`Updated:` lines, append a changelog line to `docs/STATE.md` and refresh its sections (see instructions inside that file).
7. **Commit** — conventional commit referencing the spec: `feat(core): validate sessions in auth plugin (spec 001)`.

## Scope discipline (most common failure mode — read twice)

- Implement **what the spec says**, not what would be "better". Improvement ideas go into the spec's "Out of scope / follow-ups" section or a new draft spec.
- If mid-implementation you discover the spec is wrong (missing case, impossible design), **stop**, note the problem in the spec, ask. Don't silently diverge — a spec that lies is worse than no spec.
- One spec per branch/PR where possible. Keep diffs reviewable.

## Writing good specs (for agents drafting them)

- Acceptance criteria must be **testable** Given/When/Then statements — each one should map to at least one automated test.
- Define API contracts precisely: method, path, request body, response body, error codes. Same for DB columns.
- List the exact files to create/modify. A weaker model should be able to execute the checklist top-to-bottom.
- State non-goals explicitly — that's what prevents scope creep.
- Interface-level snippets (types, endpoint shapes, table columns) belong in specs; implementation code does not.
