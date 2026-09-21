# CLAUDE.md

**One Job** removes the decision of what to work on next. Keep a
backlog of tasks with a priority and a time estimate; set how much
time is available and the minimum priority that matters right now,
and the app deals a single random matching task. Accept it and it
locks in as "the one job" until it's marked done or cancelled — no
browsing the backlog, no cherry-picking, no second-guessing. Every
design decision defends that: nothing in this codebase should let a
user see more than one candidate task at a time or browse a deck.

## Stack

- Vite + React + TypeScript + Mantine (frontend, `src/`)
- Fastify + better-sqlite3 (API + static serving, `server/`), single
  container serves both — no separate reverse proxy needed by the app
  itself
- SQLite at `$DATA_DIR/app.db` (default `/data`), mounted volume in prod

## One Job invariants

These hold everywhere in the codebase; a change that breaks one of
them is a bug, not a design choice to reopen casually.

- **At most one active task.** Enforced in the schema by
  `tasks_one_active`, a partial unique index on `status = 'active'`
  (`server/migrations/2026-09-20.1_init.sql`) — not just app-level
  logic. `acceptTask` in `server/repo/tasks.ts` is race-safe: a
  conditional `UPDATE … WHERE status = 'pending'` catches the target
  row already being non-pending, and a caught `SQLITE_CONSTRAINT_UNIQUE`
  catches the subtler case where the row itself is pending but a
  _different_ row is already active.
- **Minutes are the only estimate unit.** `estimate_minutes INTEGER`
  is the single source of truth in the database and the API.
  `shared/estimate.ts` is the only module that converts between
  minutes and a value+unit pair, or formats minutes for display —
  nowhere else does either conversion by hand.
- **Priority is a stored integer** (`1 = low, 2 = medium, 3 = high`).
  `shared/priority.ts` is the only module holding labels, colours and
  ordering — the label itself is never stored or hardcoded elsewhere.
- **Timestamps are epoch milliseconds, UTC**, as integers
  (`created_at`, `updated_at`, `completed_at`) — not SQLite
  `datetime('now')` text. The client formats and compares them.
- **All SQL lives in `server/repo/tasks.ts`.** No ORM, no query
  builder — raw `better-sqlite3` statements, one place. Routes
  (`server/routes/*.ts`) never touch the database directly.
- **camelCase at the API boundary, snake_case in the database.**
  `server/repo/tasks.ts`'s `rowToTask` is the one place that maps
  between them.
- **`shared/` stays Node-free.** It's bundled into the client, so no
  `better-sqlite3`, no `node:*`, nothing under `server/`. Enforced by
  ESLint's `no-restricted-imports` on `src/**` and `shared/**` — see
  the ESLint paragraph below — not just by convention.
- **Drawing is client-side.** The client fetches the filtered
  candidate pool once (`GET /api/tasks?status=pending&…`) and
  `shared/draw.ts`'s `pickCandidate` (pure, RNG injected) picks from
  it. The skip-set is session-only React state — never persisted, no
  `skipped_at` column. There is no `/draw` endpoint.
- **No authentication, ever.** Every `/api/*` route is open; access
  control is the deploying environment's job (forward-auth proxy,
  tailnet, etc.), not this app's. Don't read identity headers for
  authorization — there's no per-user data to gate.

## Commands

- `npm run dev` — Vite dev server (5173) + API (3001) with hot reload,
  Vite proxies `/api/*` to the API
- `npm run build` — build SPA (`dist/`) and server (`server/dist/`)
- `npm start` — run the built server (production entrypoint)
- `npm run migrate` — apply pending migrations standalone, without
  starting the server
- `npm run typecheck` — typecheck both frontend and server configs
- `npm run lint` / `npm run format` — ESLint / Prettier. TypeScript is
  pinned to `^6.0.3` (not the `^7` line) specifically because
  `typescript-eslint` hard-blocks TS 7 at runtime; ESLint covers
  `**/*.{ts,tsx}` across `src/`, `server/` and `shared/` via
  `typescript-eslint`, `eslint-plugin-react-hooks` (`src/` only) and
  `eslint-plugin-jsx-a11y` (`src/` only), plus a `no-restricted-imports`
  rule on `src/**` and `shared/**` banning `better-sqlite3`, `node:*`
  and anything under `server/`, enforcing that `shared/` and the client
  bundle stay Node-free. Revisit the TS 6 pin once
  https://github.com/typescript-eslint/typescript-eslint/issues/10940
  ships TS7 support.

## Conventions

- **Migrations**: date-prefixed `.sql` files in `server/migrations/`
  (`2026-09-20.1_init.sql`, `2026-09-21.1_...sql`), applied in
  date-then-counter order, tracked in a `_migrations` table alongside a
  checksum of each file — editing an already-applied migration fails
  loudly instead of silently no-opping. Forward-only — no
  down-migrations. Applied
  automatically on server startup (`runMigrations()` in
  `server/index.ts`), and can also be run standalone via `npm run
migrate`.
- **Shared code**: `shared/` holds types and pure logic used by both
  `src/` and `server/` — keep it isomorphic (no DOM, no Node APIs) so
  both tsconfigs can include it.
- **Mantine theme** lives in `src/theme.ts` — extend it, don't override
  component styles inline, so apps built from this template stay
  visually consistent without copy-pasting overrides everywhere.
- **API routes** live under `/api/*` in `server/routes/*.ts`
  (registered onto the `buildApp` factory in `server/app.ts`);
  everything else falls through to the built SPA's `index.html`
  (client-side routing friendly). A single `setErrorHandler` in
  `app.ts` gives every failure the same `{ error: { message, details } }`
  shape — routes don't hand-roll their own error responses.
- **Config**: `$CONFIG_DIR/.env` (default `/config/.env`) is loaded on
  startup via `dotenv`. Real environment variables (e.g.
  docker-compose `environment:`) always take precedence over the file
  — `dotenv` does not overwrite variables already set in `process.env`.
  Default config files ship in `config-defaults/` and are seeded into
  `$CONFIG_DIR` on first container start only; existing files there
  are never overwritten. `server/config.ts` is the only module (beyond
  `index.ts`'s own `CONFIG_DIR`/`PORT`) that reads `process.env` — see
  the dotenv-load-order note below before adding another one.
- **Never commit** `./data/` or `./config/` (gitignored) — local
  SQLite file and local config overrides.
- **`server/index.ts`'s dynamic imports are load-bearing, not
  cosmetic.** It calls `dotenv.config()` first, then reaches
  `migrate.ts`/`app.ts`/`db.ts` (and everything they import, including
  `config.ts`) through `await import(...)` rather than static
  `import` declarations. Static imports are hoisted above
  `dotenv.config()` regardless of where they're written in the file,
  so anything that reads `process.env` at module scope would see the
  environment _before_ the `.env` file loaded. The only invariant to
  preserve: `index.ts`'s own _static_ import list must never include a
  module that reads `process.env` at module scope, directly or
  transitively — route it through the dynamic imports instead. A
  regression test (`server/env-loading.test.ts`) spawns the real
  entrypoint as a child process and fails if this ever breaks.

## Docker / deploy

- Non-root runtime user (`app`, uid/gid 1000 by default); `PUID`/`PGID`
  env vars remap it to match the host at container start, so files
  written into mounted volumes have explicit, predictable ownership on
  Linux hosts. This remap requires starting the container as root —
  it's the right default for homelab bind mounts, but it's incompatible
  with rootless Docker or Kubernetes `runAsNonRoot`. The entrypoint
  detects a non-root start and skips the remap rather than failing, but
  PUID/PGID simply won't apply in that case.
- `better-sqlite3` is a native addon, but ships prebuilt bindings for
  Alpine/musl — the runtime stage runs a smoke test after install
  (`node -e "new require('better-sqlite3')(...)"`) so a build that
  can't load the binding fails at image-build time, not on the first
  request. No compiler toolchain is installed in either stage; if a
  future dependency bump ever needs one, that smoke test is the signal.
- The runtime stage does a fresh `npm ci --omit=dev` rather than
  copying `node_modules` across stages, so dev dependencies never end
  up in the shipped image.
- `HEALTHCHECK` hits `/api/health`, which also does a cheap `SELECT 1`
  against SQLite — so a wedged/locked db file fails the check too, not
  just process liveness.
- **No authentication by default.** Every route is open. Gating access
  (reverse-proxy auth, VPN/tailnet, forward-auth middleware, etc.) is
  the deploying environment's responsibility, not this app's. Don't
  assume any endpoint is protected.
- **No reverse proxy baked in.** The container just publishes its
  port (`3000` by default); whatever sits in front of it (Traefik or
  otherwise) is a deployment-time decision, not a template concern.
- Images publish to `ghcr.io/<owner>/<repo>` on every push to `main`
  (see `.github/workflows/publish.yml`), private by default.
- **Backups are the deployment's responsibility**, not this template's
  — `$DATA_DIR` is just a mounted volume; whatever backs up that host
  path is out of scope here. Because SQLite runs in WAL mode, back it
  up with `sqlite3 app.db ".backup ..."` or `VACUUM INTO`, not a raw
  `cp` of `app.db` while the container is running — a plain copy can
  miss the `-wal`/`-shm` files and land on a torn state.
