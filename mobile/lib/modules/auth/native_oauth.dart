import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../../core/config.dart';
import 'auth_models.dart';

/// What a native provider SDK handed over, ready for
/// `POST /auth/{provider}/token`.
class OAuthCredential {
  const OAuthCredential({required this.idToken, this.nickname});

  final String idToken;

  /// The name Apple shares with the app on the first authorization only.
  final String? nickname;
}

/// The provider SDK failed for a reason other than the user cancelling.
class OAuthProviderException implements Exception {
  const OAuthProviderException(this.provider, this.cause);

  final OAuthProvider provider;
  final Object cause;

  @override
  String toString() => 'OAuthProviderException(${provider.name}): $cause';
}

/// The Google and Apple sign in SDKs. They only prove who the user is: the
/// ID token they return goes to the API, which verifies it and opens the
/// session.
class NativeOAuth {
  Future<void>? _googleReady;

  /// Google needs the web client id as the token audience, and on iOS its
  /// own client id too (see `AppConfig`).
  bool get googleAvailable =>
      AppConfig.googleServerClientId != null &&
      (Platform.isAndroid ||
          (Platform.isIOS && AppConfig.googleIosClientId != null));

  /// Only the native Apple flow: on Android it needs a web callback the API
  /// does not have.
  Future<bool> appleAvailable() async {
    if (!Platform.isIOS) return false;

    try {
      return await SignInWithApple.isAvailable();
    } catch (_) {
      return false;
    }
  }

  /// `null` when the user cancelled.
  Future<OAuthCredential?> signIn(OAuthProvider provider) => switch (provider) {
    OAuthProvider.google => _google(),
    OAuthProvider.apple => _apple(),
  };

  /// The SDK must be initialized exactly once before any other call.
  Future<void> _initGoogle() =>
      _googleReady ??= GoogleSignIn.instance.initialize(
        clientId: Platform.isIOS ? AppConfig.googleIosClientId : null,
        serverClientId: AppConfig.googleServerClientId,
      );

  Future<OAuthCredential?> _google() async {
    try {
      await _initGoogle();

      final account = await GoogleSignIn.instance.authenticate();
      final idToken = account.authentication.idToken;

      if (idToken == null) {
        throw const OAuthProviderException(OAuthProvider.google, 'no idToken');
      }

      return OAuthCredential(idToken: idToken);
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) return null;
      throw OAuthProviderException(OAuthProvider.google, e);
    } on OAuthProviderException {
      rethrow;
    } catch (e) {
      throw OAuthProviderException(OAuthProvider.google, e);
    }
  }

  Future<OAuthCredential?> _apple() async {
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );
      final idToken = credential.identityToken;

      if (idToken == null) {
        throw const OAuthProviderException(OAuthProvider.apple, 'no idToken');
      }

      final name = [
        credential.givenName,
        credential.familyName,
      ].whereType<String>().join(' ').trim();

      return OAuthCredential(
        idToken: idToken,
        nickname: name.isEmpty ? null : name,
      );
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) return null;
      throw OAuthProviderException(OAuthProvider.apple, e);
    } on OAuthProviderException {
      rethrow;
    } catch (e) {
      throw OAuthProviderException(OAuthProvider.apple, e);
    }
  }

  /// Forgets the Google account, so the next sign in offers the picker again.
  /// Apple keeps no state in the app.
  Future<void> signOut() async {
    if (!googleAvailable) return;

    try {
      await _initGoogle();
      await GoogleSignIn.instance.signOut();
    } catch (e) {
      debugPrint('Google sign out failed: $e');
    }
  }
}
