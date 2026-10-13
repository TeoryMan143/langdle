import 'package:flutter/foundation.dart';

import '../../core/models/language.dart';
import '../lang_data/lang_repository.dart';
import 'guess_models.dart';
import 'guess_repository.dart';

/// The signed in user's finished games (the web `GameHistory`), with the
/// languages they targeted. Reloads when a game of this device is stored.
class HistoryController extends ChangeNotifier {
  HistoryController({required this._guesses, required this._langs}) {
    _guesses.historyChanges.addListener(load);
    load();
  }

  final GuessRepository _guesses;
  final LangRepository _langs;

  List<GameRecord>? _records;
  Map<String, Language> _languages = const {};
  Object? _error;
  bool _disposed = false;

  /// Newest first; `null` until the first load.
  List<GameRecord>? get records => _records;
  Object? get error => _error;

  Language? language(String id) => _languages[id];

  Future<void> load() async {
    _error = null;
    _notify();

    try {
      final records = await _guesses.history();
      final languages = await _langs.byIds(records.map((r) => r.targetLang));

      _records = records;
      _languages = {for (final lang in languages) lang.id: lang};
    } catch (e) {
      _error = e;
    }

    _notify();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _guesses.historyChanges.removeListener(load);
    super.dispose();
  }
}
