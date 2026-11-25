import '../lang_guess/guess_models.dart';

/// What a player did, as `POST /api/logs/game` records it: opened a game that
/// is not over yet, tried a language (the right one included) and how the
/// game ended.
enum GameLogEvent { start, guess, win, lose }

/// One event of a game. The device details and the visitor id are added by
/// `GameLogRepository`; the IP, the user agent and the player come from the
/// request itself.
class GameLog {
  const GameLog({
    required this.event,
    required this.gameId,
    required this.type,
    required this.targetLang,
    this.guessLang,
    this.attempt,
    this.resumed,
  });

  final GameLogEvent event;

  /// Ties the events of one game together.
  final String gameId;
  final GameType type;
  final String targetLang;

  /// The language tried, for a [GameLogEvent.guess].
  final String? guessLang;

  /// The guesses made so far, this one included.
  final int? attempt;

  /// A start that continues today's saved game.
  final bool? resumed;

  Map<String, dynamic> toRequest() => {
    'event': event.name,
    'gameId': gameId,
    'type': type.name,
    'targetLang': targetLang,
    'guessLang': ?guessLang,
    'attempt': ?attempt,
    'resumed': ?resumed,
  };
}
