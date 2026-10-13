import 'dart:async';

import 'package:flutter/widgets.dart';

import '../../core/models/language.dart';
import '../lang_data/lang_repository.dart';
import 'guess_models.dart';
import 'guess_repository.dart';

enum GameType { daily, random }

enum GameStatus { loading, error, playing, won, lost }

/// What a guess attempt ended in, so the screen can react (clear the input,
/// show the result dialog).
enum GuessOutcome { rejected, missed, won, lost }

/// State of one game, daily or random: the web `GameProvider`.
class GameController extends ChangeNotifier with WidgetsBindingObserver {
  GameController({
    required this.type,
    required this._langs,
    required GuessRepository guesses,
    required this._saves,
  }) : _guessRepo = guesses {
    WidgetsBinding.instance.addObserver(this);
    start();
  }

  static const maxAttempts = 5;

  final GameType type;
  final LangRepository _langs;
  final GuessRepository _guessRepo;
  final DailySaveStore _saves;

  GameStatus _status = GameStatus.loading;
  Object? _error;
  Language? _target;
  List<Language> _pool = const [];
  List<LanguageGuess> _guesses = const [];
  Language? _selected;
  String? _hint;
  bool _submitting = false;
  String? _startedOn;
  Timer? _hintTimer;
  bool _disposed = false;

  GameStatus get status => _status;
  Object? get error => _error;
  Language? get target => _target;
  List<LanguageGuess> get guesses => _guesses;
  Language? get selected => _selected;
  bool get submitting => _submitting;
  bool get finished => _status == GameStatus.won || _status == GameStatus.lost;
  int get attemptsLeft => maxAttempts - _guesses.length;

  /// Translation key of the transient hint above the input
  /// (`Game.selectToGuess`, `Game.langTried`), `null` when hidden.
  String? get hint => _hint;

  /// Loads a target (today's or a random one) and the search pool. A daily
  /// game resumes from today's save.
  Future<void> start() async {
    _status = GameStatus.loading;
    _error = null;
    _guesses = const [];
    _selected = null;
    _notify();

    try {
      final targetRequest = type == GameType.daily
          ? _guessRepo.daily()
          : _langs.random();
      final poolRequest = _langs.active();
      // Surfaces the first failure as is, without leaving the other unhandled.
      await Future.wait([targetRequest, poolRequest]);
      final target = await targetRequest;
      final pool = await poolRequest;

      _target = target;
      _pool = pool;
      _startedOn = utcDateString();
      _status = GameStatus.playing;

      if (type == GameType.daily) {
        await _restoreDaily(target);
      }
    } catch (e) {
      _error = e;
      _status = GameStatus.error;
    }

    _notify();
  }

  Future<void> _restoreDaily(Language target) async {
    final save = await _saves.read();

    if (save == null ||
        save.date != utcDateString() ||
        save.targetId != target.id) {
      return;
    }

    _guesses = save.guesses;
    _status = save.won
        ? GameStatus.won
        : _guesses.length >= maxAttempts
        ? GameStatus.lost
        : GameStatus.playing;
  }

  /// The playable languages ranked for [query] (lower case, trimmed).
  List<Language> search(String query) => Language.search(_pool, query);

  void select(Language? language) {
    if (_selected?.id == language?.id) return;
    _selected = language;
    _notify();
  }

  Future<GuessOutcome> guess() async {
    final target = _target;
    final selected = _selected;

    if (target == null || finished || _submitting) {
      return GuessOutcome.rejected;
    }

    if (selected == null) {
      _showHint('Game.selectToGuess');
      return GuessOutcome.rejected;
    }

    if (_guesses.any((g) => g.language.id == selected.id)) {
      _showHint('Game.langTried');
      return GuessOutcome.rejected;
    }

    _submitting = true;
    _notify();

    try {
      final result = selected.id == target.id
          ? Guessed(target)
          : await _guessRepo.check(selected.id, target.id);

      switch (result) {
        case Guessed():
          _status = GameStatus.won;
        case Missed(:final matching):
          _guesses = [
            ..._guesses,
            LanguageGuess(language: selected, matching: matching),
          ];
          if (_guesses.length >= maxAttempts) {
            _status = GameStatus.lost;
          }
      }

      _selected = null;
      await _saveDaily();

      return switch (_status) {
        GameStatus.won => GuessOutcome.won,
        GameStatus.lost => GuessOutcome.lost,
        _ => GuessOutcome.missed,
      };
    } finally {
      _submitting = false;
      _notify();
    }
  }

  Future<void> _saveDaily() async {
    final target = _target;

    if (type != GameType.daily || target == null) {
      return;
    }

    await _saves.write(
      DailySave(
        date: _startedOn ?? utcDateString(),
        targetId: target.id,
        guesses: _guesses,
        won: _status == GameStatus.won,
      ),
    );
  }

  void _showHint(String key) {
    _hint = key;
    _hintTimer?.cancel();
    _hintTimer = Timer(const Duration(seconds: 4), () {
      _hint = null;
      _notify();
    });
    _notify();
  }

  /// The daily language rolls at 00:00 UTC: reload when the day has changed.
  void refreshIfNewDay() {
    if (type == GameType.daily &&
        _startedOn != null &&
        _startedOn != utcDateString() &&
        _status != GameStatus.loading) {
      start();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      refreshIfNewDay();
    }
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _hintTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}
