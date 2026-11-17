# Langdle mobile

The Flutter client (iOS + Android) of Langdle. It calls the same REST API as
the web app in this repository and shares its translations, flags and design.

The rules for working on it are in
[`.agents/MOBILE.md`](../.agents/MOBILE.md).

```bash
flutter pub get
flutter run                                   # against `pnpm dev` at localhost:3000
adb reverse tcp:3000 tcp:3000                 # Android: reach the dev server over USB
flutter run --dart-define-from-file=env.json     # with the defines in env.json
flutter run --dart-define=API_BASE_URL=https://…
flutter analyze && flutter test
dart run tool/sync_shared.dart                # after changing messages/ or public/flags
```

## Configuration

The build defines live in `env.json`, which git ignores. Create it from the
template and fill it in:

```bash
cp env.example.json env.json
flutter run --dart-define-from-file=env.json
```

| Key | Value |
| --- | --- |
| `API_BASE_URL` | API host; empty means `http://localhost:3000` |
| `FLAGS_BASE_URL` | the web's `NEXT_PUBLIC_FLAGS_URL` (flags bucket) |
| `GOOGLE_SERVER_CLIENT_ID` | the web OAuth client, the API's `GOOGLE_CLIENT_ID` |
| `GOOGLE_IOS_CLIENT_ID` | the iOS OAuth client (iOS only) |

For release builds keep a second file, `env.prod.json` (also ignored), with
`API_BASE_URL` set to the production host.

Without the Google ids the Google button is hidden. See
[`.agents/MOBILE.md`](../.agents/MOBILE.md) for the details.

## Release builds

```bash
# Android APK (the file linked from the web download button)
flutter build apk --release --dart-define-from-file=env.prod.json \
  -Plangdle.appLinkHost=<production host>
# -> build/app/outputs/flutter-apk/app-release.apk

# Android App Bundle (Play Store)
flutter build appbundle --release --dart-define-from-file=env.prod.json \
  -Plangdle.appLinkHost=<production host>
# -> build/app/outputs/bundle/release/app-release.aab

# iOS (macOS + paid Apple team; set APP_LINK_HOST and
# GOOGLE_REVERSED_CLIENT_ID in ios/Flutter/Release.xcconfig first)
flutter build ipa --release --dart-define-from-file=env.prod.json
# -> build/ios/ipa/
```

Release builds are signed with `android/key.properties` (see
[`.agents/MOBILE.md`](../.agents/MOBILE.md#release-signing)); without it they
fall back to the debug key. The version comes from `version:` in
`pubspec.yaml`: raise the build number (`+N`) on every release.
