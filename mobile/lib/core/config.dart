/// Build time configuration.
///
/// The API host comes from `--dart-define=API_BASE_URL=https://…`. Without it
/// the app targets the local `pnpm dev` server at `localhost:3000`. On
/// Android, phones and emulators alike reach it through `adb reverse`:
///
///   adb reverse tcp:3000 tcp:3000
///
/// Google sign in needs two more defines (see `MOBILE.md`):
/// `GOOGLE_SERVER_CLIENT_ID`, the web OAuth client id the API knows as
/// `GOOGLE_CLIENT_ID` (the audience of the ID token), and on iOS
/// `GOOGLE_IOS_CLIENT_ID`. Without them the Google button is hidden.
abstract final class AppConfig {
  static const _apiBaseUrl = String.fromEnvironment('API_BASE_URL');

  static String get apiBaseUrl =>
      _apiBaseUrl.isNotEmpty ? _apiBaseUrl : 'http://localhost:3000';

  static const _googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
  );
  static const _googleIosClientId = String.fromEnvironment(
    'GOOGLE_IOS_CLIENT_ID',
  );

  static String? get googleServerClientId =>
      _googleServerClientId.isNotEmpty ? _googleServerClientId : null;

  static String? get googleIosClientId =>
      _googleIosClientId.isNotEmpty ? _googleIosClientId : null;
}
