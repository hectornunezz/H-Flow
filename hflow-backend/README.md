# H-Flow backend

## Docker deployment

The root `docker-compose.yml` runs the API, Next.js frontend, and PostgreSQL.
Copy the root `.env.example` to `.env`, set a URL-safe strong
`POSTGRES_PASSWORD` and a `JWT_SECRET` of at least 32 bytes, then run
`docker compose up --build`. The backend applies PostgreSQL migrations before
starting. Configure `MARKETING_MEDIA_PUBLIC_URL` as a public HTTPS URL before
enabling automatic Instagram Reel publishing.

The PostgreSQL migration is a fresh-install baseline; it does not import data
from an existing SQLite development database.

## Athlete portal

Trainers can create a seven-day athlete portal link with
`POST /api/athlete-portal/access` and an authenticated JSON body containing
`athleteId`. The returned URL is based on `FRONTEND_URL`. Portal tokens are
scoped to the athlete portal, expire after seven days, and cannot be used with
other bearer-authenticated API routes. The portal exposes the athlete's latest
workout and nutrition plans, their PDFs, and check-in creation.

## Logging and API errors

Winston writes JSON logs to `logs/error.log` (errors only) and
`logs/combined.log` (all levels), and to the console. Morgan records HTTP
requests through Winston. Set `LOG_LEVEL` to change the application logging
threshold.

Unhandled API errors are logged and returned as `{ code, message }`; a `stack`
field is included only when `NODE_ENV=development`.

## API security middleware

The API uses Helmet's default security headers and a global rate limit of 100
requests per IP every 15 minutes. CORS allows `http://localhost:3000` and the
exact origins listed in `FRONTEND_ORIGINS`, a comma-separated environment
variable (for example, `https://app.example.com,https://www.example.com`).
Configure the real frontend origins in production; invalid URLs and origins
containing paths cause the backend to fail at startup rather than silently
opening access. Requests without an `Origin` header are not browser CORS
requests and remain available for server-to-server clients.

## Request DTO validation

Athlete create/update/metrics and trainer registration/login request bodies are
validated with strict Zod schemas before reaching their controllers. Unknown
fields, invalid types, overlong values, invalid email addresses, and invalid
password lengths are rejected with HTTP 400 and a list of field-level errors.

## Stripe subscriptions

Configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRO_PRICE_ID`
with values from Stripe. Set `STRIPE_SUCCESS_URL` and `STRIPE_CANCEL_URL` to
frontend URLs (the example values target local development).
`STRIPE_PRO_PRICE_ID` must identify an active monthly recurring Stripe Price.

New trainer registration creates a Stripe customer. `POST /api/payments/checkout`
requires trainer Bearer authentication and creates a monthly subscription Checkout
session for the configured Pro price. Configure Stripe to send
`checkout.session.completed`, `customer.subscription.updated`, and
`customer.subscription.deleted` events to `POST /api/payments/webhook`; webhook
signatures are verified against the raw request body. Subscription identifiers,
status, price, and current period end are stored on the trainer record.

## Email delivery

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and `SMTP_FROM` for your SMTP
provider. `SMTP_USER` and `SMTP_PASSWORD` are optional but must be configured
together when authentication is required. Set `PASSWORD_RESET_URL` to the
frontend's password-reset page. Trainer registration sends a welcome email;
delivery failures are logged and do not roll back account creation.

## Daily workout reminders

The backend runs a reminder job every day at 08:00 in the server's local
timezone. Trainers can add an optional email to an athlete and create a workout
plan with `scheduledAt` to receive reminders. The job groups plans by athlete
and sends one motivational email listing that day's plans; athletes without an
email are skipped. Existing athletes and plans without these optional fields
remain valid.

## Athlete avatars

`PUT /api/athletes/:id/avatar` accepts one multipart image in the `avatar`
field. Only JPEG/PNG files up to 5 MB are accepted; the server checks the
content signature as well as the declared MIME type. The authenticated trainer
must own the athlete (or be configured as an administrator). The image is stored
under `uploads/`, served from `/uploads/`, and its URL is saved in `avatarUrl`.
Replacing an avatar removes the old locally stored file.

## Athlete API

All `/api/athletes` routes require a valid Bearer token. Athlete detail, update,
and delete operations are restricted to the authenticated trainer; administrators
may access athletes across trainers.

`GET /api/athletes` returns the authenticated trainer's athletes. Administrators
configured through `ADMIN_TRAINER_IDS` may search across all trainers. The route
supports `search` (name, email, or objective), `page` (default `1`), and
`pageSize` (default `20`, maximum `100`). The response includes pagination
metadata. `POST /api/athletes` assigns the authenticated trainer automatically;
an administrator may optionally provide a target `trainerId`.

Available athlete routes:

- `GET /api/athletes` — list athletes with search and pagination
- `GET /api/athletes/:id` — get an athlete
- `PUT /api/athletes/:id` — update `name`, `objective`, `currentWeight`, and/or `isActive`
- `DELETE /api/athletes/:id` — delete an athlete

## Trainer profile API

Both profile routes require a valid Bearer token and operate on the authenticated
trainer's profile:

- `GET /api/profile` — get the trainer's profile (404 if it has not been created)
- `PUT /api/profile` — create or replace the profile with `specialty` (non-empty
  string), `experienceYears` (non-negative integer), and `bio` (non-empty string)

## Workout plan API

Workout plan detail, update, and delete routes accept a valid Bearer token for
either a trainer (`trainerId` claim) or an athlete (`athleteId` claim). A trainer
can access plans they created; an athlete can access plans assigned to them.
Athletes may update a plan's title or description but cannot reassign it.

- `GET /api/workouts/:id` — get a plan the authenticated user can access
- `PUT /api/workouts/:id` — update an accessible plan
- `DELETE /api/workouts/:id` — delete an accessible plan

The existing `PATCH /api/workouts/:planId` route remains available for backwards
compatibility.
