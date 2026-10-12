# Conventions

Rules about *how* code is written here. The layout rules are in
[`ARCHITECTURAL_SPINE.md`](./ARCHITECTURAL_SPINE.md).

## Naming

- Files and folders: `kebab-case` (`change-request-dialog.tsx`,
  `use-lang.ts`). Hooks are named `use-<thing>`.
- Components: `PascalCase`, one main component per file, `export default`.
  Small private helpers (`InputError`, `CheckButton`) stay unexported in the
  same file, below the component that uses them.
- Functions, variables: `camelCase`, named exports. Services and actions export
  named functions — no default-exported object of functions.
- Controllers `export default` their router.
- zod schemas: `<subject>Schema`; a factory that takes the translator is
  `create<Subject>Schema(t)`.
- Database tables: `<name>Table` in `core/database/relational/tables.ts`,
  snake_case column names in Postgres, camelCase in TypeScript.
- Redis keys: `<group>:<id>` through the `core/database/redis/key-getters.ts`
  helpers; the group prefix is a constant in the owning service.

## Formatting and lint

Biome decides, `biome.json` is the source of truth: 2 spaces, 80 columns, single
quotes (JSX included), semicolons, trailing commas, `asNeeded` arrow parens, LF.
Run `npx biome check --write src tests` before finishing; imports are sorted by
the assist action, so never hand-sort them. Do not reformat
`src/app/[locale]/globals.css` — Biome does not fully parse Tailwind v4 syntax
there.

Keep `tsc --noEmit` and `pnpm build` clean. `any` is not used; when a Redis
payload has no knowable shape, type it `unknown` and narrow, or use the existing
`SearchDocumentValue` style.

## Results and errors

- **Actions never throw.** They return `ActionResult<T, E>` built with
  `actionSuccess` / `actionError` from `core/lib/action.ts`. Callers branch on
  `res.success` and read `res.result` or `res.error`.
- **An error is a key, not a sentence.** Actions return short camelCase keys
  (`notSignedIn`, `tokenExpired`, `nicknameAlreadyExists`) that the UI feeds to
  `t(...)`. Every new key gets an entry in all three files of `messages/`.
  Validation failures are the exception: the action forwards the flattened zod
  error object so forms can map it onto fields.
- **The API answers `{ key, message, errors? }`** on every failure, built with
  the `core/lib/http.ts` helpers (`apiError`, `notFound`, `forbidden`,
  `unknownError`). `key` is for clients, `message` is for humans debugging,
  `errors` carries `flatten()` output. Success responses return the resource
  itself (`201` when something was created).
- **Services swallow and report.** A service that fails logs with
  `console.error` and returns `null` / `false` / `[]` so the controller can pick
  the status code; it throws only for a broken invariant (no daily language
  defined, no active languages to pick from).
- Never let a password leave a service: strip it (`toUserDTO`, the
  `userTableWithoutPassword` selection) and return `UserDTO`.

## Writing a controller

Parse with `parseJsonBody(c, schema)` and forward `parsed.response` on failure;
read the query with `c.req.query()` / `c.req.queries()`, never by building a
`URL` by hand. Put `authMiddleware` (then `adminMiddleware`) in the route
definition rather than checking the user inside the handler. Register static
paths before dynamic ones (`/random` before `/:id`). Authorization that needs
domain knowledge is a service function (`canEditLanguage`), not an inline query.

## Writing an action

One action, one endpoint, through `apiRequest` — never a bare `fetch` and never
a hand-built `${baseUrl}/api/...` string:

```ts
export async function setLangStatus(langId: string, status: boolean) {
  const res = await apiRequest<{ lang: string }>(`/lang/${langId}/status`, {
    method: 'put',
    auth: true,
    searchParams: { active: status },
  });

  if (!res.success) {
    return actionError(res.error.key);
  }

  revalidatePath(`/data/${langId}`);

  return actionSuccess(res.result.lang);
}
```

`auth: true` attaches the session cookie; the helper already returns
`notSignedIn` when there is none, so do not read cookies again.

The session cookie has exactly one definition: `core/lib/session-config.ts`
(name, lifetime, `sessionCookieOptions`). Every writer goes through it — the
`next/headers` helpers in `core/lib/session.ts`, the hono Google callback and
the sliding refresh in `src/proxy.ts`. Never spell the cookie name or its
attributes out by hand; a second copy is what silently broke the refresh once
already.

## Components

- Server components by default. `'use client'` only for interactivity, and as
  the first line of the file.
- Pages stay thin: resolve params, call actions, render module components,
  redirect on failure. No data shaping or `fetch` in a page.
- Client data goes through TanStack Query, and for languages specifically
  through the `useLang` hook of `lang-data` instead of calling the actions
  directly.
- Shared UI comes from `core/components/ui`, which is shadcn-style: `cva`
  variants, `cn()` for class merging, `React.ComponentProps<'x'>` for props.
  Icons are small components in `core/components/icons`.
- Everything visual follows the neobrutalism design and the Base UI usage rules
  in [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md): kit first, missing components
  from the neobrutalism.dev registry, theme tokens instead of raw values.

## Forms

react-hook-form with `zodResolver`, the schema from the module's `schemas/`, and
this flow on submit: `toast.loading` with an id, call the action, on a string
error `toast.error(t('errors.' + res.error), { id })`, on an object error map
`fieldErrors` with `setError` and show the generic validation toast, on success
`toast.success` and navigate with the localized `useRouter` from
`@/i18n/navigation`.

## i18n

- All user-facing text comes from `messages/<locale>.json`; `en`, `es` and `pt`
  stay in sync, keys grouped per page or feature (`AuthPage`, `AccountPage`,
  `Features`, `Exonyms`).
- Every new key must also be declared in `src/i18n/messages-schema.json`: add
  it to the `properties` of its group and to that group's `required` list, next
  to its neighbours in the message files. A key present in `messages/` but
  missing from the schema is incomplete.
- Navigate with `Link` / `useRouter` / `redirect` from `@/i18n/navigation`, not
  from `next/*`, so the locale prefix survives.
- `useTranslations` in client components, `await getTranslations` in server
  components and actions. Translations never reach a controller or a service:
  the API is locale-agnostic and answers with keys.

## Tests

Vitest, files in `tests/<module>/<subject>.test.ts`, imports through the `@/`
alias. Pure domain logic is the priority target (`getMatching`). Importing a
service pulls in the database clients, so anything a test needs from the
environment is defaulted in `vitest.setup.ts`.

## Commits

Conventional commits, imperative and lowercase: `feat: add change request
feature for language attributes`, `fix: …`, `refactor: …`, `chore: …`.
