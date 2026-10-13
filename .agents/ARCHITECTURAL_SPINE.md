# Architectural spine

## 1. High level

### Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript (strict), path alias `@/*` → `src/*` |
| REST API | hono 4, mounted inside the App Router via `hono/vercel` |
| Relational DB | Neon Postgres through Drizzle ORM (`drizzle-kit` migrations in `drizzle/`) |
| Key-value DB | Redis (`redis` client) with RedisJSON + RediSearch — holds the languages (`lang:<id>`), the daily language (`daylang`) and the session cache (`session:<sessionId>`) |
| Validation | zod 3 (+ `drizzle-zod`, `@hookform/resolvers`) |
| Auth | Own session implementation: argon2 password hashes, opaque session tokens hashed with SHA-256, stored in Postgres and cached in Redis (see §2 *Session cache*), `arctic` for Google OAuth, `jose` for short-lived encrypted tokens |
| Client data | TanStack Query for client fetching, server components otherwise |
| Forms | react-hook-form + zod resolver |
| UI | Tailwind v4, neobrutalism.dev components on Base UI primitives (`@base-ui/react`), `class-variance-authority`, framer-motion, sonner toasts — see [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) |
| i18n | next-intl, locale prefix in the route (`/[locale]/…`), proxy in `src/proxy.ts` |
| Email | Resend (`resend`) with React Email templates (`react-email`); templates restyle the neobrutalism tokens inline, since mail clients ignore Tailwind |
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
- **`emails.tsx`** — only when a module sends transactional email
  (`modules/lang-data/emails.tsx`). It builds subject and body from the `Emails`
  group of `messages/<locale>.json` (read directly, since the API has no
  request locale: the locale travels with the data that triggers the email),
  fills a React Email template from the module's `components/` and hands it to
  `core/lib/email.ts`, which owns the Resend call.
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
6. A service that writes a row of `userTable` calls `evictUserSessionsCache`
   from `modules/auth/service.ts` once the write succeeds (today only
   `user-profile`'s `updateProfile`). Otherwise the user cached with the
   session is served stale until the cache entry expires.

### Session cache

`validateSessionToken` in `modules/auth/service.ts` is cache-aside over Redis:

- **Postgres is the source of truth.** Sessions are created, renewed and
  deleted there; Redis only holds copies. `createSession` does not write the
  cache, the first validation of a session does.
- **Key and value.** `session:<sessionId>`, where the id is the SHA-256 hash of
  the token (the raw token is never stored anywhere). The value is the JSON of
  `CachedSession` (`{ session, user }`, user without password); `expiresAt` is
  revived into a `Date` on read.
- **Lifetime.** Each entry expires after `SESSION_CACHE_TTL_S` (5 minutes) or at
  the session's own expiry, whichever comes first. The short TTL is the
  backstop for anything changed outside the services (an admin flag set by
  hand in the database).
- **Eviction.** `invalidateSession` / `invalidateAllSessions` delete the entries
  with the rows; `evictUserSessionsCache(userId)` drops a user's entries
  without signing them out (see dependency rule 6). A renewal rewrites the
  entry with the new expiry.
- **Failure mode.** Redis errors are swallowed by the `key-getters` helpers
  (logged, reported as a miss / failed write), so a Redis outage degrades to a
  Postgres lookup per request; it never signs anyone out.
- Expiry and renewal are checked on the cached copy exactly as on the row, so a
  cached session never outlives `expiresAt`.

### What `core` holds

```
core/
  components/  icons/  main/ (app shell: header, sidebar, providers)  ui/ (design system)
  database/    redis/ (client + key getters)   relational/ (drizzle client + tables)
  lib/         action.ts     actionSuccess / actionError
               api-client.ts apiRequest: the one place actions talk to the API
               email.ts      sendEmail: the one place that talks to the email provider
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
| `auth` | users, password hashing, sessions and their Redis cache, Google OAuth, hono auth guards | `/api/auth` |
| `user-profile` | the profile a signed-in user edits: native and fluent languages | `/api/user` |
| `lang-data` | the language catalogue, feature editing, edit permissions, change requests and their review | `/api/lang` |
| `lang-guess` | the game: daily language, guess matching, game history | `/api/guess` |
| `meta` | read-only catalogues the clients build forms from (features, countries) | `/api/meta` |

## 4. Endpoint inventory

`B` = `Authorization: Bearer <sessionToken>`, `A` = administrator,
`C` = cron secret. Every `B` answer carries an `X-Session-Expires-At` header
with the (possibly renewed) session expiry, so clients that store the token
(the mobile app) keep its expiry current.

### `/api/auth`

| Method | Path | Guard | Purpose |
| --- | --- | --- | --- |
| POST | `/signup` | — | creates the user, answers `{ user, token, expiresAt }` |
| POST | `/signin` | — | same payload for existing credentials |
| POST | `/signout` | B | invalidates the session |
| GET | `/me` | B | the current user |
| DELETE | `/me` | B | deletes the account: sessions, history, permissions, change requests (reviews it made lose their reviewer) |
| GET | `/google` | — | redirects to Google, stores state cookies |
| GET | `/google/callback` | — | signs the user in, or redirects to `/endgoogle?data=<encrypted claims>` |
| POST | `/google/token` | — | native sign in from `{ idToken }`: `{ status: 'signedIn', user, token, expiresAt }` or `{ status: 'needsSignup', dataToken, nickname, email }` |
| POST | `/apple/token` | — | same contract for Sign in with Apple; `{ idToken, nickname? }` (Apple only gives the name to the app) |
| GET | `/oauth/signup-data?token=` | — | `{ provider, nickname, email }` inside a signup token, to prefill the form |
| POST | `/oauth/signup` | — | finishes a Google/Apple signup from `{ dataToken, nickname, country }`; `/google/signup` is an alias |

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
| POST | `/change-requests` | B | suggests a feature change (optional `locale` for the resolution email) |
| GET | `/change-requests/mine` | B | the caller's requests with state and rejection reason |
| GET | `/change-requests?state=` | B + A | every request, with author and current status |
| PUT | `/change-requests/:id/accept` | B + A | applies the change to the language and emails the author |
| PUT | `/change-requests/:id/reject` | B + A | body `{ reason }`; rejects the request and emails the author |
| GET | `/jobs/cleanup-tokens` | C | deletes expired permission tokens |

### `/api/guess`

| Method | Path | Guard | Purpose |
| --- | --- | --- | --- |
| GET | `/daily` | — | the language of the day |
| GET | `/:id?target=` | — | `{ guessed }` when right, the feature matching otherwise; `target` defaults to the daily language |
| GET | `/history` | B | the user's games |
| PUT | `/history` | B | stores a finished game |
| GET | `/jobs/daily` | C | rolls the language of the day |

### `/api/meta`

| Method | Path | Guard | Purpose |
| --- | --- | --- | --- |
| GET | `/features` | — | `{ groups, statuses }`: the feature catalogue of `core/lib/features.ts` |
| GET | `/countries` | — | the country list of `core/lib/countries.ts` |

### `/api/user`

| Method | Path | Guard | Purpose |
| --- | --- | --- | --- |
| GET | `/:id` | — | public profile: id, nickname, country, admin, native and fluent languages (never the password, email or OAuth ids) |
| PUT | `/native-lang` | B | sets the native language |
| PUT | `/fluent` | B | replaces the fluent languages |

## 5. External configuration

Environment: `DATABASE_URL`, `REDIS_USER`, `REDIS_PASSWORD`, `REDIS_HOST`,
`REDIS_PORT`, `JWT_SECRET` (base64url, 64 bytes), `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_BASE_URL`, `RESEND_API_KEY`
and `EMAIL_FROM` (a sender verified in Resend; without them emails are logged
as failed and skipped, never thrown). Optional, for the mobile app:
`GOOGLE_MOBILE_CLIENT_IDS` (comma separated iOS/Android OAuth client ids
accepted besides `GOOGLE_CLIENT_ID` as the audience of a Google ID token) and
`APPLE_CLIENT_IDS` (comma separated bundle/service ids; without it
`/auth/apple/token` rejects every token).

Two external registrations follow the endpoint paths and must be updated with
them:

- **Google Cloud Console** — authorized redirect URI, today
  `${NEXT_PUBLIC_BASE_URL}/api/auth/google/callback` (`GOOGLE_CALLBACK_PATH` in
  `modules/auth/service.ts`).
- **Apple / Android app links** — `public/.well-known/apple-app-site-association`
  (Team ID + bundle id `teo.taberna.langdleApp`) and
  `public/.well-known/assetlinks.json` (package `teo.taberna.langdle_app` +
  release signing SHA-256) let `/addpermission?token=` links open in the app.
  They must follow the bundle ids and signing keys.
- **`vercel.json`** — the cron paths, today `/api/lang/jobs/cleanup-tokens` and
  `/api/guess/jobs/daily`.
