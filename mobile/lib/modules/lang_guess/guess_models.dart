import '../../core/models/language.dart';

List<String> _strings(Object? value) =>
    value is List ? value.whereType<String>().toList() : const [];

/// How the features of a guess compare with the target language.
class LanguageMatching {
  const LanguageMatching({
    required this.correct,
    required this.partial,
    required this.incorrect,
  });

  factory LanguageMatching.fromJson(Map<String, dynamic> json) =>
      LanguageMatching(
        correct: _strings(json['correct']),
        partial: _strings(json['partial']),
        incorrect: _strings(json['incorrect']),
      );

  final List<String> correct;
  final List<String> partial;
  final List<String> incorrect;

  Map<String, dynamic> toJson() => {
    'correct': correct,
    'partial': partial,
    'incorrect': incorrect,
  };
}

/// A wrong guess, kept with its matching for the guesses list.
class LanguageGuess {
  const LanguageGuess({required this.language, required this.matching});

  factory LanguageGuess.fromJson(Map<String, dynamic> json) => LanguageGuess(
    language: Language.fromJson(json['language'] as Map<String, dynamic>),
    matching: LanguageMatching.fromJson(
      json['matching'] as Map<String, dynamic>,
    ),
  );

  final Language language;
  final LanguageMatching matching;

  Map<String, dynamic> toJson() => {
    'language': language.toJson(),
    'matching': matching.toJson(),
  };
}

/// `GET /api/guess/:id` answers the target itself when the guess is right,
/// the feature matching otherwise.
sealed class GuessResult {
  const GuessResult();

  factory GuessResult.fromJson(Map<String, dynamic> json) =>
      json['guessed'] is Map<String, dynamic>
      ? Guessed(Language.fromJson(json['guessed'] as Map<String, dynamic>))
      : Missed(LanguageMatching.fromJson(json));
}

class Guessed extends GuessResult {
  const Guessed(this.target);

  final Language target;
}

class Missed extends GuessResult {
  const Missed(this.matching);

  final LanguageMatching matching;
}
