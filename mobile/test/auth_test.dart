import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:langdle_app/core/api/api_client.dart';
import 'package:langdle_app/modules/auth/auth_controller.dart';
import 'package:langdle_app/modules/auth/auth_models.dart';
import 'package:langdle_app/modules/auth/auth_repository.dart';
import 'package:langdle_app/modules/auth/widgets/country_field.dart';

const _user = {
  'id': '5b0c1f4e-0000-4000-8000-000000000001',
  'nickname': 'teo',
  'email': 'teo@example.com',
  'googleId': null,
  'appleId': 'apple-sub',
  'country': 'ES',
  'admin': false,
  'nativeLanguage': 'es',
  'fluent': 'en,pt',
};

const _payload = {
  'user': _user,
  'token': 'session-token',
  'expiresAt': '2026-11-12T10:00:00.000Z',
};

/// The keychain, in memory.
class _MemoryStore extends SessionStore {
  AuthSession? saved;

  @override
  Future<AuthSession?> read() async => saved;

  @override
  Future<void> write(AuthSession session) async => saved = session;

  @override
  Future<void> clear() async => saved = null;
}

http.Response _json(
  Object body, {
  int status = 200,
  Map<String, String> headers = const {},
}) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json', ...headers},
);

void main() {
  group('models', () {
    test('AuthSession reads the auth payload and survives a round trip', () {
      final session = AuthSession.fromJson(_payload);

      expect(session.token, 'session-token');
      expect(session.expiresAt, DateTime.utc(2026, 11, 12, 10));
      expect(session.user.nickname, 'teo');
      expect(session.user.appleId, 'apple-sub');
      expect(session.user.googleId, isNull);

      final copy = AuthSession.fromJson(session.toJson());
      expect(copy.expiresAt, session.expiresAt);
      expect(copy.user.fluent, 'en,pt');
    });

    test('an expired session is detected', () {
      final session = AuthSession.fromJson(_payload);

      expect(session.isExpired(DateTime.utc(2026, 11, 12, 9)), isFalse);
      expect(session.isExpired(DateTime.utc(2026, 11, 12, 10)), isTrue);
    });

    test('OAuthResult tells a session from a pending sign up', () {
      final signedIn = OAuthResult.fromJson({
        'status': 'signedIn',
        ..._payload,
      });
      final pending = OAuthResult.fromJson({
        'status': 'needsSignup',
        'dataToken': 'jwe',
        'nickname': 'Teo',
        'email': 'teo@example.com',
      });

      expect(signedIn, isA<OAuthSignedIn>());
      expect((signedIn as OAuthSignedIn).session.token, 'session-token');
      expect(pending, isA<OAuthNeedsSignup>());
      expect((pending as OAuthNeedsSignup).data.dataToken, 'jwe');
    });

    test('ApiException exposes the zod field errors', () {
      const error = ApiException(
        status: 400,
        key: 'invalidData',
        message: 'An error occurred parsing the body data',
        errors: {
          'formErrors': [],
          'fieldErrors': {
            'nickname': ['Nickname must be at least 3 characters long'],
            'confirmPassword': ['Passwords do not match'],
          },
        },
      );

      expect(error.fieldErrors['nickname'], [
        'Nickname must be at least 3 characters long',
      ]);
      expect(error.fieldErrors['confirmPassword'], ['Passwords do not match']);
      expect(const ApiException.network().fieldErrors, isEmpty);
    });

    test('countryFlag builds the regional indicator pair', () {
      expect(countryFlag('ES'), '🇪🇸');
      expect(countryFlag('br'), '🇧🇷');
      expect(countryFlag('E1'), '');
    });
  });

  group('AuthController', () {
    late List<http.Request> requests;
    late http.Response Function(http.Request) respond;
    late _MemoryStore store;
    late AuthController auth;

    setUp(() {
      requests = [];
      respond = (_) => _json({'key': 'unknown', 'message': '?'}, status: 500);
      store = _MemoryStore();
      final api = ApiClient(
        baseUrl: 'http://api.test',
        client: MockClient((request) async {
          requests.add(request);
          return respond(request);
        }),
      );
      auth = AuthController(
        api: api,
        repository: AuthRepository(api),
        store: store,
      );
    });

    test('signs in, stores the session and signs later requests', () async {
      respond = (request) => switch (request.url.path) {
        '/api/auth/signin' => _json(_payload),
        _ => _json(_user),
      };

      await auth.signIn(nickname: 'teo', password: 'secret123');

      expect(auth.signedIn, isTrue);
      expect(auth.signedInChanges.value, isTrue);
      expect(store.saved?.token, 'session-token');
      expect(jsonDecode(requests.single.body), {
        'nickname': 'teo',
        'password': 'secret123',
      });
      expect(requests.single.headers['authorization'], isNull);

      await auth.refreshUser();

      expect(requests.last.url.path, '/api/auth/me');
      expect(requests.last.headers['authorization'], 'Bearer session-token');
    });

    test('a failed sign in keeps the user signed out', () async {
      respond = (_) => _json({
        'key': 'invalidUserPassword',
        'message': 'Invalid nickname or password',
      }, status: 401);

      await expectLater(
        auth.signIn(nickname: 'teo', password: 'wrong'),
        throwsA(
          isA<ApiException>().having(
            (e) => e.key,
            'key',
            'invalidUserPassword',
          ),
        ),
      );
      expect(auth.signedIn, isFalse);
      expect(auth.busy, isFalse);
    });

    test('follows the renewed expiry the API reports', () async {
      store.saved = AuthSession.fromJson(_payload)
          .copyWith(expiresAt: DateTime.now().add(const Duration(days: 2)));
      final renewed = DateTime.now()
          .add(const Duration(days: 30))
          .toUtc()
          .copyWith(microsecond: 0);
      respond = (_) => _json(
        _user,
        headers: {'x-session-expires-at': renewed.toIso8601String()},
      );

      await auth.restore();
      await auth.refreshUser();

      expect(auth.signedIn, isTrue);
      expect(store.saved?.expiresAt, renewed);
    });

    test('a rejected session signs the user out', () async {
      store.saved = AuthSession.fromJson(_payload)
          .copyWith(expiresAt: DateTime.now().add(const Duration(days: 2)));
      respond = (_) => _json({
        'key': 'notSignedIn',
        'message': 'Must be signed in',
      }, status: 401);

      await auth.restore();
      expect(auth.signedIn, isTrue);

      await auth.refreshUser();

      expect(auth.signedIn, isFalse);
      expect(store.saved, isNull);
    });

    test('an expired stored session is dropped without a request', () async {
      store.saved = AuthSession.fromJson(
        _payload,
      ).copyWith(expiresAt: DateTime.now().subtract(const Duration(days: 1)));

      await auth.restore();

      expect(auth.signedIn, isFalse);
      expect(store.saved, isNull);
      expect(requests, isEmpty);
    });

    test('signing out works even when the API cannot be reached', () async {
      respond = (_) => _json(_payload);
      await auth.signIn(nickname: 'teo', password: 'secret123');
      respond = (_) => throw http.ClientException('offline');

      await auth.signOut();

      expect(requests.last.url.path, '/api/auth/signout');
      expect(auth.signedIn, isFalse);
      expect(store.saved, isNull);
    });

    test('finishing an OAuth sign up opens the session', () async {
      respond = (_) => _json(_payload, status: 201);

      await auth.completeOAuthSignUp(
        const OAuthSignupData(dataToken: 'jwe', nickname: 'Teo', email: ''),
        nickname: '',
        country: 'ES',
      );

      expect(requests.single.url.path, '/api/auth/oauth/signup');
      expect(jsonDecode(requests.single.body), {
        'dataToken': 'jwe',
        'nickname': '',
        'country': 'ES',
      });
      expect(auth.signedIn, isTrue);
    });
  });
}
