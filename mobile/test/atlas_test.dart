import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:langdle_app/core/api/api_client.dart';
import 'package:langdle_app/core/i18n/translations.dart';
import 'package:langdle_app/modules/lang_atlas/atlas_controller.dart';
import 'package:langdle_app/modules/lang_data/lang_models.dart';
import 'package:langdle_app/modules/lang_data/lang_repository.dart';
import 'package:langdle_app/modules/lang_atlas/screens/atlas_screen.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

Map<String, dynamic> _language(String id) => {
  'id': id,
  'name': id,
  'features': ['svo'],
  'partial': <String>[],
  'searchParams': <String>[],
  'active': true,
};

const _summary = {
  'languages': 3,
  'activeLanguages': 2,
  'activeFeatures': 10,
  'partialFeatures': 4,
};

/// A fake API holding the languages `a`, `b` and `c`, in batches of two. It
/// records the page queries it was asked.
({LangRepository repo, List<Map<String, String>> pages}) _fake({
  bool failNextPages = false,
}) {
  final pages = <Map<String, String>>[];

  final api = ApiClient(
    baseUrl: 'http://test',
    client: MockClient((request) async {
      final query = request.url.queryParameters;
      Object? body;

      switch (request.url.path) {
        case '/api/lang/summary':
          body = _summary;
        case '/api/meta/features':
          body = {
            'groups': {
              'wordOrder': ['svo'],
            },
          };
        case '/api/lang/page':
          pages.add(query);
          final q = query['q'];
          final ids = ['a', 'b', 'c'].where((id) => q == null || id == q);

          if (query['cursor'] != null && failNextPages) {
            return http.Response('{"key":"unknown","message":"x"}', 500);
          }

          body = query['cursor'] == null
              ? {
                  'items': [for (final id in ids.take(2)) _language(id)],
                  'nextCursor': ids.length > 2 ? 'after-b' : null,
                  'total': ids.length,
                }
              : {
                  'items': [_language('c')],
                  'nextCursor': null,
                  'total': 3,
                };
      }

      return body == null
          ? http.Response('{"key":"notFound","message":"x"}', 404)
          : http.Response(
              jsonEncode(body),
              200,
              headers: {'content-type': 'application/json'},
            );
    }),
  );

  return (repo: LangRepository(api), pages: pages);
}

/// Lets the fake API answer and the controller notify.
Future<void> _settle() => Future<void>.delayed(Duration.zero);

void main() {
  group('models', () {
    test('LanguagePage reads a batch and its cursor', () {
      final page = LanguagePage.fromJson({
        'items': [_language('a')],
        'nextCursor': 'next',
        'total': 7,
      });

      expect(page.items.single.features, ['svo']);
      expect(page.nextCursor, 'next');
      expect(page.total, 7);
    });

    test('LanguagesSummary reads the counters', () {
      final summary = LanguagesSummary.fromJson(_summary);

      expect(summary.languages, 3);
      expect(summary.partialFeatures, 4);
    });
  });

  group('AtlasController', () {
    test('loads the counters and the first batch', () async {
      final fake = _fake();
      final atlas = AtlasController(langs: fake.repo);
      await _settle();

      expect(atlas.loading, isFalse);
      expect(atlas.summary!.activeLanguages, 2);
      expect(atlas.languages.map((l) => l.id), ['a', 'b']);
      expect(atlas.total, 3);
      expect(atlas.hasMore, isTrue);
      expect(fake.pages.single['limit'], '${LangRepository.pageSize}');
      expect(fake.pages.single['sort'], 'active');
    });

    test('appends the next batch, once at a time', () async {
      final fake = _fake();
      final atlas = AtlasController(langs: fake.repo);
      await _settle();

      await Future.wait([atlas.loadMore(), atlas.loadMore()]);

      expect(atlas.languages.map((l) => l.id), ['a', 'b', 'c']);
      expect(atlas.hasMore, isFalse);
      expect(fake.pages.map((query) => query['cursor']), [null, 'after-b']);
    });

    test('keeps the list and a retry when the next batch fails', () async {
      final fake = _fake(failNextPages: true);
      final atlas = AtlasController(langs: fake.repo);
      await _settle();

      await atlas.loadMore();

      expect(atlas.languages.map((l) => l.id), ['a', 'b']);
      expect(atlas.moreError, isA<ApiException>());
      expect(atlas.hasMore, isTrue);
    });

    test('asks the API once the typing pauses', () async {
      final fake = _fake();
      final atlas = AtlasController(langs: fake.repo);
      await _settle();

      atlas
        ..search('a')
        ..search('b');

      expect(atlas.searching, isTrue);
      await Future<void>.delayed(
        AtlasController.searchDebounce + const Duration(milliseconds: 50),
      );

      expect(fake.pages.map((query) => query['q']), [null, 'b']);
      expect(atlas.searching, isFalse);
      expect(atlas.languages.map((l) => l.id), ['b']);
      expect(atlas.total, 1);
      expect(atlas.hasMore, isFalse);
    });
  });

  testWidgets('the screen reads the next batch as the end comes in reach', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    GoogleFonts.config.allowRuntimeFetching = false;
    final fake = _fake();
    final locale = LocaleController();
    await tester.runAsync(locale.load);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: locale),
          ChangeNotifierProvider(
            create: (_) => AtlasController(langs: fake.repo),
          ),
        ],
        child: const MaterialApp(home: Scaffold(body: AtlasScreen())),
      ),
    );

    for (var i = 0; i < 3; i++) {
      await tester.runAsync(_settle);
      await tester.pump();
    }

    expect(fake.pages.map((query) => query['cursor']), [null, 'after-b']);
    await tester.scrollUntilVisible(
      find.text('c'),
      300,
      // The list's own, not the search field's.
      scrollable: find
          .descendant(
            of: find.byType(ListView),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    expect(find.text('c'), findsOneWidget);
  });
}
