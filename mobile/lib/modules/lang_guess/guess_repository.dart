import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/api/api_client.dart';
import '../../core/models/language.dart';
import 'guess_models.dart';

/// The game endpoints (`/api/guess`).
class GuessRepository {
  GuessRepository(this._api);

  final ApiClient _api;

  Future<Language> daily() async =>
      Language.fromJson(await _api.get('/guess/daily') as Map<String, dynamic>);

  Future<GuessResult> check(String guessId, String targetId) async =>
      GuessResult.fromJson(
        await _api.get('/guess/$guessId', query: {'target': targetId})
            as Map<String, dynamic>,
      );

  /// Counts the games stored from this device, so an open history reloads.
  final ValueNotifier<int> historyChanges = ValueNotifier(0);

  /// The signed in user's games, newest first.
  Future<List<GameRecord>> history() async => [
    for (final record in (await _api.get(
      '/guess/history',
    ) as List).cast<Map<String, dynamic>>())
      GameRecord.fromJson(record),
  ];

  /// Stores a finished game in the signed in user's history.
  Future<void> saveHistory(GameRecord record) async {
    await _api.put('/guess/history', body: record.toRequest());
    historyChanges.value++;
  }
}

/// Progress of today's daily game, so leaving the app does not reset it (the
/// web keeps the same thing in `localStorage`).
class DailySave {
  const DailySave({
    required this.date,
    required this.targetId,
    required this.guesses,
    required this.won,
  });

  factory DailySave.fromJson(Map<String, dynamic> json) => DailySave(
    date: json['date'] as String,
    targetId: json['targetId'] as String,
    guesses: [
      for (final guess
          in (json['guesses'] as List).cast<Map<String, dynamic>>())
        LanguageGuess.fromJson(guess),
    ],
    won: json['won'] as bool,
  );

  /// UTC date (`yyyy-mm-dd`) the game belongs to.
  final String date;
  final String targetId;
  final List<LanguageGuess> guesses;
  final bool won;

  Map<String, dynamic> toJson() => {
    'date': date,
    'targetId': targetId,
    'guesses': [for (final guess in guesses) guess.toJson()],
    'won': won,
  };
}

class DailySaveStore {
  static const _key = 'day-save';

  Future<DailySave?> read() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);

    if (raw == null) {
      return null;
    }

    try {
      return DailySave.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      await prefs.remove(_key);
      return null;
    }
  }

  Future<void> write(DailySave save) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(save.toJson()));
  }
}

/// Today in UTC as `yyyy-mm-dd`: the daily language rolls at 00:00 UTC.
String utcDateString([DateTime? now]) =>
    (now ?? DateTime.now()).toUtc().toIso8601String().substring(0, 10);
