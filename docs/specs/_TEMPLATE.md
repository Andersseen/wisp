# NNN — Title

- **Status:** draft <!-- draft | approved | in-progress | done | superseded (link successor) -->
- **Owner approval:** pending
- **Created:** YYYY-MM-DD · **Updated:** YYYY-MM-DD
- **Depends on:** (spec numbers or "—")

## Problem

What is broken or missing today, with file references. Why it matters now.

## Goals

Bullet list of outcomes this spec delivers. Keep it short.

## Non-goals

What this spec deliberately does NOT do (prevents scope creep — be explicit).

## User story

As a <role>, I <action>, so that <benefit>. One or two max.

## Design

### API contracts

For each endpoint: method + path, auth requirement, request body, success response, error responses (code + HTTP status). Use the `{ success: false, code, message }` error envelope.

### DB changes

Tables/columns added or altered, with types and constraints. Note that migrations are generated (`bun run db:generate`), never hand-written.

### Frontend changes

Routes, components, services, interceptors/guards affected. State shape (signals).

### Other (queues, engines, infra, config)

New env vars (add to `.env.example` + `config/index.ts`), queue names, compose changes.

## Acceptance criteria

Testable Given/When/Then statements. Each must map to at least one automated test.

1. **Given** … **when** … **then** …
2. …

## Implementation checklist

Ordered, smallest-green-slice first. Exact file paths. Tick as you go.

- [ ] step — `path/to/file.ts`
- [ ] tests — `path/to/test.ts`
- [ ] update `docs/STATE.md`

## Test plan

Which unit / integration / e2e tests cover which criteria.

## Risks & edge cases

What could go wrong; concurrency, security, migration on existing data.

## Out of scope / follow-ups

Ideas that came up but belong in a future spec.
