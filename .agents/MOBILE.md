# Mobile app

`mobile/` is the Flutter client for iOS and Android. It is a **second client of
the same REST API**, not a second product: same endpoints, same translations,
same flags, same neobrutalism look. Read
[`ARCHITECTURAL_SPINE.md`](./ARCHITECTURAL_SPINE.md) for the API it talks to;
this document covers the app itself and what the web side must keep in mind
for it.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Flutter 3.47 (Dart 3.13), Material 3 as the base, restyled |
| State | `provider` + `ChangeNotifier` |
| Navigation | `go_router` (`StatefulShellRoute` for the tab bar) |
| HTTP | `http`, wrapped by `core/api/api_client.dart` |
| Local storage | `shared_preferences` (per-device conveniences only) |
| Fonts | `google_fonts`: Dongle (display), Noto Sans (body), Roboto Mono (eyebrows) |
| i18n | the web's `messages/*.json`, bundled as assets, read by `LocaleController`; `flutter_localizations` for Material's own strings |
| Lint | `flutter_lints` (`analysis_options.yaml`), `dart format` |

Bundle ids: iOS `teo.taberna.langdleApp`, Android `teo.taberna.langdle_app`.
They are also referenced by the deep link files in `public/.well-known/` and by
the OAuth client ids (`GOOGLE_MOBILE_CLIENT_IDS`, `APPLE_CLIENT_IDS`); change
them together.

## Layout

```
mobile/
  lib/
    main.dart        app root: loads the locale, provides the repositories
    router.dart      routes, one shell branch per tab
    core/            same role as src/core: shared by every module
      config.dart    API_BASE_URL
      api/           ApiClient + ApiException: the only HTTP code
      i18n/          LocaleController, context.t()
      theme/         tokens.dart (the design tokens), app_theme.dart
      ui/            the kit: NeoButton, NeoCard, NeoPill, Eyebrow, showNeoDialog,
                     LangFlag, FeatureResult, FeatureStatusChip, NeoLoading, NeoError
      shell/         header, locale picker, bottom tab bar
      models/        types shared across modules (Language)
    modules/<name>/  one feature, named after the web module in snake_case
                     (lang_guess, lang_data, how_to_play; later auth, user_profile)
  assets/i18n, assets/flags   generated: copied from the web, never edited here
  tool/sync_shared.dart       the script that copies them
  test/                       flutter test
```

### Inside a module

| File | Role | Web equivalent |
| --- | --- | --- |
| `<name>_repository.dart` | calls the endpoints through `ApiClient`, parses JSON into models | `actions.ts` |
| `<subject>_controller.dart` | a `ChangeNotifier` holding a screen's state and its operations | the module's `hooks/` |
| `<subject>_models.dart` | plain immutable classes with `fromJson` / `toJson` | `types.ts` |
| `screens/` | one widget per route | `src/app/[locale]/…/page.tsx` |
| `widgets/` | widgets owned by the module | `components/` |

A widget used by more than one module moves to `core/ui/`, a model to
`core/models/`, exactly like the web's `core` rule.

## Rules

1. **The API is the only data source.** Every request goes through
   `ApiClient`, from a repository. Widgets and controllers never build URLs or
   call `http` directly. The app does not reimplement what the API decides:
   guess matching, permissions and validation stay on the server. Client-side
   logic is limited to presentation (the search ranking, which mirrors
   `useLang`'s Levenshtein ranking on the web).
2. **No hardcoded user-facing text.** Every string comes from the messages:
   `context.t('Group.key')` inside `build`,
   `context.read<LocaleController>().t(...)` in callbacks and async code
   (`context.t` watches the locale and must not run outside `build`).
   Placeholders use the web's `{name}` syntax:
   `t('Game.youGuessed', {'lang': name})`.
3. **Reuse the web keys.** A screen that shows what a web page shows uses that
   page's keys (`Game.*`, `HowToPlayPage.*`, `PublicDataPage.*`,
   `Features.name.*`, `Exonyms.*`). Only strings that exist on mobile alone
   (tab labels, retry, connection errors) go in the `Mobile` group. See the
   i18n rules in [`CONVENTIONS.md`](./CONVENTIONS.md) for how to add one.
4. **Errors are keys.** `ApiException.key` is the API's `key`; show it through
   `t(...)` like the web does. `key == 'network'` (unreachable server, timeout)
   is shown as `Mobile.connectionError`. Use `NeoError` with a retry for a
   screen that failed to load, and a `SnackBar` for a failed action.
5. **Follow the design system.** The rules in
   [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) apply as they are: use the kit in
   `core/ui` before writing a widget, and build new ones only from
   `NeoColors`, `Neo` (2px border, 5px radius, hard 4px shadow) and `NeoText`.
   No Material elevation, blurred shadows, ripples or default Material look on
   pressable elements. The press-into-the-shadow animation of `NeoButton`
   replaces the web hover. The game's green / amber / red stay the one colour
   exception.
6. **`google_fonts` gives families, not themes.** Its `*TextTheme` helpers are
   built on the `material_ui` package and do not type-check against
   `flutter/material.dart`. Use `GoogleFonts.x().fontFamily` or the
   `GoogleFonts.x(...)` `TextStyle`s (`NeoText` wraps them).
7. **Routes mirror the web paths** (`/`, `/random`, `/data/public`,
   `/howtoplay`, …), so a web link and a deep link can map to the same screen.
   A new tab is a new `StatefulShellBranch`. A pushed screen is a `GoRoute`
   nested under its tab.
8. **State lives in controllers.** Repositories are provided once in
   `main.dart`. A screen's `ChangeNotifier` is created by its route in
   `router.dart` and reached with `context.watch` / `context.read`. A
   controller that notifies after async work guards against being disposed
   (see `GameController._notify`).
9. **Storage is per device.** `shared_preferences` is for things like the
   chosen locale and the saved daily game (`day-save`). Session tokens and
   anything secret go in the platform keychain (`flutter_secure_storage`),
   never in `shared_preferences`.
10. **Game rules match the web.** Same attempt limit (`GameController.maxAttempts`
    and `MAX_ATTEMPTS` in `use-game.tsx`), the daily language rolls at 00:00
    UTC, and the matching order is correct, partial, then incorrect. Change both
    clients together.

## Shared assets

`messages/*.json` and `public/flags/*.webp` are copied into
`mobile/assets/` by:

```bash
cd mobile && dart run tool/sync_shared.dart
```

Run it after any change to the messages or the flags, and commit the copies
with the change. The app ships what is in `assets/`, not what is in the web
folders.

## Code style

- Files and folders in `snake_case`, classes in `PascalCase`, members in
  `camelCase`. Private widgets of a single file stay private (`_GuessRow`)
  below the public one.
- `dart format lib test tool` and `flutter analyze` must be clean, infos
  included.
- Follow the web's comment style: a short doc comment on public classes and
  on anything non-obvious, nothing restating the code.

## Running and configuration

```bash
cd mobile
flutter pub get
flutter run                                          # against pnpm dev
flutter run --dart-define=API_BASE_URL=https://…     # against another API
flutter analyze && flutter test
```

Without `API_BASE_URL` the app calls `http://localhost:3000`. On Android, a
phone or an emulator reaches the dev server through USB forwarding. Run this
once per connection (`adb` is in `%LOCALAPPDATA%\Android\Sdk\platform-tools`):

```bash
adb reverse tcp:3000 tcp:3000
```

Plain `http` is allowed only for local development: Android through
`usesCleartextTraffic` in the **debug** manifest, iOS through
`NSAllowsLocalNetworking`. Release builds talk to an `https` API.

## Tests

`flutter test` runs `mobile/test/`: pure logic such as models, JSON parsing,
the search ranking and the daily save, with no network. The API behaviour is
already covered by the web's `pnpm test:api`. The app's tests only check that
it reads the API's answers correctly. When an endpoint's response shape
changes, update the model's `fromJson` and its test in the same change.
