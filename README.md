# Chromatic

**A full-spectrum habit tracker built with Next.js, Prisma and TypeScript.**

Chromatic turns routines into multi-step habits, schedules them across a calendar,
protects them with real focus timers, and shows the result as streaks, heatmaps
and honest analytics. It is a full-stack app with accounts, cross-device sync,
offline support and an installable PWA.

The repository is named **Habit-Tracker**; the product inside it is **Chromatic**.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Demo account](#demo-account)
- [Environment variables](#environment-variables)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Available scripts](#available-scripts)
- [Database setup](#database-setup)
- [Deployment](#deployment)
- [API overview](#api-overview)
- [Security and privacy](#security-and-privacy)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Habits with real structure

- Multi-step habits: each step can be **required** or **optional**.
- A habit is only complete when every required step is checked and any timer
  requirement is met.
- Optional steps are extra credit and do not block completion.
- Pause or archive a habit without losing its history.
- Edit a habit for the future, or move a single occurrence without changing the
  series.
- Add notes to individual occurrences.

### Flexible schedules

- One-off habits.
- Daily habits with an "every N days" interval.
- Weekdays (Monday–Friday) with an "every N weeks" interval.
- Weekly habits on any combination of weekdays.
- Monthly habits on chosen month days (clamped to the last day of shorter months).
- Yearly habits on the start date.
- Start and end dates for every habit.
- Extra manual occurrences can be added from the calendar.

### Focus timers that cannot be skipped

- A habit can require a timer of up to 1440 minutes (0 means no timer).
- Timers are timestamped and enforced on the server.
- Refreshing the page, closing the tab or changing the clock does not skip the
  timer.
- Pause, resume, stop or complete a timer.
- Expired timers are settled automatically the next time data is loaded.
- Timer time is recorded against the occurrence and feeds analytics.

### Calendar and tasks

- Month, week, day and list calendar views.
- See habits and one-off tasks side by side.
- Choose whether the week starts on Sunday or Monday.
- Set a default calendar view.
- Create, edit, complete and delete one-off tasks.
- Schedule an extra habit occurrence on any date.

### Analytics and insights

- Completion rate, current streak, longest streak, perfect days and focus time.
- Daily, weekly and monthly trends.
- Planned-versus-completed comparison.
- GitHub-style heatmap with clickable days.
- Per-habit and per-category performance.
- Date ranges from 7 days to 1 year (up to 400 days).
- Unscheduled days never count as misses.

### Reminders

- Per-habit reminder time in 24-hour format.
- Optional lead time: at the reminder time, or 5/10/15/30/60 minutes before.
- In-app reminder toasts.
- Optional browser notifications.
- Quiet hours, including windows that cross midnight.
- Reminder delivery is recorded so multiple tabs or devices do not double-notify.

### Offline-first PWA

- Installable on desktop, Android and iOS, with an install button in the app
  shell, the auth screen and the marketing page.
- Chromium browsers get the native install prompt; iOS Safari and other
  browsers get clear "Add to Home Screen" steps instead.
- App shell, icons and the offline page are cached.
- The latest overview snapshot is cached locally.
- Step check-ins and task toggles are queued in IndexedDB when offline.
- Queued changes replay automatically when the connection returns.
- Optimistic UI keeps the app responsive.
- Cross-device refresh happens when the window gains focus and every 45 seconds
  while visible.

### Accounts and data ownership

- Email/password registration and sign-in.
- Bcrypt password hashing.
- Each signed-in browser gets its own revocable session.
- Password reset with single-use, one-hour tokens.
- Change name, email and password from settings.
- Export every account-owned record as JSON.
- Permanently delete the account and all related data.
- All database queries are scoped to the signed-in user.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript, Tailwind CSS 4, Lucide icons |
| Database | SQLite (local default) or PostgreSQL (production) |
| ORM | Prisma 6 |
| Auth | Custom session auth, `bcryptjs`, httpOnly cookies |
| Validation | Zod 4 |
| Email | Resend (optional) |
| PWA | Service worker, Web App Manifest, IndexedDB queue |

---

## Requirements

- **Node.js 20.9 or newer** (required by Next.js 16).
- **npm** (the repository includes `package-lock.json`).
- A modern browser for the PWA features.
- A PostgreSQL database only if you want to use PostgreSQL instead of SQLite.
- A Resend API key only if you want real password-reset emails.

---

## Quick start

### 1. Clone the repository

```bash
git clone <repository-url>
cd Habit-Tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the environment file

```bash
cp .env.example .env
```

On Windows:

```powershell
copy .env.example .env
```

The example defaults to a local SQLite database, so no database server is
required.

> **Note:** Next.js and the Prisma CLI both read `.env`. If you prefer to use
> `.env.local` for Next.js, also keep a `.env` file for Prisma, or copy the same
> values into both.

### 4. Generate the Prisma client and create the database

```bash
npm run db:generate
npm run db:push
```

`db:generate` generates the Prisma client. `db:push` creates the SQLite schema
in `prisma/dev.db`.

### 5. Optional: load the demo data

```bash
npm run db:seed
```

This creates a demo account with realistic history. Skip this step if you want
to start with an empty account.

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo account

After running `npm run db:seed`, sign in with:

| Field | Value |
| --- | --- |
| Email | `demo@chromatic.app` |
| Password | `demo1234` |

The seed creates five categories, seven habits, roughly three months of
occurrences and a handful of one-off tasks.

Running `npm run db:seed` again is safe: it deletes and recreates only the demo
account.

---

## Environment variables

Copy `.env.example` to `.env` and adjust the values you need.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_PROVIDER` | No | `sqlite` | `sqlite` or `postgresql`. `scripts/db-provider.mjs` rewrites the Prisma datasource to match. |
| `DATABASE_URL` | Yes | `file:./dev.db` | Database connection string. SQLite paths are relative to `prisma/schema.prisma`. |
| `NEXT_PUBLIC_APP_URL` | Recommended | `http://localhost:3000` | Public app URL used for password-reset links and metadata. Set this to your HTTPS deployment URL in production. |
| `RESEND_API_KEY` | No | empty | Enables real password-reset emails through Resend. |
| `EMAIL_FROM` | No | `Chromatic <onboarding@resend.dev>` | Sender address for reset emails. |

### Password reset in development

If `RESEND_API_KEY` is not set:

- The reset link is printed to the server log.
- In development, the link is also returned to the browser so the flow can be
  tested without an email provider.

In production, configure `RESEND_API_KEY` and `EMAIL_FROM` to deliver real email.

---

## How it works

### The data model in one picture

```text
Habit (schedule, steps, optional timer)
  └── Occurrence (one per scheduled day)
        ├── StepCompletion (one per checked step)
        └── TimerSession (focus time recorded for that occurrence)
```

A **habit** is a reusable template. An **occurrence** is one scheduled instance
of that habit on a particular date. Tasks are separate one-off items and are not
part of the recurrence engine.

### Core concepts

| Concept | What it means |
| --- | --- |
| **Habit** | A routine with a name, colour, schedule, steps and optional timer. |
| **Habit step** | One checkable action inside a habit. Steps can be required or optional. |
| **Occurrence** | One scheduled day for a habit. It has a `scheduledDate` that never moves and an effective `date` that can be rescheduled. |
| **Step completion** | A record that a specific step was checked on a specific occurrence. |
| **Timer session** | Server-timestamped focus time attached to an occurrence. |
| **Task** | A one-off calendar item, separate from recurring habits. |
| **Category** | An optional colour-coded grouping for habits and tasks. |
| **Session** | A signed-in device. Each browser gets its own session. |
| **Reminder log** | A record of a delivered reminder, used to prevent duplicates. |

### Scheduling and occurrence generation

The recurrence engine lives in `src/lib/recurrence.ts`. A single pure function,
`habitOccursOn`, answers "is this habit scheduled on this day?" for the
dashboard, calendar, analytics and reminders, so those screens cannot disagree.

Occurrences are generated lazily:

- When a range is loaded, missing occurrences for that range are created.
- The unique constraint on `(habitId, scheduledDate)` prevents duplicates.
- Future occurrences are generated up to 400 days ahead.
- Changing a schedule removes stale **pending** future occurrences but keeps all
  completed, partial and skipped history.
- A scheduled occurrence can be skipped, which is the durable "remove this day"
  action without breaking the series.
- Manual occurrences can be added to any date without changing the habit's
  normal rhythm.

### Completion rules

Completion is enforced on the server in `src/lib/habits.ts`, not only in the UI.

An occurrence becomes **completed** when:

1. Every **required** step is checked. If a habit has no required steps, every
   active step must be checked.
2. The habit's timer requirement is satisfied, if it has one.

Statuses are:

| Status | Meaning |
| --- | --- |
| `pending` | Nothing has been done yet. |
| `partial` | Some steps or some timer time have been recorded. |
| `completed` | All requirements are satisfied. |
| `skipped` | Deliberately skipped for that day. |

Unchecking a step re-opens a completed occurrence. The explicit complete
endpoint re-checks the requirements and rejects premature completion.

### Dates and timezones

- Calendar days are stored as plain `YYYY-MM-DD` strings, not timestamps.
- The user's IANA timezone decides what "today" means.
- Date arithmetic is anchored to UTC so it does not drift across daylight-saving
  changes.
- Streaks only walk over days on which the habit was actually scheduled.
- Reminder times and quiet hours are interpreted in the user's timezone.

### Offline behaviour

- The service worker registers in every environment. In development it loads
  with `?dev=1`, which makes the app installable but deliberately skips all
  caching. Offline mode is therefore active only in production builds
  (`npm run build` and `npm start`).
- Successful page navigations and static assets are cached.
- API requests always go to the network.
- The latest overview snapshot is stored in `localStorage`.
- Step check-ins and task toggles are stored in an IndexedDB queue when the
  network fails.
- The queue is flushed when the browser comes back online.
- The UI updates optimistically and reconciles with the server response.

### Reminders

- Reminders are polled every 60 seconds while Chromatic is open.
- The server checks the habit's schedule, reminder time, lead time and quiet
  hours.
- In-app toasts are shown when enabled.
- Browser notifications are shown only if the user granted permission.
- There is no server-side background push scheduler in this repository. If the
  app is completely closed, reminders do not fire until it is opened again.

### Authentication and sessions

- Passwords are hashed with bcrypt; plain-text passwords are never stored.
- A successful sign-in creates a random 32-byte token.
- The raw token is placed in an httpOnly cookie; only its SHA-256 hash is stored
  in the database.
- Sessions last 30 days.
- Each device has its own session and can be revoked individually.
- Changing the password signs out every other device but keeps the current one.
- Password-reset tokens are single-use and expire after one hour.

---

## Project structure

```text
prisma/
  schema.prisma            Database schema
  dev.db                   Local SQLite database (created by db:push)

public/
  sw.js                    Service worker (installability, offline, notifications)
  icons/                   Generated PWA icons

scripts/
  db-provider.mjs          Switches Prisma between SQLite and PostgreSQL
  seed.mjs                 Creates the demo account and history
  generate-icons.mjs       Draws the PWA icons from scratch

src/app/
  (auth)/                  Login, register, forgot/reset password pages
  (app)/                   Dashboard, habits, calendar, analytics, settings
  api/                     Route handlers for all JSON endpoints
  manifest.ts              Web App Manifest
  offline/                 Offline fallback page

src/components/
  analytics/               Analytics screen
  auth/                    Auth forms
  calendar/                Calendar and task forms
  charts/                  Trend chart, bar chart, heatmap
  dashboard/               Dashboard screen
  habits/                  Habit list, habit form, occurrence card, timer
  layout/                  App shell and navigation
  providers/               App-wide client state and offline queue
  pwa/                     Service worker registration, install button/prompt, reminders
  settings/                Account, appearance, schedule, notifications, security
  ui/                      Reusable UI primitives

src/lib/
  auth.ts                  Sessions, password hashing, reset tokens
  dates.ts                 Date-key helpers and timezone conversion
  recurrence.ts            Pure schedule engine
  habits.ts                Occurrence generation and completion rules
  habit-service.ts         Create, update and remove habits
  stats.ts                 Analytics calculations
  overview.ts              Single payload for the app shell
  pwa.ts                   Install prompt capture and platform helpers
  client/api.ts            Browser API client and IndexedDB mutation queue
  validation.ts            Zod schemas shared by forms and API routes
```

---

## Available scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the Next.js development server. |
| `npm run build` | Creates a production build. |
| `npm start` | Starts the production server after a build. |
| `npm run lint` | Runs ESLint. |
| `npm run typecheck` | Runs TypeScript with `--noEmit`. |
| `npm run db:provider` | Rewrites the Prisma datasource provider only. |
| `npm run db:generate` | Rewrites the provider and runs `prisma generate`. |
| `npm run db:push` | Rewrites the provider and pushes the schema to the database. |
| `npm run db:seed` | Creates or refreshes the demo account. |
| `npm run db:studio` | Opens Prisma Studio. |
| `npm run icons` | Regenerates the PWA icons in `public/icons/`. |

---

## Database setup

### SQLite (default, local development)

The default configuration uses a single file:

```env
DATABASE_PROVIDER=sqlite
DATABASE_URL="file:./dev.db"
```

SQLite paths are resolved relative to `prisma/schema.prisma`, so `file:./dev.db`
creates `prisma/dev.db`.

Useful commands:

```bash
npm run db:push       # create or update tables
npm run db:seed       # optional demo data
npm run db:studio     # inspect data in Prisma Studio
```

To start over, stop the dev server, delete `prisma/dev.db`, and run
`npm run db:push` again. **This deletes all local data.**

### PostgreSQL (production or local server)

1. Create a PostgreSQL database.
2. Set the environment variables:

```env
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public&sslmode=require"
```

3. Set `DATABASE_PROVIDER` in your shell for the provider-switching commands.
   `scripts/db-provider.mjs` reads `process.env` directly; Prisma itself loads
   `DATABASE_URL` from `.env`.

macOS / Linux:

```bash
export DATABASE_PROVIDER=postgresql
npm run db:generate
npm run db:push
```

Windows PowerShell:

```powershell
$env:DATABASE_PROVIDER = "postgresql"
npm run db:generate
npm run db:push
```

To switch back to SQLite:

```bash
export DATABASE_PROVIDER=sqlite
npm run db:generate
npm run db:push
```

> This repository does not include Prisma migration files. It uses
> `prisma db push`. For a long-lived production database, consider adopting
> Prisma Migrate so schema changes are versioned and reviewable.

---

## Deployment

Chromatic can run on Vercel or any host that supports a Node.js server.

### Recommended production setup

1. Provision a managed PostgreSQL database (Neon, Supabase, RDS, etc.).
2. Set these environment variables in your host:
   - `DATABASE_PROVIDER=postgresql`
   - `DATABASE_URL=...`
   - `NEXT_PUBLIC_APP_URL=https://your-domain.example`
   - `RESEND_API_KEY=...` and `EMAIL_FROM=...` if you want reset emails.
3. Generate the Prisma client during the build:

```bash
npm run db:generate
npm run build
```

The repository includes a `vercel.json` that already sets this as the build
command (`npm run db:generate && npm run build`). If you configure the build
command in the Vercel dashboard instead, use the same value.

4. Apply the schema to the production database once, or as a release step:

```bash
npm run db:push
```

Run this with the production `DATABASE_URL` and `DATABASE_PROVIDER` set.

5. Start the app with `npm start` (or let your host run the Next.js server).

### Vercel checklist

If Vercel fails with `Couldn't find any 'pages' or 'app' directory`, it is
building the wrong directory or a repository that does not contain `src/`.

1. **Root Directory** — leave it blank (or `.`). `package.json` and `src/app`
   are at the repository root; do not point Vercel at `src` or `src/app`.
2. **Framework Preset** — `Next.js`.
3. **Build Command** — `npm run db:generate && npm run build` (already set by
   `vercel.json`).
4. **Environment variables** — set these in *Project → Settings →
   Environment Variables*, never by committing `.env`:
   - `DATABASE_PROVIDER=postgresql`
   - `DATABASE_URL`
   - `NEXT_PUBLIC_APP_URL=https://your-domain.example`
   - `RESEND_API_KEY`, `EMAIL_FROM` (optional, for reset emails)
5. Confirm the connected GitHub repository and branch actually contain the
   `src/app` directory before redeploying.

> **Never commit `.env`, `.env.local` or `prisma/dev.db`.** They are ignored by
> `.gitignore` for a reason: they contain live database credentials and user
> data. If they have ever been pushed to a public repository, rotate the
> database password and any API keys immediately.

### Production notes

- Use PostgreSQL rather than SQLite on serverless or multi-instance hosts.
- The service worker requires HTTPS in production (browsers treat `localhost`
  as secure). Development registers a cache-free worker so the install prompt
  still works locally.
- `NEXT_PUBLIC_APP_URL` must be the public HTTPS URL for password-reset links.
- The in-memory rate limiter works per server process. For a multi-instance
  deployment, replace it with a shared store such as Redis.
- There is no server-side push scheduler. Browser notifications work while the
  app is open and polling.

---

## API overview

All API routes return the same JSON envelope:

```json
{ "ok": true, "data": { } }
```

```json
{ "ok": false, "error": "Human-readable message." }
```

Most routes require a valid session cookie. Mutating routes also reject
cross-origin requests.

| Resource | Endpoints |
| --- | --- |
| Overview | `GET /api/overview` |
| Habits | `GET /api/habits`, `POST /api/habits`, `PATCH /api/habits/:id`, `DELETE /api/habits/:id` |
| Steps | `POST /api/steps` |
| Completion | `POST /api/complete` |
| Occurrences | `POST /api/occurrences`, `PATCH /api/occurrences/:id`, `DELETE /api/occurrences/:id` |
| Timers | `GET /api/timers`, `POST /api/timers`, `PATCH /api/timers/:id`, `DELETE /api/timers/:id` |
| Tasks | `GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id` |
| Categories | `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id` |
| Calendar | `GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| Analytics | `GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD&habitId=&categoryId=` |
| Reminders | `GET /api/reminders/due` |
| Settings | `GET /api/settings`, `PATCH /api/settings` |
| Export | `GET /api/export` |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id`, `DELETE /api/auth/account` |

Calendar and analytics ranges are limited to 400 days.

---

## Security and privacy

- Passwords are stored as bcrypt hashes, never as plain text.
- Session tokens are stored as SHA-256 hashes in the database.
- Session cookies are `httpOnly`, `sameSite=lax`, and `secure` in production.
- Every user-owned query is scoped by `userId`.
- Cross-origin state-changing requests are rejected.
- Login and registration are rate-limited per IP.
- Password reset tokens are single-use and expire after one hour.
- Deleting an account cascades to habits, occurrences, steps, timers, tasks,
  categories, sessions and reset tokens.
- The export endpoint returns every account-owned record as JSON.
- Signing out clears cached account snapshots, the offline mutation queue and
  the service-worker cache.

---

## Known limitations

- Reminders only poll while Chromatic is open; there is no background push
  service.
- The rate limiter is in-memory and therefore per process.
- There are no Prisma migration files; the project uses `db push`.
- There is no automated test suite in this repository.
- Offline mutation queuing currently covers step check-ins and task toggles.
- The development service worker never caches, so offline mode is not active
  during `npm run dev`. Run a production build to test offline behaviour.

---

## Troubleshooting

### `@prisma/client` did not initialize

Run:

```bash
npm run db:generate
```

Then restart the dev server.

### Prisma provider mismatch

If the schema and `DATABASE_URL` disagree, set `DATABASE_PROVIDER` in the shell
and run:

```bash
npm run db:generate
npm run db:push
```

### `npm run db:push` still uses SQLite

`scripts/db-provider.mjs` reads `DATABASE_PROVIDER` from the process environment,
not from `.env`. Export it in your shell before running the command.

### SQLite database is locked

Close Prisma Studio, other dev servers and any process holding `prisma/dev.db`,
then try again.

### PWA install or offline mode is not working in development

Installability works in `npm run dev`: the app registers a service worker with
`?dev=1`, which satisfies the browser's install criteria but never caches
anything. That means the install button and native install prompt work locally,
while offline caching does not.

To test real offline behaviour, use a production build:

```bash
npm run build
npm start
```

Use HTTPS in production; `localhost` is treated as secure by browsers.

If the browser never offers a native install prompt, use the **Install app**
button in the sidebar, mobile header, auth screen or landing page. It shows the
manual "Add to Home Screen" steps for browsers without a prompt (notably iOS
Safari and Firefox). On iOS, installation only works from Safari.

### Password-reset email is not arriving

If `RESEND_API_KEY` is not configured, check the server log for the reset link.
In development, the link is also shown in the browser. If Resend is configured,
check the API key, sender address and spam folder.

### Browser notifications do not appear

- Allow notifications for the site in your browser settings.
- Make sure browser notifications are enabled in Chromatic settings.
- Some browsers require the installed PWA or a service worker for notifications.

### Demo account already exists

`npm run db:seed` deletes and recreates the demo account, so it is safe to run
again. It does not touch other accounts.

### Type errors or lint failures

```bash
npm run typecheck
npm run lint
```

---

## Contributing

1. Fork the repository and create a feature branch.
2. Make the change in the existing style.
3. Run `npm run lint`, `npm run typecheck` and `npm run build` before opening a
   pull request.
4. Describe the behaviour change and any database impact in the pull request.

---

## License

No license file is included in this repository. Add a license before distributing
or reusing the code publicly.
