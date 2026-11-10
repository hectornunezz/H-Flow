# H-FLOW

H-FLOW is a B2B platform for fitness coaches. It combines an Express and
Prisma API, a Next.js trainer dashboard, PostgreSQL, athlete portals,
AI-assisted planning, and Remotion-powered marketing videos.

## Requirements

- Node.js 20 or newer and npm
- Docker Compose for the quickest full-stack setup, or PostgreSQL for local
  development

## Run the full stack with Docker

From the repository root, copy the example environment file and set strong,
URL-safe values for the database password and JWT secret:

```powershell
Copy-Item .env.example .env
```

Then start PostgreSQL, the API, and the frontend:

```sh
docker compose up --build
```

- Frontend: <http://localhost:3001>
- API: <http://localhost:3000>
- API documentation: <http://localhost:3000/api-docs>

Docker Compose runs Prisma migrations before starting the API and persists
PostgreSQL data and backend uploads, logs, marketing media, and private workout
videos in named volumes. Workout videos are served through authenticated API
routes and are not exposed as public static files. The frontend calls the API through its same-origin `/api` proxy;
the browser does not need to resolve the backend container hostname.

The root `app/` Next.js application is separate from `hflow-frontend/` and uses
Supabase directly for sign-in and athlete portal sessions. Configure
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, and `GROQ_API_KEY` in the root environment before
running it. Keep `.env.local` private; never expose or commit the service-role
key. `NEXT_PUBLIC_API_URL` is for `hflow-frontend/`, where `/api` is proxied to
the backend on port `3000`. Do not point it at `http://localhost:3001` because
that is the frontend itself, not the API.

Local smoke test (PowerShell, from the repository root):

1. `Copy-Item .env.example .env`
2. Edit `.env`; replace the example database password and JWT secret.
3. `docker compose up --build -d`
4. `docker compose ps; Invoke-WebRequest http://localhost:3000/; Invoke-WebRequest http://localhost:3001/login`

## Run locally

Start PostgreSQL, then create and configure the backend environment file:

```powershell
Copy-Item hflow-backend\.env.example hflow-backend\.env
```

Set `DATABASE_URL` to your PostgreSQL instance and configure a strong
`JWT_SECRET`. Optional integrations such as OpenAI, ElevenLabs, Stripe, SMTP,
and Instagram can be configured as needed. Set `MARKETING_MEDIA_PUBLIC_URL` to
an HTTPS address reachable by Instagram to publish Reels.
Marketing audio uses the configured ElevenLabs voice and multilingual model.
Set `ELEVENLABS_VOICE_ID` and `ELEVENLABS_API_KEY`; the example environment
files include defaults for Spanish, MP3 quality, and natural voice settings.
ElevenLabs character timestamps drive the Remotion captions directly, avoiding
a separate transcription step and keeping subtitles on the generated audio.
For strict manual one-video generation, run `npm run marketing:manual` from an
interactive terminal. `bot.js` requires typing `GENERAR`, prints the exact
script character count, and enforces a persistent local budget initialized at
38,000 characters. The local ledger covers only calls made by this script;
reconcile it manually if the ElevenLabs balance changes elsewhere.
Set `WORKOUT_VIDEO_STORAGE_DIR` to persistent storage for report videos; the
default is `storage/workout-videos`.

Configure the frontend API URL:

```powershell
Copy-Item hflow-frontend\.env.example hflow-frontend\.env.local
```

Install both applications, generate Prisma Client, and build them:

```sh
npm run install:all
npm run build:all
```

Apply database migrations and start both production servers:

```sh
npm --prefix hflow-backend run prisma:migrate:deploy
npm run start:all
```

The API listens on port `3000`; the frontend standalone server listens on
port `3001`.

### Development servers

After installing dependencies and configuring the environment:

```sh
npm --prefix hflow-backend run dev
npm --prefix hflow-frontend run dev
```

Run each command in its own terminal. For schema changes during development,
use `npm --prefix hflow-backend run prisma:migrate`.

## Tests and checks

From the repository root:

```sh
npm --prefix hflow-backend test
npm --prefix hflow-frontend test
npm --prefix hflow-backend run typecheck
npm --prefix hflow-backend run build
npm --prefix hflow-frontend run typecheck
npm --prefix hflow-frontend run lint
npm --prefix hflow-frontend run build
```

The frontend test command runs its API-client test; the backend test command
runs the API regression suite. CI runs backend and frontend install, Prisma
generation, tests, lint, and production builds on every push.

## Root scripts

| Command | Purpose |
| --- | --- |
| `npm run install:all` | Install backend and frontend dependencies |
| `npm run build:all` | Generate Prisma Client and build both applications |
| `npm run start:all` | Start the API and frontend together |
| `npm run build:backend` | Generate Prisma Client and build the API |
| `npm run build:frontend` | Build the frontend |

## Remotion

Marketing episodes render MP4 videos with the `DopaminergicVideo` Remotion
composition. The backend copies generated audio to the Remotion public assets
directory while rendering; finished videos are streamed through the
authenticated marketing API. See [`src/remotion/README.md`](./src/remotion/README.md)
for manual rendering instructions.

## Kubernetes

The manifests in [`k8s/`](./k8s/) deploy PostgreSQL inside the `hflow`
namespace as a single-replica StatefulSet behind a private ClusterIP Service.
The backend and migration Job use the same `DATABASE_URL` from
`hflow-secrets`; its hostname must match the `hflow-postgres` Service. The
database PVC must use a persistent storage class. Data in an existing SQLite
`dev.db` must be backed up and migrated separately before switching environments.

The frontend image must be built with `NEXT_PUBLIC_API_URL=/api` and
`BACKEND_INTERNAL_URL=http://hflow-backend:3000`. Next.js then proxies API,
upload, and marketing-media requests through the same origin. Kubernetes
`ClusterIP` addresses are private and must never be embedded as browser-facing
API URLs. The Next.js rewrite destination is serialized at image-build time;
the frontend Deployment ConfigMap must match the service URL used for the
image build. The backend's persistent storage mount includes private workout
videos under `storage/workout-videos`; keep a persistent volume attached when
deploying so uploaded series remain available across restarts.

The backend writes structured JSON logs to stdout and the existing log files.
`/healthz` is the liveness check, `/health/ready` checks PostgreSQL readiness,
and `/metrics` exposes Prometheus process and HTTP request metrics. The backend
pod includes Prometheus scrape annotations for port `3000`.

Before deploying, replace `your-org` and the example frontend hostname,
configure a persistent storage class, and create an ignored local copy of the
secret template. Set the same URL-safe PostgreSQL password in `POSTGRES_PASSWORD`
and `DATABASE_URL`, and replace `JWT_SECRET` with a strong random secret:

```powershell
Copy-Item k8s\secret.example.yaml k8s\secret.yaml
```

Build and push the immutable image tag referenced by the manifests:

```sh
docker build -f hflow-backend/Dockerfile -t ghcr.io/your-org/hflow-backend:0.1.0 .
docker build -f hflow-frontend/Dockerfile --build-arg NEXT_PUBLIC_API_URL=/api --build-arg BACKEND_INTERNAL_URL=http://hflow-backend:3000 -t ghcr.io/your-org/hflow-frontend:0.1.0 .
docker push ghcr.io/your-org/hflow-backend:0.1.0
docker push ghcr.io/your-org/hflow-frontend:0.1.0
```

Apply the namespace, configuration, secret, and persistent volumes; run the
one-off migration Job to completion before deploying the application:

```sh
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/storage.yaml
kubectl apply -f k8s/postgres.yaml
kubectl rollout status statefulset/hflow-postgres -n hflow --timeout=5m
kubectl delete job hflow-migrate -n hflow --ignore-not-found
kubectl apply -f k8s/migration-job.yaml
kubectl wait --for=condition=complete job/hflow-migrate -n hflow --timeout=10m
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

The frontend is exposed through NodePort `30001`; put a TLS-enabled ingress or
load balancer in front of it for production. The backend remains ClusterIP.
The backend is intentionally a single replica because its marketing and
reminder schedulers run in-process; scale it only after those jobs use a
distributed queue or leader election.
