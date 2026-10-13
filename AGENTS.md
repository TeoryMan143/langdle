# Langdle

A wordle-like game, but for **languages**: every day there is a target language
and players guess it from its linguistic features (phonology, word order,
writing system, morphosyntax). The app also hosts the language data itself — a
public atlas, per-language edit permissions and a change-request flow so users
can suggest corrections.

The codebase is a Next.js app with a **real REST API** inside it (hono). The API
is the only way into the data: server actions call it, and the Flutter mobile
app in `mobile/` calls the exact same endpoints. Nothing talks to the database
behind the API's back except the services the API itself uses.

## Where things are

| Path | What lives there |
| --- | --- |
| `src/core/` | Everything shared across the app: UI kit, database clients, helpers, global types. Behaves like a module. |
| `src/modules/<name>/` | One feature: `auth`, `user-profile`, `lang-data`, `lang-guess`. |
| `src/app/[locale]/` | Pages only. They compose module components and call module actions. |
| `src/app/api/[...route]/route.ts` | Mounts every module controller under its prefix. The single API entry point. |
| `src/i18n/` | next-intl routing, request config and navigation helpers. |
| `messages/` | `en`, `es`, `pt` translations, shared by the web and the mobile app. |
| `tests/` | Vitest tests, mirroring the module names. |
| `mobile/` | The Flutter app (iOS + Android): same API, translations, flags and design. |

## Commands

```bash
pnpm dev            # next dev --turbo
pnpm build          # production build (also typechecks)
pnpm test           # every test: unit + api (the api ones need Docker running)
pnpm test:unit      # pure logic only, no Docker
pnpm test:api       # REST API against throwaway Postgres + Redis containers
npx biome check --write src tests   # format + lint fixes
npx tsc --noEmit    # typecheck only

# mobile app, from mobile/
flutter run                        # against pnpm dev (Android: adb reverse tcp:3000 tcp:3000)
flutter analyze && flutter test
dart run tool/sync_shared.dart     # copy messages/ and public/flags into the app
```

## Read before writing code

- [`.agents/ARCHITECTURAL_SPINE.md`](.agents/ARCHITECTURAL_SPINE.md) — the tech
  stack and the rules of the module layout: what each file in a module is for,
  which direction dependencies may point, how a request flows from the browser
  to the database, and the endpoint inventory.
- [`.agents/CONVENTIONS.md`](.agents/CONVENTIONS.md) — naming, formatting, error
  handling, i18n, forms, data fetching and the small patterns this project
  repeats on purpose.
- [`.agents/DESIGN_SYSTEM.md`](.agents/DESIGN_SYSTEM.md) — every component
  follows the neobrutalism.dev design: which kit to use, how to add missing
  components from its registry, the tokens (borders, shadows, colours, radius)
  and how to use the Base UI primitives underneath.
- [`.agents/MOBILE.md`](.agents/MOBILE.md) — the Flutter app: its layout, how
  it maps onto the web modules, translations and shared assets, the mirrored
  design tokens, and what a web or API change owes the app.

All four documents are normative: when the code and these documents disagree,
the documents win and the code gets fixed.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
