# Contributing to Wisp

Thank you for considering a contribution! This document describes how to get
started, the conventions we follow, and how to propose changes.

## Quick links

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./SECURITY.md)
- [Development docs](./docs/)
- [Architecture overview](./docs/ARCHITECTURE.md)
- [Conventions](./docs/CONVENTIONS.md)

## Prerequisites

- [Bun](https://bun.sh) >= 1.0.0 (repo pins `1.3.11` via `packageManager`)
- Docker + Docker Compose
- Node.js >= 20 (for Angular CLI tooling)
- Git >= 2.38

## Setup

```bash
# 1. Clone your fork
git clone https://github.com/<your-username>/wisp.git
cd wisp

# 2. Install dependencies
bun install

# 3. Prepare local environment
cp .env.example .env
# Edit .env and set SESSION_SECRET to a random 32+ char string, e.g.:
# openssl rand -hex 32

# 4. Start dev infrastructure
# Valkey :6379, Caddy :80/:443, MinIO :9000/:9001
docker compose -f infra/docker/dev.yml up -d

# 5. Generate and apply the database schema
bun run db:generate
bun run db:migrate

# Optional: seed a demo user (demo@wisp.sh / demo1234)
bun run db:seed
```

## Development workflow

```bash
# Start backend + frontend in watch mode
bun run dev

# Run gates individually
bun run lint
bun run check-types
bun run test
bun run test:e2e
```

## Branch policy

- `main` is protected. **Do not push directly to `main`.**
- All changes must come through a pull request from a feature or fix branch.
- Pull requests require at least **one approving review** before merge.
- Status checks (`lint`, `test`, `build`, `check-types`) must pass.

> Only the repository owner (`Andersseen`) can bypass these rules via admin
> privileges. This is intentional and keeps the project history safe.

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <short summary>

<body>

<footer>
```

Common types:

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `style:` — formatting, no code change
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `test:` — adding or correcting tests
- `chore:` — tooling, dependencies, config

Examples:

```text
feat(auth): add session validation plugin
fix(deploy): return 401 for unauthenticated create request
docs(readme): update quick start instructions
```

Husky hooks run `commitlint` on the message and `lint-staged` before each
commit.

## Proposing changes

1. Check the [roadmap](./docs/PLAN.md) and existing
   [specs](./docs/specs/) before opening a new feature issue.
2. For non-trivial work, open an issue first or comment on an existing one to
   avoid duplicate effort.
3. Create a branch from the latest `main`:
   `git checkout -b feat/<short-description>` or `fix/<short-description>`.
4. Make focused, small commits.
5. Add or update tests for the behavior you changed.
6. Update `docs/STATE.md` if the change affects what works, known bugs, or next
   priorities.
7. Fill out the pull request template completely.

## Pull request checklist

Before requesting a review, make sure:

- [ ] `bun run lint` passes
- [ ] `bun run check-types` passes
- [ ] `bun run test` passes (add/update tests for your change)
- [ ] E2E tests updated for UI changes (`bun run test:e2e`)
- [ ] `docs/STATE.md` updated with a changelog entry
- [ ] The related spec status/checkboxes updated in `docs/specs/`
- [ ] Commit messages follow Conventional Commits

## Style and conventions

- TypeScript strict, no `any`.
- Single quotes, no semicolons, 2-space indent, ~100-col lines (matching
  Biome config).
- Backend: typed errors from `apps/core/src/types/error.ts`, pino logging,
  service classes with constructor-injected dependencies.
- Frontend: Angular zoneless, standalone components, `inject()`, `signal()`
  state, reactive forms, `@if/@for` control flow.
- See [docs/CONVENTIONS.md](./docs/CONVENTIONS.md) for the full guide.

## Questions?

Open a [GitHub Discussion](https://github.com/Andersseen/wisp/discussions) or
reach out via email at <andriipap01@gmail.com>.
