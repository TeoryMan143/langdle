import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/models/language.dart';
import 'lang_models.dart';
import 'lang_repository.dart';

/// The public atlas (the web `PublicLanguageAtlas` with `useLangPages`): the
/// counters, the feature catalogue and the languages, read batch by batch as
/// the user scrolls. A search asks the API (`?q=`) once the typing pauses.
class AtlasController extends ChangeNotifier {
  AtlasController({required this._langs}) {
    load();
  }

  /// Wait for a pause in the typing before asking the API, as on the web.
  static const searchDebounce = Duration(milliseconds: 300);

  final LangRepository _langs;

  LanguagesSummary? _summary;
  FeatureCatalogue? _catalogue;
  List<Language> _languages = const [];
  String? _nextCursor;
  int _total = 0;
  String _query = '';

  bool _loading = true;
  bool _searching = false;
  bool _loadingMore = false;
  Object? _error;
  Object? _moreError;

  /// Bumped by every new listing, so an answer for an older query or an
  /// older load is dropped instead of mixed into the current one.
  int _generation = 0;
  Timer? _debounce;
  bool _disposed = false;

  LanguagesSummary? get summary => _summary;
  FeatureCatalogue? get catalogue => _catalogue;

  /// The languages loaded so far for the current query.
  List<Language> get languages => _languages;

  /// How many languages match the current query, loaded or not.
  int get total => _total;
  String get query => _query;
  bool get hasMore => _nextCursor != null;

  /// The first load: counters, catalogue and first batch.
  bool get loading => _loading;

  /// A new query is waiting for its pause or its first batch.
  bool get searching => _searching;
  bool get loadingMore => _loadingMore;

  /// Why the screen could not load, or the current query's first batch.
  Object? get error => _error;

  /// Why the last next batch failed; the list stays, with a retry.
  Object? get moreError => _moreError;

  /// Loads everything again (the first open, pull to refresh, retry).
  Future<void> load() async {
    final generation = ++_generation;
    _debounce?.cancel();
    _loading = _summary == null;
    _error = null;
    _notify();

    try {
      final summary = _langs.summary();
      final catalogue = _langs.catalogue();
      final page = _langs.page(query: _query);
      // Surfaces the first failure as is, without leaving the others unhandled.
      await Future.wait([summary, catalogue, page]);

      if (generation != _generation) return;

      _summary = await summary;
      _catalogue = await catalogue;
      _show(await page);
    } catch (e) {
      if (generation != _generation) return;
      _error = e;
    }

    _loading = false;
    _searching = false;
    _notify();
  }

  /// After [error]: the whole screen when it never loaded, else the query.
  Future<void> retry() => _summary == null ? load() : _loadFirstPage();

  /// The user typed: the listing follows once the typing pauses.
  void search(String value) {
    if (value.trim() == _query.trim()) {
      _query = value;
      return;
    }

    _query = value;
    _searching = true;
    _debounce?.cancel();
    _debounce = Timer(searchDebounce, _loadFirstPage);
    _notify();
  }

  Future<void> _loadFirstPage() async {
    final generation = ++_generation;
    _searching = true;
    _error = null;
    _moreError = null;
    _notify();

    try {
      final page = await _langs.page(query: _query);
      if (generation != _generation) return;
      _show(page);
    } catch (e) {
      if (generation != _generation) return;
      _error = e;
    }

    _searching = false;
    _notify();
  }

  /// Reads the batch after the last one, once at a time.
  Future<void> loadMore() async {
    final cursor = _nextCursor;

    if (cursor == null || _loadingMore || _searching || _loading) {
      return;
    }

    final generation = _generation;
    _loadingMore = true;
    _moreError = null;
    _notify();

    try {
      final page = await _langs.page(query: _query, cursor: cursor);

      if (generation == _generation) {
        _languages = [..._languages, ...page.items];
        _nextCursor = page.nextCursor;
        _total = page.total;
      }
    } catch (e) {
      if (generation == _generation) _moreError = e;
    }

    _loadingMore = false;
    _notify();
  }

  void _show(LanguagePage page) {
    _languages = page.items;
    _nextCursor = page.nextCursor;
    _total = page.total;
    _moreError = null;
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _debounce?.cancel();
    super.dispose();
  }
}
