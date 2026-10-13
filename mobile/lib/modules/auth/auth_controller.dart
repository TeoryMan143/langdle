import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/api/api_client.dart';
import '../../core/i18n/translations.dart';
import 'auth_models.dart';
import 'auth_repository.dart';
import 'native_oauth.dart';

/// The session of the whole app: the web `AuthProvider` (`use-auth.tsx`).
///
/// It signs every [ApiClient] request while a session is open, keeps the
/// session in the keychain across launches and follows the renewals the API
/// reports. The router listens to it to guard `/account`.
class AuthController extends ChangeNotifier implements ApiSession {
  AuthController({
    required ApiClient api,
    required AuthRepository repository,
    required this._store,
    NativeOAuth? oauth,
  }) : _repo = repository,
       _oauth = oauth ?? NativeOAuth() {
    api.session = this;
  }

  final AuthRepository _repo;
  final SessionStore _store;
  final NativeOAuth _oauth;

  AuthSession? _session;
  bool _busy = false;
  final _signedIn = ValueNotifier(false);

  AuthUser? get user => _session?.user;
  bool get signedIn => _session != null;

  /// Notifies only when the user signs in or out, unlike the controller,
  /// which also notifies for [busy] and user refreshes. The router's guard.
  ValueListenable<bool> get signedInChanges => _signedIn;

  /// An auth operation is running: the forms disable their buttons.
  bool get busy => _busy;

  bool get googleAvailable => _oauth.googleAvailable;
  Future<bool> appleAvailable() => _oauth.appleAvailable();

  @override
  String? get token => _session?.token;

  /// Opens the stored session, if it has not expired, and refreshes its user
  /// in the background. A revoked session is closed by that request.
  Future<void> restore() async {
    final stored = await _store.read();

    if (stored == null) {
      return;
    }

    if (stored.isExpired()) {
      await _store.clear();
      return;
    }

    _session = stored;
    _signedIn.value = true;
    notifyListeners();
    unawaited(refreshUser());
  }

  /// Reloads the user (`GET /auth/me`). Failures keep the cached one: an
  /// offline launch still shows the account.
  Future<void> refreshUser() async {
    final token = this.token;

    if (token == null) return;

    try {
      final user = await _repo.me();
      final session = _session;

      if (session != null && session.token == token) {
        await _open(session.copyWith(user: user));
      }
    } on ApiException catch (e) {
      debugPrint('User not refreshed: $e');
    }
  }

  /// Takes the user another module's endpoint answered after changing it
  /// (the profile), so every screen shows the new data.
  Future<void> updateUser(AuthUser user) async {
    final session = _session;

    if (session != null && session.user.id == user.id) {
      await _open(session.copyWith(user: user));
    }
  }

  Future<void> signIn({required String nickname, required String password}) =>
      _run(() async {
        await _open(await _repo.signIn(nickname: nickname, password: password));
      });

  Future<void> signUp({
    required String nickname,
    required String email,
    required String password,
    required String confirmPassword,
    required String country,
  }) => _run(() async {
    await _open(
      await _repo.signUp(
        nickname: nickname,
        email: email,
        password: password,
        confirmPassword: confirmPassword,
        country: country,
      ),
    );
  });

  /// Signs in through Google or Apple. Answers `null` when the user
  /// cancelled, [OAuthSignedIn] once the session is open, and
  /// [OAuthNeedsSignup] for an account that still has to pick a nickname and
  /// a country ([completeOAuthSignUp]).
  ///
  /// Throws [OAuthProviderException] when the provider or the API rejected the
  /// identity, and [ApiException] for the other API failures.
  Future<OAuthResult?> signInWith(OAuthProvider provider) => _run(() async {
    final credential = await _oauth.signIn(provider);

    if (credential == null) {
      return null;
    }

    final OAuthResult result;

    try {
      result = await _repo.oauthToken(
        provider,
        idToken: credential.idToken,
        nickname: credential.nickname,
      );
    } on ApiException catch (e) {
      // The token was not accepted (wrong audience, expired): to the user
      // that is the provider failing, not a broken sign up link.
      if (e.key == 'invalidToken') {
        throw OAuthProviderException(provider, e);
      }
      rethrow;
    }

    if (result case OAuthSignedIn(:final session)) {
      await _open(session);
    }

    return result;
  });

  /// Creates the account an [OAuthNeedsSignup] left pending. An empty
  /// [nickname] keeps the provider's name.
  Future<void> completeOAuthSignUp(
    OAuthSignupData data, {
    required String nickname,
    required String country,
  }) => _run(() async {
    await _open(
      await _repo.oauthSignUp(
        dataToken: data.dataToken,
        nickname: nickname,
        country: country,
      ),
    );
  });

  /// Always signs out on this device, even when the API cannot be told.
  Future<void> signOut() => _run(() async {
    try {
      await _repo.signOut();
    } on ApiException catch (e) {
      debugPrint('Sign out not sent: $e');
    }

    await _oauth.signOut();
    await _close();
  });

  /// Deletes the account and everything it owns. Throws when the API did not
  /// delete it, leaving the session open.
  Future<void> deleteAccount() => _run(() async {
    await _repo.deleteAccount();
    await _oauth.signOut();
    await _close();
  });

  @override
  void renewed(String token, DateTime expiresAt) {
    final session = _session;

    if (session == null ||
        session.token != token ||
        session.expiresAt.isAtSameMomentAs(expiresAt)) {
      return;
    }

    _session = session.copyWith(expiresAt: expiresAt);
    unawaited(_store.write(_session!));
  }

  @override
  void rejected(String token) {
    if (_session?.token == token) {
      unawaited(_close());
    }
  }

  Future<T> _run<T>(Future<T> Function() operation) async {
    _busy = true;
    notifyListeners();

    try {
      return await operation();
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  Future<void> _open(AuthSession session) async {
    _session = session;
    _signedIn.value = true;
    notifyListeners();
    await _store.write(session);
  }

  Future<void> _close() async {
    _session = null;
    _signedIn.value = false;
    notifyListeners();
    await _store.clear();
  }

  @override
  void dispose() {
    _signedIn.dispose();
    super.dispose();
  }
}

/// The message key for a failed auth operation: the API's `key` under
/// `AuthPage.errors` when it has one, the connection or provider message for
/// failures that never got an answer.
String authErrorKey(LocaleController locale, Object error) {
  if (error is OAuthProviderException) {
    return 'Mobile.oauthFailed';
  }

  if (error is! ApiException) {
    return 'AuthPage.errors.unknown';
  }

  if (error.isNetwork) {
    return 'Mobile.connectionError';
  }

  final key = 'AuthPage.errors.${error.key}';

  return locale.maybe(key) != null ? key : 'AuthPage.errors.unknown';
}
