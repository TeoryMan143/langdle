import 'package:flutter_test/flutter_test.dart';
import 'package:langdle_app/modules/lang_guess/guess_models.dart';
import 'package:langdle_app/modules/lang_guess/widgets/guesses_list.dart';

void main() {
  group('GuessResult.fromJson', () {
    test('reads the hints of a wrong guess', () {
      final result = GuessResult.fromJson({
        'correct': ['svo'],
        'partial': <String>[],
        'incorrect': ['tones'],
        'hints': {'distanceKm': 1053, 'bearing': 207, 'relation': 'genus'},
      });

      final hints = (result as Missed).matching.hints!;
      expect(hints.distanceKm, 1053);
      expect(hints.bearing, 207);
      expect(hints.relation, GuessRelation.genus);
    });

    test('a server without hints answers none', () {
      final result = GuessResult.fromJson({
        'correct': <String>[],
        'partial': <String>[],
        'incorrect': <String>[],
      });

      expect((result as Missed).matching.hints, isNull);
    });

    test('an unknown relation is ignored, not a crash', () {
      final hints = GuessHints.fromJson({'relation': 'cousins'});

      expect(hints.relation, isNull);
      expect(hints.isEmpty, isTrue);
    });
  });

  test('hints survive the saved daily game', () {
    const matching = LanguageMatching(
      correct: ['svo'],
      partial: [],
      incorrect: [],
      hints: GuessHints(distanceKm: 0, relation: GuessRelation.none),
    );

    final restored = LanguageMatching.fromJson(matching.toJson());

    expect(restored.hints!.distanceKm, 0);
    expect(restored.hints!.bearing, isNull);
    expect(restored.hints!.relation, GuessRelation.none);
  });

  test('groupDigits writes distances the way each locale does', () {
    expect(groupDigits(1053, 'en'), '1,053');
    expect(groupDigits(1053, 'pt'), '1.053');
    expect(groupDigits(1053, 'es'), '1053');
    expect(groupDigits(12345, 'es'), '12.345');
    expect(groupDigits(42, 'en'), '42');
  });
}
