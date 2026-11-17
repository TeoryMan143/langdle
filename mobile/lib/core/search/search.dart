import '../i18n/translations.dart';
import '../models/language.dart';
import 'search_fold.g.dart';

// How languages are matched against what a user types: the port of the web's
// `src/core/lib/search.ts`, which also ranks `GET /lang/page?q=`. Both clients
// and the API must find the same languages in the same order, so a change here
// is a change there too (and the reverse).

final _marks = RegExp(r'\p{M}', unicode: true);
final _spaces = RegExp(r'\s+');
final _wordSeparator = RegExp(r'[^\p{L}\p{N}]+', unicode: true);

/// Lowercase, accents and extra spaces dropped: `Català` matches `catala`.
String normalizeSearchText(String text) {
  final folded = StringBuffer();

  for (final rune in text.runes) {
    folded.write(searchFold[rune] ?? String.fromCharCode(rune));
  }

  return folded
      .toString()
      .replaceAll(_marks, '')
      .toLowerCase()
      .replaceAll(_spaces, ' ')
      .trim();
}

/// The normalized terms a language is found by: its id, every name and the
/// [extra] ones (the exonym translated in the current locale).
List<String> searchTerms(
  LanguageName language, {
  Iterable<String> extra = const [],
}) => [
  for (final term in [
    language.id,
    language.name,
    language.exonym ?? '',
    ...language.searchParams,
    ...extra,
  ])
    if (normalizeSearchText(term) case final normalized
        when normalized.isNotEmpty)
      normalized,
];

/// Typos between [a] and [b]: letters added, removed or replaced, and two
/// neighbouring letters swapped (`spanihs` → `spanish`), each one typo.
/// Optimal string alignment, so a swapped pair is not edited again.
int typoDistance(String a, String b) {
  // Three rows of the dynamic programming table: two back for the swaps.
  var beforePrevious = <int>[];
  var previous = List<int>.generate(b.length + 1, (j) => j);

  for (var i = 1; i <= a.length; i++) {
    final current = List<int>.filled(b.length + 1, 0)..[0] = i;

    for (var j = 1; j <= b.length; j++) {
      final replace = a.codeUnitAt(i - 1) == b.codeUnitAt(j - 1) ? 0 : 1;

      var best = previous[j] + 1;
      if (current[j - 1] + 1 < best) best = current[j - 1] + 1;
      if (previous[j - 1] + replace < best) best = previous[j - 1] + replace;

      if (i > 1 &&
          j > 1 &&
          a.codeUnitAt(i - 1) == b.codeUnitAt(j - 2) &&
          a.codeUnitAt(i - 2) == b.codeUnitAt(j - 1) &&
          beforePrevious[j - 2] + 1 < best) {
        best = beforePrevious[j - 2] + 1;
      }

      current[j] = best;
    }

    beforePrevious = previous;
    previous = current;
  }

  return previous[b.length];
}

/// Typos forgiven: one per four letters typed, none below four.
int _allowedTypos(String query) => query.length ~/ 4;

/// How well a language's normalized [terms] match a normalized [query], best
/// first: `0` a whole term, `1` the start of a term, `2` the start of a word
/// inside one, `3` anywhere, `4` the start of a term or word with a few typos.
/// `null` when nothing matches.
int? matchRank(List<String> terms, String query) {
  int? best;

  for (final term in terms) {
    final rank = term == query
        ? 0
        : term.startsWith(query)
        ? 1
        : term.split(_wordSeparator).any((word) => word.startsWith(query))
        ? 2
        : term.contains(query)
        ? 3
        : null;

    if (rank != null && (best == null || rank < best)) {
      best = rank;
    }

    if (best == 0) {
      return best;
    }
  }

  if (best != null) {
    return best;
  }

  final typos = _allowedTypos(query);

  if (typos == 0) {
    return null;
  }

  // Compared with the start of each name, about as long as what was typed (a
  // letter missed or doubled changes the length), so a typo is forgiven while
  // the rest of the name is still to come.
  final fuzzy = terms.any(
    (term) => [term, ...term.split(_wordSeparator)].any((candidate) {
      for (var extra = -typos; extra <= typos; extra++) {
        final length = query.length + extra;

        if (length <= candidate.length &&
            typoDistance(query, candidate.substring(0, length)) <= typos) {
          return true;
        }
      }

      return false;
    }),
  );

  return fuzzy ? 4 : null;
}

/// The [items] matching [query], best matches first; items of the same rank
/// keep their order. Without a query every item is kept.
List<T> rankByQuery<T>(
  List<({T item, List<String> terms})> items,
  String query,
) {
  final normalized = normalizeSearchText(query);

  if (normalized.isEmpty) {
    return [for (final entry in items) entry.item];
  }

  final matches = [
    for (final (index, entry) in items.indexed)
      if (matchRank(entry.terms, normalized) case final rank?)
        (item: entry.item, rank: rank, index: index),
  ];

  // `List.sort` is not stable: the index keeps same-rank items in order.
  matches.sort(
    (a, b) => a.rank != b.rank ? a.rank.compareTo(b.rank) : a.index - b.index,
  );

  return [for (final match in matches) match.item];
}

/// A picker's search over [languages] (the web `useLangSearch`): their names
/// plus the exonym translated in the current locale, ranked by [rankByQuery].
/// The terms are computed once, and again when the locale changes.
class LanguageSearch<T extends LanguageName> {
  LanguageSearch(this.languages, {this._locale});

  final List<T> languages;
  final LocaleController? _locale;

  List<({T item, List<String> terms})>? _entries;
  String? _entriesLocale;

  /// The languages matching [query], best first; all of them without one.
  List<T> rank(String query) {
    final locale = _locale;

    if (_entries == null || locale?.code != _entriesLocale) {
      _entriesLocale = locale?.code;
      _entries = [
        for (final language in languages)
          (
            item: language,
            terms: searchTerms(
              language,
              extra: [?locale?.maybe('Exonyms.${language.id}')],
            ),
          ),
      ];
    }

    return rankByQuery(_entries!, query);
  }
}
