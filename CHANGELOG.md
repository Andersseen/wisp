# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Open source hardening kit: `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `SECURITY.md`, issue/PR templates, branch protection policy, Dependabot
  config, Husky hooks, lint-staged, and Commitlint.
- Professional project `README.md` with badges, architecture overview, and
  contributor guide.

### Changed

- Pinned CI Bun version to the repo's declared `packageManager` (`1.3.11`).
- Added `check-types` and commit-message validation to CI.

## [0.0.0] - 2026-07-07

### Added

- Initial monorepo skeleton: Turborepo + Bun workspaces.
- `apps/core` — Elysia API with health, auth, and deploy routes.
- `apps/dashboard` — Angular 21 zoneless SPA with Tailwind CSS 4 and Volt UI.
- `packages/db` — Drizzle ORM schema, client, and migration tooling.
- Dev infrastructure: Docker Compose (Valkey, Caddy, MinIO), Caddyfiles, and
  install scripts.
- CI workflow for lint, test, build, and Docker image builds.

[Unreleased]: https://github.com/Andersseen/wisp/compare/v0.0.0...HEAD
[0.0.0]: https://github.com/Andersseen/wisp/releases/tag/v0.0.0
