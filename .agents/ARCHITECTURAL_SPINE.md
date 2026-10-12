# Architectural spine

## 1. High level

### Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript (strict), path alias `@/*` → `src/*` |
| REST API | hono 4, mounted inside the App Router via `hono/vercel` |
| Relational DB | Neon Postgres through Drizzle ORM (`drizzle-kit` migrations in `drizzle/`) |
| Key-value DB | Redis (`redis` client) with RedisJSON + RediSearch — holds the languages (`lang:<id>`) and the daily language (`daylang`) |
| Validation | zod 3 (+ `drizzle-zod`, `@hookform/resolvers`) |
| Auth | Own session implementation: argon2 password hashes, opaque session tokens hashed with SHA-256, `arctic` for Google OAuth, `jose` for short-lived encrypted tokens |
| Client data | TanStack Query for client fetching, server components otherwise |
| Forms | react-hook-form + zod resolver |
| UI | Tailwind v4, Radix primitives, `class-variance-authority`, framer-motion, sonner toasts |
| i18n | next-intl, locale prefix in the route (`/[locale]/…`), proxy in `src/proxy.ts` |
| Tooling | Biome (format + lint), Vitest, pnpm, deployed on Vercel (crons in `vercel.json`) |

### Runtime shape

```
browser / flutter app
        │
        ├─ pages  (src/app/[locale]/…)            server components
        │     └─ actions  ('use server')  ──┐
        │                                    │  HTTP (same origin)
        └────────────────────────────────────┼──▶ REST API  src/app/api/[...route]
                                             │        │
                                      hono middleware │ controllers (one per module)
                                                      ▼
                                                  services ──▶ Postgres / Redis
```

Both clients go through the same endpoints. Server actions are a thin browser
convenience on top of the API, never a second implementation of it.

## 2. Low level: the module

`src/core/` and every folder in `src/modules/` follow the same anatomy. All
parts are optional — a module only has what it needs — but nothing else may be
added at the module root without a reason recorded here.

### Folders

- **`components/`** — React components owned by the module. A component used by
  another module or by a page of another feature does not belong here: it moves
  to `src/core/components/`.
- **`schemas/`** — zod schemas, one file per subject (`signup.ts`,
  `change-request.ts`). Schemas export values only; the inferred types live in
  `types.ts`.
- **`hooks/`** — custom hooks. **The only place hooks may be defined**, context
  based ones included: a context, its provider and its `use…` hook live together
  in one file here (see `modules/auth/hooks/use-auth.tsx`).

### Files

- **`controller.ts`** — the module's hono router: HTTP concerns only (routing,
  auth middleware, body/query parsing, status codes, response shape). It is
  mounted under its own prefix in `src/app/api/[...route]/route.ts` and holds no
  business logic of its own. Sub-routers (e.g. language permissions) may live in
  the same file and be mounted with `router.route('/prefix', subRouter)`.
- **`service.ts`** — the real work: database and Redis access, token crypto,
  computations. Knows nothing about HTTP, cookies, React or `next/*`. Called by
  controllers, and by other modules' services when it is the owner of that data.
- **`actions.ts`** — Next.js server actions (`'use server'`). Each action maps to
  an endpoint through `apiRequest` and adds only what the API cannot do:
  cookies, `revalidatePath`, request-scoped translations. Calling a service
  directly from an action is allowed only for genuinely Next-specific things
  that have no HTTP equivalent — today that is `auth()` in
  `modules/auth/actions.ts`, which validates the session cookie once per request
  under React `cache`.
- **`types.ts`** — **every type of the module**. No `export type` /
  `export interface` anywhere else (the one tolerated exception is a non
  exported prop type used by a single component in its own file). It also holds
  the `as const` lists the union types are derived from, such as the error key
  lists in `modules/auth/types.ts`.
- **`middleware.ts`** — only when a module owns a hono middleware other modules
  need; `modules/auth/middleware.ts` exports `authMiddleware` and
  `adminMiddleware`. Dependency-free guards live in `core/middleware/`.

### Dependency rules

1. `core` never imports from `modules/` or `app/`.
2. A module may import from `core` and from another module. Prefer importing
   that module's `service.ts` (server side) or `components/` (UI).
3. `app/` imports from modules and core, never the reverse.
4. Controllers and services must stay free of `next/headers`, `next/cache` and
   `next-intl/server`: they also run for the mobile client, where there is no
   Next request context. Anything request-bound belongs in `actions.ts`.
5. Data access goes through the owning module's service. `lang-guess` reads
   languages via `lang-data`'s service, it does not touch `lang:*` keys itself.

### What `core` holds

```
core/
  components/  icons/  main/ (app shell: header, sidebar, providers)  ui/ (design system)
  database/    redis/ (client + key getters)   relational/ (drizzle client + tables)
  lib/         action.ts     actionSuccess / actionError
               api-client.ts apiRequest: the one place actions talk to the API
               http.ts       apiError / notFound / forbidden / unknownError / parseJsonBody
               session.ts    session cookie read / write / clear
               features.ts   the catalogue of linguistic features
               countries.ts  fonts.ts  utils.ts (cn, random, dates, getErrorMessage)
  middleware/  cron.ts       guards the Vercel cron endpoints
  schemas/     lang.ts       langDataSchema, the shape of a language
  types.ts     language domain, ActionResult, API error/request contracts
```

## 3. The modules

| Module | Owns | Prefix |
| --- | --- | --- |
| `auth` | users, password hashing, sessions, Google OAuth, hono auth guards | `/api/auth` |
| `user-profile` | the profile a signed-in user edits: native and fluent languages | `/api/user` |
| `lang-data` | the language catalogue, feature editing, edit permissions, change requests | `/api/lang` |
| `lang-guess` | the game: daily language, guess matching, game history | `/api/guess` |

## 4. Endpoint inventory

`B` = `Authorization: Bearer <sessionToken>`, `A` = administrator,
`C` = cron secret.

### `/api/auth`

| Method | Path | Guard | Purpose |
| --- | --- | --- | --- |
| POST | `/signup` | — | creates the user, answers `{ user, token, expiresAt }` |
| POST | `/signin` | — | same payload for existing credentials |
| POST | `/signout` | B | invalidates the session |
| GET | `/me` | B | the current user |
| GET | `/google` | — | redirects to Google, stores state cookies |
| GET | `/google/callback` | — | signs the user in, or redirects to `/endgoogle?data=<encrypted claims>` |
| POST | `/google/signup` | — | finishes a Google signup from `{ dataToken, nickname, country }` |

### `/api/lang`

| Method | Path | Guard | Purpose |
| --- | --- | --- | --- |
| GET | `/` | — | all languages; `?oactive=1` for playable ones, repeated `?id=` to fetch a set |
| GET | `/random` | — | a random active language |
| GET | `/:id` | — | one language |
| PUT | `/:id` | B + owner/A | replaces the language data |
| PUT | `/:id/status?active=` | B + A | activates/deactivates a language |
| GET | `/permissions/:userId` | — | language ids a user may edit |
| POST | `/permissions/tokens/:lang` | B + A | mints a share token for that language |
| PUT | `/permissions/claim/:token` | B | claims the permission the token carries |
| POST | `/change-requests` | B | suggests a feature change |
| GET | `/jobs/cleanup-tokens` | C | deletes expired permission tokens |

### `/api/guess`

| Method | Path | Guard | Purpose |
| --- | --- | --- | --- |
| GET | `/daily` | — | the language of the day |
| GET | `/:id?target=` | — | `{ guessed }` when right, the feature matching otherwise; `target` defaults to the daily language |
| GET | `/history` | B | the user's games |
| PUT | `/history` | B | stores a finished game |
| GET | `/jobs/daily` | C | rolls the language of the day |

### `/api/user`

| Method | Path | Guard | Purpose |
| --- | --- | --- | --- |
| GET | `/:id` | — | public profile (never the password) |
| PUT | `/native-lang` | B | sets the native language |
| PUT | `/fluent` | B | replaces the fluent languages |

## 5. External configuration

Environment: `DATABASE_URL`, `REDIS_USER`, `REDIS_PASSWORD`, `REDIS_HOST`,
`REDIS_PORT`, `JWT_SECRET` (base64url, 64 bytes), `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_BASE_URL`.

Two external registrations follow the endpoint paths and must be updated with
them:

- **Google Cloud Console** — authorized redirect URI, today
  `${NEXT_PUBLIC_BASE_URL}/api/auth/google/callback` (`GOOGLE_CALLBACK_PATH` in
  `modules/auth/service.ts`).
- **`vercel.json`** — the cron paths, today `/api/lang/jobs/cleanup-tokens` and
  `/api/guess/jobs/daily`.
