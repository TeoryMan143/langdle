import 'package:flutter_test/flutter_test.dart';
import 'package:langdle_app/core/models/language.dart';
import 'package:langdle_app/modules/lang_guess/guess_models.dart';
import 'package:langdle_app/modules/lang_guess/guess_repository.dart';

void main() {
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

  test('a guess saved with the whole language still reads', () {
    final guess = LanguageGuess.fromJson({
      'language': {
        'id': 'de',
        'name': 'Deutsch',
        'features': ['svo'],
        'partial': <String>[],
        'searchParams': ['german'],
        'active': true,
      },
      'matching': {
        'correct': <String>[],
        'partial': <String>[],
        'incorrect': <String>[],
      },
    });

    expect(guess.language.id, 'de');
    expect(guess.language.searchParams, ['german']);
  });

  test('utcDateString uses the UTC day', () {
    expect(utcDateString(DateTime.utc(2026, 10, 12, 23, 59)), '2026-10-12');
  });
}
