# One Job

Decision-free task triage. Keep a backlog of tasks with a priority and a
time estimate; when you have a spare window, set how much time you have
and the minimum priority you care about, and One Job deals you a single
random matching task. Accept it and it locks in as "the one job" until
you mark it done or cancel it — no browsing, no cherry-picking, no
deciding.

See `CLAUDE.md` for the stack, conventions and the invariants the app
is built around.

## Local development

```
npm install
npm run dev
```

Vite serves the frontend on http://localhost:5173 and proxies `/api/*`
to the Fastify API on port 3001. The SQLite db is created at
`./data/app.db` locally (set `DATA_DIR` to override).

## Production build

```
npm run build
npm start
```

Serves the built SPA and API together on port 3000 (`PORT` to
override).

## Docker

```
docker compose up --build
```

Builds the image, creates `./data/app.db` and seeds `./config/.env` on
first start, and serves the app on `http://localhost:3000`. Data in
`./data` and `./config` persists across `docker compose down` and
`docker compose up`.

### Environment variables

| Variable     | Default   | Purpose                                            |
| ------------ | --------- | -------------------------------------------------- |
| `DATA_DIR`   | `/data`   | Where `app.db` (and its `-wal`/`-shm` files) live. |
| `CONFIG_DIR` | `/config` | Where `.env` is loaded from on startup.            |
| `PORT`       | `3000`    | Port the server listens on.                        |
| `LOG_LEVEL`  | `info`    | Fastify/pino log level.                            |

`PUID`/`PGID` (default `1000`/`1000`) remap the container's runtime
user to match the host, so files written into the mounted volumes have
predictable ownership on Linux hosts — see `CLAUDE.md` for the caveats
around rootless Docker.

**No authentication is built in, by design.** Every `/api/*` route is
open. This app is meant to sit behind a forward-auth reverse proxy
(Authelia, Traefik forward-auth, a tailnet, etc.) — gating access is
the deploying environment's responsibility, not this app's.
