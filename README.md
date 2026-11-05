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

The backend runs Prisma migrations during startup. Docker Compose persists
PostgreSQL data and backend uploads, logs, and marketing media in named
volumes.

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
