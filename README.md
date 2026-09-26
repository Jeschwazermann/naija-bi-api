# Naija BI API

CSV upload → async processing → MongoDB → analytics, built for Nigerian SMEs
uploading sales data from POS systems, Excel, or WhatsApp Business exports.

## Architecture

```
Business client
      │  POST /auth/register or /auth/login
      ▼
Auth API ── hashes/verifies password (bcrypt) ── issues JWT { businessId }
      │
      │  every other request carries that JWT as "Authorization: Bearer <token>"
      ▼
      │  POST /uploads (multipart CSV)
      ▼
Upload API ── stores raw file (local disk or S3) ── writes `uploads` record
      │  enqueues job
      ▼
Job queue (BullMQ / Redis) ── retries with backoff, dead-letter on repeated failure
      │
      ▼
Worker ── streams + parses CSV ── normalizes ₦ amounts (kobo) and dates (dd/mm/yyyy)
      │        ── validates each row independently, collects rejects with reasons
      ▼
MongoDB
  ├─ sales_raw          (every valid row, for drill-down / re-aggregation)
  └─ sales_aggregates   (pre-rolled-up daily totals, what dashboards read)
      ▲
      │  reads
Analytics API ── /analytics/summary, /analytics/trend, /analytics/top-products
```

## Project layout

```
libraries/
  logger/            pino wrapper behind a Logger interface
  error-handling/    AppError + centralized Express error middleware
  mongo-client/      singleton connection, collection getters, shared POJO types
  queue-client/      BullMQ queue/connection factory, shared job types

services/
  auth-api/          business registration/login/refresh/logout, issues the JWTs everyone else verifies
  upload-api/        receives CSV uploads, stores file, enqueues job
  worker/            parses, validates, normalizes, aggregates, writes to Mongo
  analytics-api/      read-only endpoints over the aggregated collection
```

The frontend lives separately in `../client`.

`auth-api` and `upload-api`/`analytics-api` are decoupled on purpose: they
never call each other. They just have to agree on `JWT_SECRET` — auth-api
signs tokens with it, the others verify with it. That's the whole contract.

Each service follows the same three-tier layering:
`entry-points` (HTTP/queue adapters, thin) → `domain` (use-cases, validators,
business rules) → `data-access` (Mongo/queue/storage — the only layer that
knows about the database or filesystem).

## Running locally

```bash
# From the server/ directory:
# 1. infra
docker compose up -d          # Mongo on :27017, Redis on :6379

# 2. install deps (repo uses pnpm workspaces — no Turborepo, not needed at this scale)
pnpm install

# 3. env
cp .env.example .env          # defaults already match docker-compose

# 4. run each service in its own terminal
pnpm run dev:auth-api           # :4100
pnpm run dev:upload-api         # :4000
pnpm run dev:worker
pnpm run dev:analytics-api      # :4200

# 5. install and run the dashboard in another terminal
cd ../client
pnpm install
pnpm run dev
```

## Production containers

`docker-compose.prod.yml` runs the four backend services only. MongoDB and
Redis are managed services; Compose expects their authenticated URLs and does
not create database containers. Store deployment values in a protected
environment file or inject them with the hosting platform's secret manager.
The APIs bind to loopback host ports by default for local portfolio use:
auth-api on 3002, upload-api on 3000, and analytics-api on 3001.

```bash
# From this server/ directory, after setting production environment values
docker compose --env-file .env -f docker-compose.prod.yml up --build -d
docker compose --env-file .env -f docker-compose.prod.yml ps
```

Compose starts one replica per API and one worker so each API can use a stable
host port. The CPU/memory limits are starter budgets, not measured capacity
targets. Increase worker replicas or `WORKER_CONCURRENCY` for sustained queue
growth after checking MongoDB and Redis headroom. Scale API replicas behind an
external load balancer with deployment-specific port routing. The worker and
APIs have `/health` checks; API checks verify MongoDB, and upload and worker
checks also verify Redis. Monitor health state and resource usage.

The dashboard is a static Vite build and is not part of Compose. Build it from
`client/`, setting the public API base URLs at build time, then deploy the
contents of `client/dist` to a static host or CDN:

```bash
cd ../client
VITE_AUTH_API=https://auth.example.com \
VITE_UPLOAD_API=https://uploads.example.com \
VITE_ANALYTICS_API=https://analytics.example.com \
pnpm build
```

For local testing, use `http://localhost:3002`, `http://localhost:3000`, and
`http://localhost:3001` as those three URLs. Set `CORS_ORIGIN` in the backend
environment to the dashboard's exact browser origin. For a remote deployment,
set `API_BIND_ADDRESS=0.0.0.0`, restrict access with the host firewall, and
terminate HTTPS at an external load balancer or hosting platform.

Open http://localhost:5174, register a business, drop
`samples/sample-sales.csv` onto the upload zone, and watch it move from
queued → processing → completed as the worker picks it up.

## Backend component tests

The backend tests start the APIs and worker in-process, make real HTTP requests
over ephemeral localhost ports, and use real MongoDB and Redis. Jest starts the
dedicated test services from `server/docker-compose.test.yml` when ports 27018
and 6380 are free; if both are already listening, it reuses them. Local runs
leave services running for faster repeat runs. CI tears down services it
started, including their test data.

```bash
cd server
pnpm test
```

This builds the backend first, then runs the component suite. Tests use an
isolated MongoDB database and local file storage, block outbound HTTP with
Nock, and use real registration-issued JWTs. They never load `server/.env`.

## Trying it out from the command line

```bash
# register — response includes an access token (short-lived) and a
# refresh token (long-lived), no separate login needed
curl -X POST http://localhost:3002/auth/register \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Ada Stores","email":"ada@example.com","password":"correcthorsebattery"}'
# → { "accessToken": "...", "refreshToken": "...", "businessId": "...", "businessName": "Ada Stores" }

# or, once registered, log in the same way any time
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"correcthorsebattery"}'

# use the accessToken as <token> below — it expires in 15 minutes by default
curl -X POST http://localhost:3000/uploads \
  -H "Authorization: Bearer <token>" \
  -F "file=@samples/sample-sales.csv"
# → { "uploadId": "...", "status": "queued" }

curl http://localhost:3000/uploads/<uploadId> \
  -H "Authorization: Bearer <token>"
# → status flips queued → processing → completed/failed_partial,
#   with rowsProcessed / rowsRejected once the worker picks it up

curl "http://localhost:3001/analytics/summary?from=2026-09-01&to=2026-09-30" \
  -H "Authorization: Bearer <token>"

# once the access token expires, trade the refresh token for a new pair —
# the old refresh token is revoked in the same call (rotation)
curl -X POST http://localhost:3002/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'

# and to log out — revokes that refresh token so it can't be used again
curl -X POST http://localhost:3002/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

`samples/sample-sales.csv` includes one deliberately bad row (missing
quantity, non-numeric amount) to show partial-failure handling — the upload
finishes as `failed_partial` with that row listed in `rejectedRows`.

## Design notes / things worth knowing

- **Money is stored as integer kobo**, never floats — avoids rounding drift
  on financial totals.
- **Dates assume Nigerian dd/mm/yyyy** by default, not US mm/dd/yyyy, with
  ISO (`yyyy-mm-dd`) also accepted.
- **A bad row never fails the whole upload** — each row is validated
  independently; rejects are collected with a reason and the good rows still
  get processed.
- **Uploads are idempotent by job ID** (`jobId: uploadId` in BullMQ) — a
  retry from the client won't double-enqueue.
- **Aggregates are pre-computed per day** in `sales_aggregates` so dashboard
  reads stay fast regardless of how many raw rows a business accumulates;
  only the dates touched by a given file are recomputed, not the whole
  history.
- **No Turborepo** — pnpm workspaces are enough at 4 services + 4 small
  shared libraries; add it later only if the monorepo grows a lot or CI
  build time becomes a real pain point.
- **Passwords are hashed with bcrypt**, never stored or logged in plain
  text; login returns the same `invalid-credentials` error whether the
  email doesn't exist or the password is wrong, so the endpoint can't be
  used to enumerate registered emails.
- **`/auth/login` is rate-limited** (10 attempts / 15 min / IP) — the one
  endpoint in the system worth protecting against brute force.
- **auth-api never calls upload-api/analytics-api and vice versa** — they're
  connected only by trusting the same `JWT_SECRET`, so auth-api can be
  redeployed, scaled, or replaced independently.
- **Access tokens are short-lived JWTs (15m default), refresh tokens are
  long-lived opaque strings (30d default)**, stored server-side only as a
  SHA-256 hash. A refresh rotates: using one immediately revokes it and
  issues a fresh pair, so a stolen-and-replayed refresh token is
  detectable (the real owner's next refresh will fail) and a compromised
  one can be killed by deleting its row.
- **The dashboard is a Vite + React + TypeScript SPA** — plain `fetch`
  through a typed `apiFetch` wrapper (`src/api/client.ts`), no data-fetching
  library. It transparently retries a request once through `/auth/refresh`
  if the access token has expired (`SessionProvider` listens for a
  `session-expired` event and drops back to the login screen), and each
  panel (upload, stats, chart, top products) is its own component reading
  from a small set of hooks (`useSession`, `useDashboardData`).

## Not included (intentionally, to keep this a scaffold not a product)

- Dashboard component tests
- Password reset, "log out everywhere", email verification
- Production Dockerfiles / k8s manifests / CI pipeline
- `CORS_ORIGIN=*` on every API is fine for local dev only — lock it to
  `http://localhost:5174` (or the dashboard's real deployed origin) before
  deploying anywhere shared
