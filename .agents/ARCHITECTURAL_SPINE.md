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
| File storage | Cloudflare R2 through its S3 API (`@aws-sdk/client-s3`, wrapped by `core/lib/storage.ts`) — the flags of languages added through requests (`flags/<code>.webp`) and the uploads of open requests (`language-requests/<id>.webp`); `sharp` normalizes every upload to a 455×304 WebP (`core/lib/flags.ts`). The flags in `public/flags` stay where they are: clients look there first, then in the bucket |
| Validation | zod 4 (+ `drizzle-zod`, `@hookform/resolvers`) |
| Auth | Own session implementation: argon2 password hashes, opaque session tokens hashed with SHA-256, stored in Postgres and cached in Redis (see §2 *Session cache*), `arctic` for Google OAuth, `jose` for short-lived encrypted tokens |
| Client data | TanStack Query for client fetching, server components otherwise |
| Forms | react-hook-form + zod resolver |
| UI | Tailwind v4, neobrutalism.dev components on Base UI primitives (`@base-ui/react`), `class-variance-authority`, `motion` (imported from `motion/react`), sonner toasts — see [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) |
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

### The API is a public contract

The mobile app (`mobile/`, see [`MOBILE.md`](./MOBILE.md)) is a released
binary. Old versions stay installed for weeks, so a deploy cannot change
the app in step with the server the way it changes the web. Every endpoint is
therefore treated as a public contract:

- **Change additively.** New endpoints, new optional body fields and new
  response fields are free. Renaming or removing a field, changing its type,
  tightening validation, or changing a status code or an error `key` breaks
  installed apps.
- **A breaking change gets a new path.** Keep the old one working as an alias
  until no supported app version calls it (as `/auth/google/signup` still
  answers next to `/auth/oauth/signup`).
- **Error keys are API surface.** The app translates them, so a new `key` also
  needs its translation in `messages/` (and in the `Mobile` group if only the
  app shows it).
- **No cookies, no redirects for the app.** Native clients authenticate with
  `Authorization: Bearer` and read JSON. A flow that only works through
  cookies and browser redirects (the web Google callback) needs a JSON
  counterpart before the app can use it (`/auth/google/token`).
- **The same change updates the app's model.** When a response gains or changes
  a field the app reads, update its `fromJson` in `mobile/lib` and its test.

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

### Language index

`getLanguagesPage` (`GET /lang/page`) and `getLanguageNames`
(`GET /lang/names`) never scan Redis per request. Each instance keeps an index of every language (id, name, active, coverage and the
normalized search terms: no features) for `LANGUAGE_INDEX_TTL_MS` (30 s), sorts
and filters it in memory, and reads the full documents of the batch alone with
one `JSON.MGET`.

- **Writes drop it.** `setLanguageData` and `setLanguageStatus` call
  `clearLanguageIndex`, so the instance that wrote sees the change at once.
  Other instances, and the offline scripts that write Redis directly, are seen
  when the TTL runs out.
- **Cursors are sort keys, not offsets** (`[rank, order, name, id]`), so a
  language added, removed or activated between two batches never makes one
  repeat or skip.
- **One ranking.** `core/lib/search.ts` (`normalizeSearchText`, `searchTerms`,
  `matchRank`, `rankByQuery`) decides what a query finds and in which order:
  whole term, start of a term, start of a word, anywhere, then a few typos
  (one per four letters). The API ranks `?q=` with it and the pickers rank
  `/names` with it in the browser, so both find the same languages.
- The API tests empty Redis before each test, so `tests/support/setup.ts`
  clears the index with it.

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
  schemas/     lang.ts       langDataSchema, the shape of a language (and langManagedFields)
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
| `app-install` | the Android install prompt and menu entry (no endpoints: it only links the APK in `NEXT_PUBLIC_ANDROID_APP_URL`) | — |

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
| GET | `/google` | — | redirects to Google, stores state cookies (and a safe `?next=` return path) |
| GET | `/google/callback` | — | signs the user in and redirects to `next` (or `/`), or redirects to `/endgoogle?data=<encrypted claims>&next=` |
| POST | `/google/token` | — | native sign in from `{ idToken }`: `{ status: 'signedIn', user, token, expiresAt }` or `{ status: 'needsSignup', dataToken, nickname, email }` |
| POST | `/apple/token` | — | same contract for Sign in with Apple; `{ idToken, nickname? }` (Apple only gives the name to the app) |
| GET | `/oauth/signup-data?token=` | — | `{ provider, nickname, email }` inside a signup token, to prefill the form |
| POST | `/oauth/signup` | — | finishes a Google/Apple signup from `{ dataToken, nickname, country }`; `/google/signup` is an alias |

### `/api/lang`

| Method | Path | Guard | Purpose |
| --- | --- | --- | --- |
| GET | `/` | — | all languages, with the optional `locations`, `family`, `genus` and `coverage` of `langDataSchema`; `?oactive=1` for playable ones, repeated `?id=` to fetch a set |
| GET | `/random` | — | a random active language |
| GET | `/page?limit=&cursor=&active=&sort=&q=` | — | one batch of a listing of the catalogue (keyset paging): `{ items, nextCursor, total }`; `limit` 1–100 (default 24), the previous `nextCursor` as `cursor` (`null` on the last batch, `400 invalidCursor` for a forged one), `active=true\|false` for the playable or unplayable languages, `sort=name` (default) or `coverage` (best described first), `q` keeps the languages whose id, names or search params contain it, accents ignored, best matches first; `total` counts every match. What a client that lists or searches the catalogue should use instead of `/` |
| GET | `/names?active=` | — | `[{ id, name, exonym?, searchParams }]` of every language by name (`active=true\|false` for one part): the light list a picker loads once and searches locally |
| GET | `/summary` | — | `{ languages, activeLanguages, activeFeatures, partialFeatures }`: the atlas counters |
| GET | `/:id` | — | one language |
| PUT | `/:id` | B + owner/A | replaces the language data (`langDataBodySchema`); the `langManagedFields` (`locations`, `family`, `genus`, `coverage`) a body leaves out are kept, so a client that only edits features never erases them, and one set to `null` is removed |
| PUT | `/:id/status?active=` | B + A | activates/deactivates a language |
| GET | `/permissions/:userId` | — | language ids a user may edit |
| POST | `/permissions/tokens/:lang` | B + A | mints a share token for that language |
| PUT | `/permissions/claim/:token` | B | claims the permission the token carries |
| POST | `/change-requests` | B | suggests a feature change (optional `locale` for the resolution email) |
| GET | `/change-requests/mine` | B | the caller's requests with state and rejection reason |
| GET | `/change-requests?state=` | B + A | every request, with author and current status |
| PUT | `/change-requests/:id/accept` | B + A | applies the change to the language and emails the author |
| PUT | `/change-requests/:id/reject` | B + A | body `{ reason }`; rejects the request and emails the author |
| POST | `/language-requests` | B | **multipart**, the only non-JSON body: `data` (JSON `{ code, name, exonym?, features, partial, description, locale? }`) and `flag` (PNG/JPEG/WebP ≤ 2 MB). `409 langExists` / `requestPending`, `400 invalidFlag` |
| GET | `/language-requests/mine` | B | the caller's language requests, each with its `flagUrl` |
| GET | `/language-requests?state=` | B + A | every language request, with author |
| PUT | `/language-requests/:id/accept` | B + A | creates the language **inactive**, publishes the flag, gives the author edit permission and emails them |
| PUT | `/language-requests/:id/reject` | B + A | body `{ reason }`; deletes the uploaded flag and emails the author |
| GET | `/jobs/cleanup-tokens` | C | deletes expired permission tokens |

### `/api/guess`

| Method | Path | Guard | Purpose |
| --- | --- | --- | --- |
| GET | `/daily` | — | the language of the day |
| GET | `/:id?target=` | — | `{ guessed }` when right, the feature matching otherwise, plus `hints` (`distanceKm` and `bearing` between the closest of their `locations`, `relation`: `genus` / `family` / `none`) when both languages have the data behind them; `target` defaults to the daily language |
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

## 5. Offline data tools

`scripts/` holds tools an administrator runs by hand. They are the one
exception to "only the services touch the data", and only for bulk work the
API has no endpoint for:

- **`scripts/wals/seed-languages.ts`** writes `lang:<id>` documents straight
  into Redis, with the exact shape `setLanguageData` stores (checked by
  `tests/lang-data/wals-languages.test.ts` against `langDataSchema`). It only
  creates (`JSON.SET … NX`, and never when another code of the same language
  exists), always inactive, so it cannot overwrite what the API wrote.
- **`scripts/wals/update-existing.ts`** patches stored languages field by
  field (`JSON.SET lang:<id> $.features …`): it drops feature names the
  catalogue no longer has, applies its hand corrections, and fills in what a
  language never had (features added to the catalogue later, `locations`,
  `family`, `genus`). It never changes a feature an editor already set, and
  backs up every document it touches first.

A change to the catalogue in `core/lib/features.ts` therefore comes with: a
drizzle migration (the `features` Postgres enum follows it, in order),
`Features.name` / `Features.description` translations, a WALS rule in
`build-languages.ts` when WALS covers it, a rebuilt `languages.json` and a run
of `update-existing.ts` once deployed.

They run under Node's type stripping (`node scripts/…/x.ts`), so they cannot use
the `@/` alias and import nothing from `src/`; whatever must agree with the app
is enforced by a test instead.

## 6. External configuration

Environment: `DATABASE_URL`, `REDIS_USER`, `REDIS_PASSWORD`, `REDIS_HOST`,
`REDIS_PORT`, `JWT_SECRET` (base64url, 64 bytes), `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_BASE_URL`, `RESEND_API_KEY`
and `EMAIL_FROM` (a sender verified in Resend; without them emails are logged
as failed and skipped, never thrown). The flags bucket: `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (an R2 API token with *Object Read &
Write* on that bucket), `R2_BUCKET` and `NEXT_PUBLIC_FLAGS_URL` (the bucket's
public custom domain, no trailing slash). Optional, for the mobile app:
`GOOGLE_MOBILE_CLIENT_IDS` (comma separated iOS/Android OAuth client ids
accepted besides `GOOGLE_CLIENT_ID` as the audience of a Google ID token) and
`APPLE_CLIENT_IDS` (comma separated bundle/service ids; without it
`/auth/apple/token` rejects every token). `NEXT_PUBLIC_ANDROID_APP_URL` is the
absolute URL of the Android release APK, linked from the install prompt; without
it no install entry is shown.

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
- **Cloudflare R2** — the bucket needs public read access (a custom domain in
  production) matching `NEXT_PUBLIC_FLAGS_URL`; uploads go through the API, so
  it needs no CORS rules.
- **`vercel.json`** — the cron paths, today `/api/lang/jobs/cleanup-tokens` and
  `/api/guess/jobs/daily`.
