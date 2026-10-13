import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/api/api_client.dart';
import 'auth_models.dart';

/// The auth endpoints (`/api/auth`).
class AuthRepository {
  AuthRepository(this._api);

  final ApiClient _api;

  Future<AuthSession> signIn({
    required String nickname,
    required String password,
  }) async => AuthSession.fromJson(
    await _api.post(
      '/auth/signin',
      body: {'nickname': nickname, 'password': password},
    ) as Map<String, dynamic>,
  );

  Future<AuthSession> signUp({
    required String nickname,
    required String email,
    required String password,
    required String confirmPassword,
    required String country,
  }) async => AuthSession.fromJson(
    await _api.post(
      '/auth/signup',
      body: {
        'nickname': nickname,
        'email': email,
        'password': password,
        'confirmPassword': confirmPassword,
        'country': country,
      },
    ) as Map<String, dynamic>,
  );

  /// Exchanges the ID token a native Google / Apple SDK returned. Apple only
  /// gives the user's name to the app, so it travels as [nickname].
  Future<OAuthResult> oauthToken(
    OAuthProvider provider, {
    required String idToken,
    String? nickname,
  }) async => OAuthResult.fromJson(
    await _api.post(
      '/auth/${provider.name}/token',
      body: {'idToken': idToken, 'nickname': ?nickname},
    ) as Map<String, dynamic>,
  );

  /// Finishes a Google / Apple sign up. An empty [nickname] keeps the one
  /// from the provider.
  Future<AuthSession> oauthSignUp({
    required String dataToken,
    required String nickname,
    required String country,
  }) async => AuthSession.fromJson(
    await _api.post(
      '/auth/oauth/signup',
      body: {'dataToken': dataToken, 'nickname': nickname, 'country': country},
    ) as Map<String, dynamic>,
  );

  Future<AuthUser> me() async =>
      AuthUser.fromJson(await _api.get('/auth/me') as Map<String, dynamic>);

  Future<void> signOut() => _api.post('/auth/signout');

  Future<void> deleteAccount() => _api.delete('/auth/me');
}

/// Keeps the session across launches in the platform keychain (Keychain on
/// iOS, Keystore backed storage on Android), never in shared preferences.
class SessionStore {
  SessionStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'session';

  final FlutterSecureStorage _storage;

  Future<AuthSession?> read() async {
    try {
      final raw = await _storage.read(key: _key);

      return raw == null
          ? null
          : AuthSession.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (e) {
      debugPrint('Stored session unreadable: $e');
      await clear();
      return null;
    }
  }

  Future<void> write(AuthSession session) async {
    try {
      await _storage.write(key: _key, value: jsonEncode(session.toJson()));
    } catch (e) {
      // The session still works for this run, it just will not survive it.
      debugPrint('Session not stored: $e');
    }
  }

  Future<void> clear() async {
    try {
      await _storage.delete(key: _key);
    } catch (e) {
      debugPrint('Stored session not deleted: $e');
    }
  }
}
