# Langdle

A wordle-like game for **languages**. Every day there is a target language, and
players guess it from its linguistic features: phonology, word order, writing
system and morphosyntax. Each guess reveals how the guessed language compares to
the target, so the feedback narrows the search the same way Wordle's colours do.

Langdle also hosts the language data itself: a public atlas of languages, per-language
edit permissions, and a change-request flow so players can suggest corrections.

## How the game works

- A new target language is chosen every day (a daily cron job picks it).
- Make a guess from the language list. Each feature of your guess is compared
  against the target and shown as a hint.
- Use the hints to narrow down the language, then guess again until you find it.
- Signed-in players keep their progress and profile; anyone can play as a guest.

## Tech stack

- **Web:** Next.js 16 (App Router), React 19, next-intl (English, Spanish, Portuguese),
  Tailwind CSS 4, Base UI primitives and the neobrutalism.dev design system.
- **API:** a real REST API built with [Hono](https://hono.dev), mounted inside
  Next.js at `src/app/api/[...route]/route.ts`. Server actions and the Flutter
  app both call the same endpoints.
- **Data:** PostgreSQL through Drizzle ORM (Neon serverless driver in production),
  Redis for session caching.
- **Auth:** JWT sessions, Google OAuth (via `arctic`), argon2 password hashing.
- **Email:** Resend, with React Email templates.
- **Mobile:** a Flutter app (iOS and Android) in `mobile/`.
- **Tests:** Vitest, with unit tests and API tests run against throwaway Postgres
  and Redis containers.

## Project layout

| Path | Contents |
| --- | --- |
| `src/core/` | Shared code: UI kit, database clients, helpers, global types |
| `src/modules/<name>/` | One feature each: `auth`, `user-profile`, `lang-data`, `lang-guess`, `meta` |
| `src/app/[locale]/` | Pages only; they compose module components and call module actions |
| `src/app/api/[...route]/route.ts` | The single API entry point |
| `src/i18n/` | next-intl routing and navigation helpers |
| `messages/` | `en`, `es` and `pt` translations, shared by web and mobile |
| `tests/` | Vitest tests, mirroring the module names |
| `mobile/` | The Flutter app |
| `.agents/` | Architecture, conventions, design system and mobile notes (read these before contributing) |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) (a current LTS release)
- [pnpm](https://pnpm.io) 11 (the version pinned in `package.json`; enable it with `corepack enable`)
- PostgreSQL and Redis, either installed locally or through Docker
- [Docker](https://www.docker.com) (required for the API tests)
- [Flutter](https://flutter.dev) (only if you work on the mobile app)

### Install

```bash
pnpm install
```

### Environment variables

Create a `.env` file in the project root with these variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_USER`, `REDIS_PASSWORD` | Redis connection |
| `NEXT_PUBLIC_BASE_URL` | Public URL of the app, e.g. `http://localhost:3000` |
| `JWT_SECRET` | Secret used to sign session tokens |
| `CRON_SECRET` | Secret that protects the cron job endpoints |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in credentials |
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email |

Environment variables are validated with Zod on startup, so the app reports any
missing or malformed value instead of failing later.

### Database

The schema lives in `src/core/database/relational/tables.ts`. Drizzle manages the
migrations in `drizzle/`:

```bash
npx drizzle-kit generate   # create a migration from schema changes
npx drizzle-kit migrate    # apply migrations to DATABASE_URL
npx drizzle-kit studio     # browse the database in the browser
```

## Commands

### Web app

```bash
pnpm dev            # start the dev server (next dev --turbo) at http://localhost:3000
pnpm build          # production build (also typechecks)
pnpm start          # serve the production build
pnpm format         # format and lint fixes (biome check --write src tests)
npx biome check --write src tests   # the same, run directly
npx tsc --noEmit    # typecheck only
```

### Tests

```bash
pnpm test           # every test: unit and API (API tests need Docker running)
pnpm test:unit      # pure logic only, no Docker needed
pnpm test:api       # REST API against throwaway Postgres and Redis containers
```

### Mobile app

Run these from `mobile/`:

```bash
flutter run                        # run against pnpm dev
adb reverse tcp:3000 tcp:3000      # Android only: let the emulator reach localhost:3000
flutter analyze && flutter test    # static analysis and tests
dart run tool/sync_shared.dart     # copy messages/ and public/flags into the app
```

## Deployment

The app is designed for Vercel. `vercel.json` defines two daily cron jobs:

- `/api/guess/jobs/daily`: picks the next target language.
- `/api/lang/jobs/cleanup-tokens`: removes expired tokens.

## Contributing

Before writing code, read the documents in `.agents/`:

- `ARCHITECTURAL_SPINE.md`: the stack, module rules and endpoint inventory
- `CONVENTIONS.md`: naming, error handling, i18n and forms
- `DESIGN_SYSTEM.md`: the neobrutalism.dev components and tokens
- `MOBILE.md`: what a web or API change owes the Flutter app

Run `pnpm format` and `pnpm test` before opening a pull request.
