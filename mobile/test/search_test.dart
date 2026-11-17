import 'package:flutter_test/flutter_test.dart';
import 'package:langdle_app/core/models/language.dart';
import 'package:langdle_app/core/search/search.dart';

// The same cases as the web's tests/core/search.test.ts: both clients and the
// API must rank a query the same way.
void main() {
  group('normalizeSearchText', () {
    test('drops case, accents and extra spaces', () {
      expect(normalizeSearchText('  Català '), 'catala');
      expect(normalizeSearchText('Ñandú   Guaraní'), 'nandu guarani');
    });

    test('folds every script the table covers', () {
      expect(normalizeSearchText('Ελληνικά'), 'ελληνικα');
      expect(normalizeSearchText('Tiếng Việt'), 'tieng viet');
      expect(normalizeSearchText('Українська'), 'украінська');
    });

    test('drops loose combining marks too', () {
      expect(normalizeSearchText('Café'), 'cafe');
    });
  });

  group('searchTerms', () {
    test('finds a language by its id and every name', () {
      expect(
        searchTerms(
          const LanguageName(
            id: 'spa',
            name: 'Spanish',
            exonym: 'Español',
            searchParams: ['Castellano', ''],
          ),
        ),
        ['spa', 'spanish', 'espanol', 'castellano'],
      );
    });

    test('adds the extra terms', () {
      expect(
        searchTerms(
          const LanguageName(id: 'de', name: 'German'),
          extra: ['Alemán'],
        ),
        ['de', 'german', 'aleman'],
      );
    });
  });

  group('typoDistance', () {
    test('counts letters added, removed and replaced', () {
      expect(typoDistance('spanish', 'spanish'), 0);
      expect(typoDistance('spanich', 'spanish'), 1);
      expect(typoDistance('spansh', 'spanish'), 1);
      expect(typoDistance('spannish', 'spanish'), 1);
      expect(typoDistance('', 'abc'), 3);
    });

    test('counts two neighbouring letters swapped as one typo', () {
      expect(typoDistance('spanihs', 'spanish'), 1);
      expect(typoDistance('psanish', 'spanish'), 1);
      expect(typoDistance('sapnihs', 'spanish'), 2);
    });
  });

  group('matchRank', () {
    test('ranks a whole term, then its start, a word start and anywhere', () {
      expect(matchRank(['ale'], 'ale'), 0);
      expect(matchRank(['aleut'], 'ale'), 1);
      expect(matchRank(['old ale'], 'ale'), 2);
      expect(matchRank(['kale'], 'ale'), 3);
      expect(matchRank(['zulu'], 'ale'), isNull);
    });

    test('keeps the best match among the terms', () {
      expect(matchRank(['kale', 'aleut', 'old ale'], 'ale'), 1);
    });

    test('forgives a typo per four letters typed, last', () {
      expect(matchRank(['spanish'], 'spanich'), 4);
      expect(matchRank(['spanish'], 'spanihs'), 4);
      expect(matchRank(['basque'], 'bsaq'), 4);
      expect(matchRank(['spanish'], 'spsni'), 4);
      expect(matchRank(['old english'], 'englsh'), 4);
      expect(matchRank(['spanish'], 'sponoch'), isNull);
    });

    test('forgives no typo below four letters', () {
      expect(matchRank(['ale'], 'alx'), isNull);
    });
  });

  group('rankByQuery', () {
    final items = [
      for (final name in ['kale', 'aleut', 'ale', 'zulu'])
        (item: name, terms: [name]),
    ];

    test('keeps every item, in order, without a query', () {
      expect(rankByQuery(items, '  '), ['kale', 'aleut', 'ale', 'zulu']);
    });

    test('keeps the matches, best first', () {
      expect(rankByQuery(items, 'ALE'), ['ale', 'aleut', 'kale']);
    });

    test('keeps the order of items of the same rank', () {
      final same = [
        for (final name in ['b-ale', 'a-ale', 'c-ale', 'd-ale', 'e-ale'])
          (item: name, terms: [name]),
      ];

      expect(rankByQuery(same, 'ale'), [
        'b-ale',
        'a-ale',
        'c-ale',
        'd-ale',
        'e-ale',
      ]);
    });
  });

  group('LanguageSearch', () {
    const languages = [
      LanguageName(id: 'es', name: 'Spanish', exonym: 'Español'),
      LanguageName(id: 'de', name: 'German', exonym: 'Deutsch'),
      LanguageName(id: 'pt', name: 'Portuguese', exonym: 'Português'),
    ];

    test('lists every language without a query', () {
      expect(LanguageSearch(languages).rank(''), languages);
    });

    test('finds a language by its names, without accents', () {
      final search = LanguageSearch(languages);

      expect(search.rank('portugues').single.id, 'pt');
      expect(search.rank('deu').single.id, 'de');
      expect(search.rank('germna').single.id, 'de');
    });
  });
}
