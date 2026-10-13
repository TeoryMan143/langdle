import 'package:flutter_test/flutter_test.dart';
import 'package:langdle_app/core/models/language.dart';
import 'package:langdle_app/modules/lang_guess/guess_models.dart';
import 'package:langdle_app/modules/lang_guess/guess_repository.dart';

void main() {
  group('Language.search', () {
    const languages = [
      Language(id: 'es', name: 'Español', searchParams: ['spanish', 'español']),
      Language(id: 'de', name: 'Deutsch', searchParams: ['german', 'deutsch']),
      Language(id: 'pt', name: 'Português', searchParams: ['portuguese']),
    ];

    test('answers every language for an empty query', () {
      expect(Language.search(languages, ''), languages);
    });

    test('ranks by the closest search param', () {
      final ids = Language.search(languages, 'germen').map((l) => l.id);
      expect(ids.first, 'de');
    });

    test('matches any of the params', () {
      expect(Language.search(languages, 'español').first.id, 'es');
    });
  });

  group('GuessResult.fromJson', () {
    test('a right guess carries the target', () {
      final result = GuessResult.fromJson({
        'guessed': {'id': 'es', 'name': 'Español'},
      });

      expect(result, isA<Guessed>());
      expect((result as Guessed).target.id, 'es');
    });

    test('a wrong guess carries the matching', () {
      final result = GuessResult.fromJson({
        'correct': ['sov'],
        'partial': [],
        'incorrect': ['tones'],
      });

      expect(result, isA<Missed>());
      expect((result as Missed).matching.incorrect, ['tones']);
    });
  });

  test('DailySave survives a JSON round trip', () {
    final save = DailySave(
      date: '2026-10-12',
      targetId: 'es',
      won: false,
      guesses: const [
        LanguageGuess(
          language: Language(id: 'de', name: 'Deutsch'),
          matching: LanguageMatching(
            correct: ['svo'],
            partial: [],
            incorrect: ['tones'],
          ),
        ),
      ],
    );

    final copy = DailySave.fromJson(save.toJson());

    expect(copy.date, save.date);
    expect(copy.guesses.single.language.id, 'de');
    expect(copy.guesses.single.matching.correct, ['svo']);
  });

  test('utcDateString uses the UTC day', () {
    expect(utcDateString(DateTime.utc(2026, 10, 12, 23, 59)), '2026-10-12');
  });
}
