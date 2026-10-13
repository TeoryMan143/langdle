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
| Local storage | `shared_preferences` (per-device conveniences only), `flutter_secure_storage` (the session) |
| Sign in | `google_sign_in` and `sign_in_with_apple`: they only produce the ID token the API verifies |
| Icons | Material icons, `flutter_svg` for the few web SVGs (the Google logo) |
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
                     showNeoConfirm, LangFlag, FeatureResult, FeatureStatusChip,
                     NeoLoading, NeoError
      shell/         header, locale picker, bottom tab bar
      models/        types shared across modules (Language, Country)
    modules/<name>/  one feature, named after the web module in snake_case
                     (auth, user_profile, lang_guess, lang_data, meta,
                     how_to_play)
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

## Auth

The `auth` module mirrors the web's: `/signin`, `/signup`, `/endgoogle`
(finishing a Google **or** Apple sign up) and `/account`, all in the account
tab.

- **`AuthController`** is app-wide (created in `main.dart`, like
  `LocaleController`) and is the only owner of the session. It implements
  `ApiSession`, so `ApiClient` signs every request with
  `Authorization: Bearer`, saves the renewed expiry of each
  `X-Session-Expires-At` answer, and closes the session when a request that
  carried it gets `notSignedIn`. Other modules never touch the token: they call
  their endpoints and the client signs them.
- **The session lives in the keychain** (`SessionStore`, rule 9). At launch
  `restore()` opens it if it has not expired and refreshes the user from
  `GET /auth/me` in the background, so an offline launch stays signed in.
- **The router guards the tab** through `signedInChanges`: `/account` without a
  session goes to `/signin`, the sign in screens with one go to `/account`.
  Screens do not navigate after signing in or out; the guard does.
- **Google and Apple only prove identity.** `NativeOAuth` gets an ID token from
  the platform SDK; `POST /auth/{google,apple}/token` verifies it and answers a
  session or a `needsSignup` data token, which `/endgoogle` finishes with
  `POST /auth/oauth/signup`. Cancelling the provider sheet is not an error.
- **Validation is the API's.** The forms send what was typed and show the
  `invalidData` field messages (`ApiException.fieldErrors`) under each field.
- **The account screen composes three modules**, like the web page: the auth
  data, `user_profile`'s `ProfileLanguages` (native and fluent languages; each
  edit hands the user the API answered to `AuthController.updateUser`) and
  `lang_guess`'s `GameHistory`. Their controllers are created by the
  `/account` route.
- **Finished games go to the history** (`PUT /guess/history`) when signed in,
  from `GameController`, with the web's counts: the misses plus the right
  guess. `GuessRepository.historyChanges` reloads an open history.
- **Permission links** (`/addpermission?token=`, also with a locale prefix)
  open `AddPermissionScreen` in the account tab, which claims the token. The
  guard is `routeRedirect` in `router.dart`: signed out, the link goes to
  `/signup?redtk=<token>`; the token rides along through `/signin` and
  `/endgoogle` (`withRedirectToken`) and the guard returns to the link once the
  session opens, like the web's `redtk`.

### Provider setup

Google needs OAuth clients in the Google Cloud project of `GOOGLE_CLIENT_ID`:
an **Android** client (package `teo.taberna.langdle_app` + the SHA-1 of each
signing key, debug included) and an **iOS** client (bundle
`teo.taberna.langdleApp`). On Android the ID token is addressed to the web
client (`GOOGLE_CLIENT_ID`); on iOS it can be addressed to the iOS client, so
list both mobile client ids in the API's `GOOGLE_MOBILE_CLIENT_IDS`. Then build
with:

```bash
flutter run   --dart-define=GOOGLE_SERVER_CLIENT_ID=<web client id>   --dart-define=GOOGLE_IOS_CLIENT_ID=<iOS client id>
```

and set `GOOGLE_REVERSED_CLIENT_ID` (the iOS client id reversed,
`com.googleusercontent.apps.<id>`) in `ios/Flutter/Debug.xcconfig` and
`Release.xcconfig`: it is the URL scheme Google returns through. Without
`GOOGLE_SERVER_CLIENT_ID` (or, on iOS, `GOOGLE_IOS_CLIENT_ID`) the Google
button is hidden.

Apple is offered on iOS only: on Android it needs a web callback the API does
not have. The App ID needs the *Sign in with Apple* capability (the
`Runner.entitlements` file already requests it, which needs a paid developer
team to sign), and the API's `APPLE_CLIENT_IDS` must contain the bundle id.

### Release signing

Android release builds are signed with the key described in
`android/key.properties`, which git ignores along with every `.jks`:

```properties
# storeFile is relative to android/, whose .gitignore covers *.jks
storeFile=langdle-release.jks
storePassword=…
keyPassword=…
keyAlias=langdle
```

Without that file they fall back to the debug key. The release key's SHA-1
needs its own Android OAuth client, and its SHA-256 goes in
`public/.well-known/assetlinks.json`. Losing the keystore or its passwords
means no more updates to an app already signed with it: keep a backup outside
the repo.

### App links

The web host whose links open the app is a build setting, `localhost` until
set: the `langdle.appLinkHost` Gradle property on Android
(`android/gradle.properties` or `-Plangdle.appLinkHost=`) and `APP_LINK_HOST`
in `ios/Flutter/Debug.xcconfig` and `Release.xcconfig` (an Associated Domains
entitlement, also a paid team capability). That host must serve
`public/.well-known/` with the real Team ID and release SHA-256 in place of
their placeholders, or the OS will not verify the links.

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
                                                     # + Google ids, see Auth
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
it reads the API's answers correctly, and that the client keeps the session
(`test/auth_test.dart` drives `AuthController` through a mocked `http`
client). When an endpoint's response shape
changes, update the model's `fromJson` and its test in the same change.
