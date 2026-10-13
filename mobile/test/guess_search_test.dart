import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:langdle_app/core/api/api_client.dart';
import 'package:langdle_app/core/i18n/translations.dart';
import 'package:langdle_app/modules/auth/auth_controller.dart';
import 'package:langdle_app/modules/auth/auth_repository.dart';
import 'package:langdle_app/modules/lang_data/lang_repository.dart';
import 'package:langdle_app/modules/lang_guess/game_controller.dart';
import 'package:langdle_app/modules/lang_guess/guess_models.dart';
import 'package:langdle_app/modules/lang_guess/guess_repository.dart';
import 'package:langdle_app/modules/lang_guess/widgets/game_view.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Enough languages for the results list to overflow and scroll.
final _languages = [
  for (var i = 0; i < 30; i++)
    {
      'id': 'l$i',
      'name': 'Language $i',
      'features': <String>[],
      'partial': <String>[],
      'searchParams': ['language $i'],
      'active': true,
    },
];

ApiClient _fakeApi() => ApiClient(
  baseUrl: 'http://test',
  client: MockClient((request) async {
    final body = switch (request.url.path) {
      '/api/lang/random' => _languages.first,
      '/api/lang' => _languages,
      _ => null,
    };

    return body == null
        ? http.Response('{"key":"notFound","message":"x"}', 404)
        : http.Response(jsonEncode(body), 200);
  }),
);

Future<void> _pumpGame(WidgetTester tester) async {
  final api = _fakeApi();
  final locale = LocaleController();
  await tester.runAsync(locale.load);

  await tester.pumpWidget(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: locale),
        Provider(create: (_) => LangRepository(api)),
        Provider(create: (_) => GuessRepository(api)),
        Provider(create: (_) => DailySaveStore()),
        ChangeNotifierProvider(
          create: (context) => GameController(
            type: GameType.random,
            langs: context.read<LangRepository>(),
            guesses: context.read<GuessRepository>(),
            saves: context.read<DailySaveStore>(),
            auth: AuthController(
              api: api,
              repository: AuthRepository(api),
              store: SessionStore(),
            ),
          ),
        ),
      ],
      child: const MaterialApp(home: Scaffold(body: GameView())),
    ),
  );

  // Lets the fake API answer and the game leave its loading state.
  await tester.runAsync(() => Future<void>.delayed(Duration.zero));
  await tester.pumpAndSettle();
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('scrolling the results keeps the field focused and the list '
      'open', (tester) async {
    await _pumpGame(tester);

    await tester.tap(find.byType(TextField));
    await tester.pumpAndSettle();

    expect(find.text('Language 0'), findsOneWidget);

    await tester.drag(find.text('Language 10'), const Offset(0, -150));
    await tester.pumpAndSettle();

    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.focusNode!.hasFocus, isTrue);
    expect(find.text('Language 0'), findsNothing, reason: 'list scrolled');
    expect(find.textContaining('Language'), findsWidgets);
  });

  testWidgets('tapping a result selects it and closes the list', (
    tester,
  ) async {
    await _pumpGame(tester);

    await tester.tap(find.byType(TextField));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Language 1'));
    await tester.pumpAndSettle();

    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.controller!.text, 'Language 1');
    expect(field.focusNode!.hasFocus, isFalse);
    expect(find.text('Language 3'), findsNothing);
  });
}
