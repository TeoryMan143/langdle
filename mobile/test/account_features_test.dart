import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:langdle_app/core/api/api_client.dart';
import 'package:langdle_app/core/models/language.dart';
import 'package:langdle_app/modules/auth/auth_controller.dart';
import 'package:langdle_app/modules/auth/auth_models.dart';
import 'package:langdle_app/modules/auth/auth_repository.dart';
import 'package:langdle_app/modules/auth/auth_routes.dart';
import 'package:langdle_app/modules/lang_data/lang_repository.dart';
import 'package:langdle_app/modules/lang_data/permission_controller.dart';
import 'package:langdle_app/modules/lang_guess/game_controller.dart';
import 'package:langdle_app/modules/lang_guess/guess_models.dart';
import 'package:langdle_app/modules/lang_guess/guess_repository.dart';
import 'package:langdle_app/modules/lang_guess/history_controller.dart';
import 'package:langdle_app/modules/user_profile/profile_controller.dart';
import 'package:langdle_app/modules/user_profile/profile_repository.dart';
import 'package:langdle_app/router.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _user = {
  'id': 'u1',
  'nickname': 'teo',
  'email': 'teo@example.com',
  'country': 'ES',
  'admin': false,
  'nativeLanguage': null,
  'fluent': 'en',
};

const _languages = [
  {'id': 'de', 'name': 'Deutsch', 'searchParams': <String>[]},
  {'id': 'en', 'name': 'English', 'searchParams': <String>[]},
  {'id': 'es', 'name': 'Español', 'searchParams': <String>[]},
];

class _MemoryStore extends SessionStore {
  @override
  Future<AuthSession?> read() async => null;

  @override
  Future<void> write(AuthSession session) async {}

  @override
  Future<void> clear() async {}
}

/// A fake API answering by `METHOD /path`, recording every request.
class _FakeApi {
  _FakeApi(this.routes);

  final Map<String, Object? Function(http.Request)> routes;
  final requests = <http.Request>[];

  late final client = ApiClient(
    baseUrl: 'http://test',
    client: MockClient((request) async {
      requests.add(request);
      final route = routes['${request.method} ${request.url.path}'];
      final body = route?.call(request);

      return body is http.Response
          ? body
          : body == null
          ? http.Response('{"key":"notFound","message":"x"}', 404)
          : http.Response(jsonEncode(body), 200);
    }),
  );

  Iterable<http.Request> called(String method, String path) =>
      requests.where((r) => r.method == method && r.url.path == path);
}

Future<AuthController> _signedIn(_FakeApi api) async {
  final auth = AuthController(
    api: api.client,
    repository: AuthRepository(api.client),
    store: _MemoryStore(),
  );
  api.routes['POST /api/auth/signin'] = (_) => {
    'user': _user,
    'token': 't',
    'expiresAt': DateTime.now().add(const Duration(days: 30)).toIso8601String(),
  };
  await auth.signIn(nickname: 'teo', password: 'secret123');
  return auth;
}

/// Lets the controllers' own async work run.
Future<void> _settle() => Future<void>.delayed(Duration.zero);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('game history', () {
    test('GameRecord reads the API row and writes the request body', () {
      final record = GameRecord.fromJson({
        'id': 'g1',
        'userId': 'u1',
        'date': '2026-10-13',
        'type': 'random',
        'targetLang': 'es',
        'guesses': 3,
        'guessed': true,
      });

      expect(record.type, GameType.random);
      expect(record.date, '2026-10-13');
      expect(record.toRequest(), {
        'type': 'random',
        'targetLang': 'es',
        'guesses': 3,
        'guessed': true,
      });
    });

    Future<(_FakeApi, GameController)> play({required bool signIn}) async {
      final api = _FakeApi({
        'GET /api/lang/random': (_) => _languages[2],
        'GET /api/lang': (_) => _languages,
        'GET /api/guess/de': (_) => {
          'correct': <String>[],
          'partial': <String>[],
          'incorrect': ['tones'],
        },
        'PUT /api/guess/history': (r) => {'id': 'g1', ...jsonDecode(r.body)},
      });
      final auth = signIn
          ? await _signedIn(api)
          : AuthController(
              api: api.client,
              repository: AuthRepository(api.client),
              store: _MemoryStore(),
            );
      final game = GameController(
        type: GameType.random,
        langs: LangRepository(api.client),
        guesses: GuessRepository(api.client),
        saves: DailySaveStore(),
        auth: auth,
      );
      await game.start();

      game.select(const Language(id: 'de', name: 'Deutsch'));
      await game.guess();
      game.select(const Language(id: 'es', name: 'Español'));
      expect(await game.guess(), GuessOutcome.won);
      await _settle();

      return (api, game);
    }

    test('a finished game is stored for a signed in user', () async {
      final (api, game) = await play(signIn: true);

      final saved = api.called('PUT', '/api/guess/history').single;
      expect(saved.headers['authorization'], 'Bearer t');
      expect(jsonDecode(saved.body), {
        'type': 'random',
        'targetLang': 'es',
        'guesses': 2,
        'guessed': true,
      });
      game.dispose();
    });

    test('nothing is stored signed out', () async {
      final (api, game) = await play(signIn: false);

      expect(api.called('PUT', '/api/guess/history'), isEmpty);
      game.dispose();
    });

    test('the history reloads when a game is stored', () async {
      var stored = <Map<String, Object?>>[];
      final api = _FakeApi({
        'GET /api/guess/history': (_) => stored,
        'GET /api/lang': (_) => _languages,
      });
      final guesses = GuessRepository(api.client);
      final history = HistoryController(
        guesses: guesses,
        langs: LangRepository(api.client),
      );
      await _settle();
      expect(history.records, isEmpty);

      stored = [
        {
          'id': 'g1',
          'date': '2026-10-13',
          'type': 'daily',
          'targetLang': 'es',
          'guesses': 5,
          'guessed': false,
        },
      ];
      api.routes['PUT /api/guess/history'] = (_) => stored.first;
      await guesses.saveHistory(
        const GameRecord(
          type: GameType.daily,
          targetLang: 'es',
          guesses: 5,
          guessed: false,
        ),
      );
      await _settle();

      expect(history.records?.single.targetLang, 'es');
      expect(history.language('es')?.name, 'Español');
      history.dispose();
    });
  });

  group('profile', () {
    test('edits send the whole list and update the signed in user', () async {
      final api = _FakeApi({
        'GET /api/lang': (_) => _languages,
        'PUT /api/user/fluent': (r) => {
          'updated': {
            ..._user,
            'fluent': (jsonDecode(r.body)['fluent'] as List).join(','),
          },
        },
        'PUT /api/user/native-lang': (r) => {
          'updated': {
            ..._user,
            'nativeLanguage': jsonDecode(r.body)['nativeLang'],
          },
        },
      });
      final auth = await _signedIn(api);
      final profile = ProfileController(
        auth: auth,
        langs: LangRepository(api.client),
        profile: ProfileRepository(api.client),
      );
      await _settle();

      expect(profile.fluentIds, ['en']);
      expect(profile.language('en')?.name, 'English');

      await profile.addFluent(const Language(id: 'de', name: 'Deutsch'));
      expect(jsonDecode(api.requests.last.body), {
        'fluent': ['en', 'de'],
      });
      expect(auth.user?.fluent, 'en,de');

      await profile.removeFluent('en');
      expect(profile.fluentIds, ['de']);

      await profile.setNative(const Language(id: 'es', name: 'Español'));
      expect(auth.user?.nativeLanguage, 'es');
      profile.dispose();
    });
  });

  group('permission links', () {
    test('a claimed link names the granted language', () async {
      final api = _FakeApi({
        'PUT /api/lang/permissions/claim/abc': (_) => {'lang': 'es'},
        'GET /api/lang/es': (_) => _languages[2],
      });
      final claim = PermissionController(
        token: 'abc',
        langs: LangRepository(api.client),
      );
      await _settle();
      await _settle();

      expect(claim.status, ClaimStatus.granted);
      expect(claim.language?.name, 'Español');
      claim.dispose();
    });

    test('the API key of a refused link is shown, without retry', () async {
      final api = _FakeApi({
        'PUT /api/lang/permissions/claim/old': (_) => http.Response(
          '{"key":"tokenExpired","message":"Permission could not be set"}',
          400,
        ),
      });
      final claim = PermissionController(
        token: 'old',
        langs: LangRepository(api.client),
      );
      await _settle();

      expect(claim.status, ClaimStatus.failed);
      expect(claim.errorKey, 'AddPermissionPage.errors.tokenExpired');
      expect(claim.canRetry, isFalse);
      claim.dispose();
    });

    test('a link without a token fails without a request', () async {
      final api = _FakeApi({});
      final claim = PermissionController(
        token: null,
        langs: LangRepository(api.client),
      );
      await _settle();

      expect(claim.status, ClaimStatus.failed);
      expect(claim.errorKey, 'AddPermissionPage.errors.tokenNotFound');
      expect(api.requests, isEmpty);
      claim.dispose();
    });

    group('routeRedirect', () {
      String? go(String location, {bool signedIn = false, Object? extra}) =>
          routeRedirect(Uri.parse(location), signedIn: signedIn, extra: extra);

      test('a web link loses its locale prefix', () {
        expect(go('/es/addpermission?token=x'), '/addpermission?token=x');
        expect(go('/pt'), '/');
        expect(go('/esperanto'), isNull);
      });

      test('a signed out user signs up before claiming', () {
        expect(go('/addpermission?token=x'), '/signup?redtk=x');
        expect(go('/addpermission'), isNull);
        expect(go('/account'), '/signin');
        expect(go('/endgoogle?redtk=x'), '/signin?redtk=x');
        expect(go('/signup?redtk=x'), isNull);
      });

      test('signing in returns to the link, or to the account', () {
        expect(go('/signup?redtk=x', signedIn: true), '/addpermission?token=x');
        expect(
          go('/endgoogle?redtk=x', signedIn: true),
          '/addpermission?token=x',
        );
        expect(go('/signin', signedIn: true), '/account');
        expect(go('/addpermission?token=x', signedIn: true), isNull);
      });
    });

    test('the token survives the trip through the sign in screens', () {
      expect(withRedirectToken('/signup', 'a b'), '/signup?redtk=a+b');
      expect(withRedirectToken('/signin', null), '/signin');
      expect(addPermissionPath('a b'), '/addpermission?token=a+b');
      expect(
        Uri.parse(withRedirectToken('/signup', 'a b')).queryParameters['redtk'],
        'a b',
      );
    });
  });
}
