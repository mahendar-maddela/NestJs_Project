# Nexin Enterprise Backend — Setup & Run Guide

New to this project? This is everything you need to install it and get all services running
locally, either with Docker (recommended) or natively. For architecture/design background, see
[docs/](./docs/) and [CLAUDE.md](./CLAUDE.md).

## 1. What this project actually is

This is **one repository with 3 separate applications** (a "monorepo"), all built with NestJS,
sharing the same database and code libraries:

| App | What it does | Default port |
| --- | --- | --- |
| `apps/api` | The REST API — everything your frontend/mobile app calls | `8080` |
| `apps/ocpp-gateway` | Holds the live WebSocket connection to every charger (OCPP protocol) | `8000` |
| `apps/scheduler` | Cron/scheduled jobs (nightly cleanups, AMC expiry, settlements, etc.) | none — no HTTP server |

You'll normally run `apps/api` and `apps/ocpp-gateway` while developing anything user/frontend
or charger facing. `scheduler` matters once you're touching cron jobs.

> **Note:** an `apps/workers` app (BullMQ queue processing) is referenced in `CLAUDE.md`'s target
> architecture and was scaffolded early on, but it no longer exists in this codebase — its
> responsibilities were folded into `apps/scheduler`'s interval-based `QrSweepService` instead.
> `bullmq` is still a dependency and `libs/queue` still exists, but neither is actually wired up
> (no `@Processor`/`BullModule` anywhere) — if you're picking up BullMQ-based background jobs,
> that's a real gap against CLAUDE.md's stated rules, not a already-solved problem.

## 2. Quickstart with Docker (recommended)

The fastest way to get all three services running with matching Redis, without hitting Windows'
lack of a native Redis build or host/container network mismatches:

```powershell
# 1. Make sure .env exists (see §5 below) and DATABASE_URL is reachable from a container —
#    on Docker Desktop, if your MySQL runs on this same machine, that means using
#    host.docker.internal instead of localhost:
#      DATABASE_URL="mysql://root:@host.docker.internal:3306/slns_db"

# 2. Build and start api + ocpp-gateway + scheduler + redis
docker compose up --build

# Don't have MySQL installed at all? Add the optional bundled MySQL container:
docker compose --profile with-db up --build
# (first run only, that container starts EMPTY — see docker-compose.yml's mysql
# service comment for how to import a schema dump into it)
```

All three app containers build from one shared image (see [Dockerfile](./Dockerfile)) and differ
only by their `command:` — one image to build/version/push, not three. `docker compose up -d`
runs everything in the background; `docker compose logs -f api` tails a single service.

This is the setup that matches production most closely (see §10). The rest of this document
covers running natively without Docker, which is still fully supported and often faster for
tight edit/reload loops.

## 3. Prerequisites — install these first

| Tool | Version | Check with |
| --- | --- | --- |
| Node.js | 20+ (24 recommended — this machine already has `v24.15.0`) | `node -v` |
| npm | comes with Node | `npm -v` |
| MySQL | 8.x | `mysql --version` |
| Redis | any recent 6.x/7.x | `redis-cli ping` → should reply `PONG` |

Windows notes:
- MySQL: install **MySQL Community Server** (or use XAMPP/WAMP if you already have one).
- Redis has no official native Windows build. Easiest options:
  - **Memurai** (Windows-native, Redis-compatible, has a free dev edition) — simplest.
  - Or run Redis inside **WSL2** (`sudo apt install redis-server`).
  - Or run it via Docker (`docker run -d -p 6379:6379 redis`) if you have Docker Desktop.

## 4. Install dependencies

From the project root:

```powershell
npm install
```

This installs dependencies for all 3 apps at once (it's a single `package.json` for the whole
monorepo — see `nest-cli.json`, which lists all 3 as projects).

## 5. Configure environment variables

A `.env` file already exists in this repo with working local values (MySQL on `localhost:3306`,
Redis on `localhost:6379`). If you need to recreate it from scratch, copy the template and fill
it in:

```powershell
Copy-Item .env.example .env
```

Variable groups, and whether you need real values to boot the app at all:

| Group | Variables | Required to boot? |
| --- | --- | --- |
| Server | `PORT`, `NODE_ENV` | Yes |
| Database | `DATABASE_URL` | **Yes** — app won't start without a reachable MySQL DB |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Recommended — see note below on the fallback |
| JWT | `JWT_SECRET_KEY`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Yes, for any login to work |
| OCPP gateway | `OCPP_PORT`, `OCPP_GATEWAY_INTERNAL_URL`, `INTERNAL_COMMAND_SECRET` | Yes, if running `ocpp-gateway` or dispatching charger commands from `api` |
| Email | `EMAIL_HOST`, `MAIL_USER`, `MAIL_PASSKEY`, `AWS_SES_FROM_EMAIL` | Only if you need real emails to send — without it, emails just log to the console (dev mode) |
| SMS/WhatsApp OTP | `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN` | Only if you need real SMS/WhatsApp OTPs — otherwise falls back to console logging |
| Payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Only for payment flows |
| AWS S3/Storage | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET_NAME`, `CLOUDFRONT_DOMAIN` | Only for file upload flows |
| OCPI | `OCPI_SERVER`, `CURR_OCPI_VERSION`, `OCPI_SESSION_CURRENCY`, `EMSP_MAX_AMOUNT` | Only for roaming (OCPI) flows |

**Note on Redis:** if Redis is down, the API and OCPP-gateway still boot and charging keeps
working — RemoteStart/RemoteStop/Reset automatically fall back to a direct HTTP call between the
two apps (see [docs/architecture.md](./docs/architecture.md)). But most other features (caching,
sessions, queues) do need Redis, so keep it running for normal development.

## 6. Set up the database

This project connects to a **MySQL database that already has its tables** — it does not
auto-create the schema (`synchronize` is intentionally off, per project rules; no destructive
schema commands are allowed to run automatically). Two situations:

- **This machine already has the DB set up** (likely, if `.env` was already here when you started)
  — nothing to do, just make sure your local MySQL server is running and the `slns_db` database
  (or whatever `DATABASE_URL` points to) exists and has data in it.
- **Starting completely fresh** — you'll need a copy of the database (a `.sql` dump) from a
  teammate or the legacy project's existing database, since there's no migration file that builds
  the schema from nothing yet. Import it with:

```powershell
mysql -u root -p your_db_name < path\to\dump.sql
```

Once the database exists and is reachable, you can seed baseline reference data (super admin
account, permissions, roles, amenities, etc.) with:

```powershell
npm run seed
```

## 7. Run the apps

Each app runs as its own process, in its own terminal window. Open 2–3 terminals depending on
what you're working on:

```powershell
# REST API — most work happens here
npm run start:dev

# OCPP gateway — needed for anything charger/WebSocket related
npm run start:gateway

# Scheduler — needed for cron jobs (nightly cleanup, AMC expiry, etc.)
npm run start:scheduler
```

All three use `--watch`, so they auto-restart on file changes.

You'll know `apps/api` started correctly when you see:

```
🚀 NEXIN ENTERPRISE BACKEND SERVER STARTED SUCCESSFULLY
🌐 REST API Server URL : http://localhost:8080
📚 Swagger Docs URL   : http://localhost:8080/docs
🗄️  Database Status     : CONNECTED (MySQL)
```

Open `http://localhost:8080/docs` in a browser for interactive Swagger API docs.

`apps/ocpp-gateway` prints `🔌 Multi-Version OCPP Gateway running on port 8000` when ready —
chargers connect to `ws://localhost:8000/<version>/ocpp/<chargerId>`.

## 8. Other useful commands

```powershell
npm run build          # compiles apps/api only (nest build's default root project)
npm run build:all      # compiles all 3 apps — api, ocpp-gateway, scheduler
npm run type-check     # tsc --noEmit, no build output
npm run lint           # eslint --fix across the whole monorepo
```

> `nest build` with no app name only builds the monorepo's "root" project (`apps/api`, per
> `nest-cli.json`) — it silently does **not** build `ocpp-gateway` or `scheduler`. Use
> `npm run build:all` (or `nest build <app>` per app) when you need all three, which is what the
> [Dockerfile](./Dockerfile) does.

## 9. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| App exits immediately with a MySQL connection error | MySQL isn't running, or `DATABASE_URL` in `.env` is wrong |
| App boots but Redis-dependent features silently fail | Redis isn't running — check `redis-cli ping` |
| `Entity metadata for X was not found` on boot | A new entity/relation was added without being picked up — see `database/src/database.module.ts` |
| Port already in use (`EADDRINUSE`) | Another process is already using `8080` or `8000` — stop it, or change `PORT`/`OCPP_PORT` in `.env` |
| OTP/email/SMS just prints to the console instead of sending | Expected in dev if `MAIL_USER`/`MSG91_AUTH_KEY`/etc. aren't set — see the env table above |
| `npm run start:prod` / a Docker container exits with `Cannot find module '.../main'` | You're on a build predating the `dist/apps/<app>/apps/<app>/src/main.js` path fix — pull latest, or re-run `npm run build:all` |
| Docker container can't reach MySQL (`ECONNREFUSED`/`ETIMEDOUT` on boot) | `DATABASE_URL` in `.env` says `localhost` — containers can't reach the host that way. Use `host.docker.internal`, or run `docker compose --profile with-db up` for the bundled MySQL (see §2 and §10) |
| `docker compose up` fails building `bcrypt` or times out downloading Chromium | Rare — usually a flaky network mid-`npm ci`. Re-run `docker compose build --no-cache api` |

## 10. Production deployment

The [Dockerfile](./Dockerfile) and [docker-compose.yml](./docker-compose.yml) at the repo root
are written to be the same artifact for local dev and production, per CLAUDE.md's stated
`Docker, PM2` deployment target — Compose (or a manual `docker run`) for anything
container-orchestrated, PM2 as the fallback for a plain VM with no container runtime.

### Building and shipping the image

```bash
# One image, all 3 apps baked in — see Dockerfile's multi-stage comment for why
docker build -t nexin-backend:<git-sha-or-version> .
docker push <your-registry>/nexin-backend:<git-sha-or-version>
```

Tag by git SHA or release version, not `latest` — you want to know exactly which commit is
running in each environment, and be able to roll back to a specific tag.

### Running it

Whatever orchestrator you use, run **the same image** as (at minimum) two separate
deployments/services with different commands, matching `docker-compose.yml`:

| Process | Command | Notes |
| --- | --- | --- |
| `api` | `node dist/apps/api/apps/api/src/main.js` | Stateless — scale horizontally behind a load balancer |
| `ocpp-gateway` | `node dist/apps/ocpp-gateway/apps/ocpp-gateway/src/main.js` | Holds long-lived WebSocket connections per charger — see the scaling note below before running >1 replica |
| `scheduler` | `node dist/apps/scheduler/apps/scheduler/src/main.js` | Cron jobs. Run exactly **one** replica — `@nestjs/schedule` has no built-in leader-election, so N replicas means every job fires N times |

**Scaling `ocpp-gateway` independently of `api`** (the reason CLAUDE.md calls this out
specifically): a charger's WebSocket stays pinned to whichever gateway instance accepted the
`upgrade` request. Running multiple `ocpp-gateway` replicas behind a plain round-robin load
balancer works for *new* connections, but anything that needs to reach a *specific already-connected*
charger (a remote-start command from `api`, for example) must be able to find which replica holds
that charger's socket — check `apps/ocpp-gateway/src/common/registry/connection.registry.ts` and
how `OCPP_GATEWAY_INTERNAL_URL` / Redis pub/sub bridge charger commands today before assuming
naive horizontal scaling of the gateway "just works" beyond a single instance.

### Required environment

Every variable in `.env.example` needs a real production value injected by your orchestrator's
secret/config mechanism (ECS task definition secrets, Kubernetes `Secret`/`ConfigMap`, etc.) — do
**not** bake `.env` into the image (the `.dockerignore` already excludes it) and do not commit
production secrets anywhere in this repo.

### Database migrations — deliberately a separate, manual step

This project never auto-runs schema changes on boot (`synchronize: false`, and CLAUDE.md
forbids destructive automatic schema commands). When a release includes new migrations, run them
as their own explicit step **before** rolling out the new image, not from a container's `command:`:

```bash
npm run typeorm:migration:run
```

### Health checks

`apps/api` exposes `GET /health` (already wired into `docker-compose.yml`'s `api` service and
usable as an ALB/ingress health check target). `ocpp-gateway` has no HTTP health route — the
Compose file falls back to a raw TCP connect check; use the same approach for a load balancer's
TCP health check if you don't want to add a proper HTTP route. `scheduler` has no server to probe
at all — rely on process supervision (container restart policy, or PM2's `autorestart`) plus
whatever job-level logging/alerting you have for silently-stopped cron runs.

### PM2 alternative (no container runtime)

```bash
npm run build:all
pm2 start dist/apps/api/apps/api/src/main.js --name nexin-api
pm2 start dist/apps/ocpp-gateway/apps/ocpp-gateway/src/main.js --name nexin-ocpp-gateway
pm2 start dist/apps/scheduler/apps/scheduler/src/main.js --name nexin-scheduler -i 1
pm2 save
```

Note the explicit `-i 1` on `scheduler` — PM2's cluster mode defaults to spawning multiple
instances, which would multiply every cron job exactly like the anti-pattern described above.

## 11. Where to go next

- [docs/README.md](./docs/README.md) — index of architecture/auth/scheduler docs
- [docs/legacy-parity-report.md](./docs/legacy-parity-report.md) — what's been migrated, verified, and what's still outstanding
- [CLAUDE.md](./CLAUDE.md) — the governing rules for how this codebase is built (read this before making changes)
