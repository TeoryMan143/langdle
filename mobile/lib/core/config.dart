/// Build time configuration.
///
/// The API host comes from `--dart-define=API_BASE_URL=https://…`. Without it
/// the app targets the local `pnpm dev` server at `localhost:3000`. On
/// Android, phones and emulators alike reach it through `adb reverse`:
///
///   adb reverse tcp:3000 tcp:3000
abstract final class AppConfig {
  static const _apiBaseUrl = String.fromEnvironment('API_BASE_URL');

  static String get apiBaseUrl =>
      _apiBaseUrl.isNotEmpty ? _apiBaseUrl : 'http://localhost:3000';
}
