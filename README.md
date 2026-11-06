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
PostgreSQL data and backend uploads, logs, and marketing media in named
volumes. The frontend calls the API through its same-origin `/api` proxy;
the browser does not need to resolve the backend container hostname.

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

The manifests in [`k8s/`](./k8s/) target a managed PostgreSQL database. The
Prisma schema and checked-in migration history use PostgreSQL; data in an
existing SQLite `dev.db` must be backed up and migrated separately before
switching environments.

The frontend image must be built with `NEXT_PUBLIC_API_URL=/api` and
`BACKEND_INTERNAL_URL=http://hflow-backend:3000`. Next.js then proxies API,
upload, and marketing-media requests through the same origin. Kubernetes
`ClusterIP` addresses are private and must never be embedded as browser-facing
API URLs.

Before deploying, replace `your-org` and the example hostname in the manifests,
configure a managed PostgreSQL instance and storage class, and set
`DB_HOST`, `DB_NAME`, and `DB_USER` in `k8s/configmap.yaml`. Create an ignored
local copy of the secret template and enter real credentials there:

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
