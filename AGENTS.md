# Langdle

A wordle-like game, but for **languages**: every day there is a target language
and players guess it from its linguistic features (phonology, word order,
writing system, morphosyntax). The app also hosts the language data itself — a
public atlas, per-language edit permissions and a change-request flow so users
can suggest corrections.

The codebase is a Next.js app with a **real REST API** inside it (hono). The API
is the only way into the data: server actions call it, and a future Flutter
mobile client is expected to call the exact same endpoints. Nothing talks to the
database behind the API's back except the services the API itself uses.

## Where things are

| Path | What lives there |
| --- | --- |
| `src/core/` | Everything shared across the app: UI kit, database clients, helpers, global types. Behaves like a module. |
| `src/modules/<name>/` | One feature: `auth`, `user-profile`, `lang-data`, `lang-guess`. |
| `src/app/[locale]/` | Pages only. They compose module components and call module actions. |
| `src/app/api/[...route]/route.ts` | Mounts every module controller under its prefix. The single API entry point. |
| `src/i18n/` | next-intl routing, request config and navigation helpers. |
| `messages/` | `en`, `es`, `pt` translations. |
| `tests/` | Vitest tests, mirroring the module names. |

## Commands

```bash
pnpm dev            # next dev --turbo
pnpm build          # production build (also typechecks)
pnpm test           # vitest
npx biome check --write src tests   # format + lint fixes
npx tsc --noEmit    # typecheck only
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

All three documents are normative: when the code and these documents disagree,
the documents win and the code gets fixed.
