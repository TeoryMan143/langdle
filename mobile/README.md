# Langdle mobile

The Flutter client (iOS + Android) of Langdle. It calls the same REST API as
the web app in this repository and shares its translations, flags and design.

The rules for working on it are in
[`.agents/MOBILE.md`](../.agents/MOBILE.md).

```bash
flutter pub get
flutter run                                   # against `pnpm dev` at localhost:3000
adb reverse tcp:3000 tcp:3000                 # Android: reach the dev server over USB
flutter run --dart-define=API_BASE_URL=https://…
flutter analyze && flutter test
dart run tool/sync_shared.dart                # after changing messages/ or public/flags
```
