import 'package:flutter/widgets.dart';

import '../i18n/translations.dart';

List<String> _strings(Object? value) =>
    value is List ? value.whereType<String>().toList() : const [];

/// A language of the catalogue, as `GET /api/lang` answers it.
class Language {
  const Language({
    required this.id,
    required this.name,
    this.exonym,
    this.features = const [],
    this.partial = const [],
    this.searchParams = const [],
    this.active = true,
  });

  factory Language.fromJson(Map<String, dynamic> json) => Language(
    id: json['id'] as String,
    name: json['name'] as String,
    exonym: json['exonym'] as String?,
    features: _strings(json['features']),
    partial: _strings(json['partial']),
    searchParams: _strings(json['searchParams']),
    active: json['active'] as bool? ?? true,
  );

  final String id;
  final String name;
  final String? exonym;

  /// Features present in the language.
  final List<String> features;

  /// Features only partially present.
  final List<String> partial;

  /// Lower case names the search matches against.
  final List<String> searchParams;
  final bool active;

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'exonym': ?exonym,
    'features': features,
    'partial': partial,
    'searchParams': searchParams,
    'active': active,
  };

  /// `Name (Exonym)`, the exonym translated into the current locale when the
  /// `Exonyms` messages have it. Only for `build` methods.
  String label(BuildContext context) {
    final exo = context.t('Exonyms.$id');
    final translated = exo == 'Exonyms.$id' ? exonym : exo;

    return translated == null || translated == name
        ? name
        : '$name ($translated)';
  }

  /// [query] is lower case and trimmed. Same ranking as the web search: the
  /// smallest edit distance to any of the [searchParams].
  static List<Language> search(List<Language> languages, String query) {
    if (query.isEmpty) {
      return languages;
    }

    final scored = [
      for (final lang in languages)
        (
          lang: lang,
          score: lang.searchParams.isEmpty
              ? _levenshtein(query, lang.name.toLowerCase())
              : lang.searchParams
                    .map((param) => _levenshtein(query, param))
                    .reduce((a, b) => a < b ? a : b),
        ),
    ]..sort((a, b) => a.score.compareTo(b.score));

    return [for (final entry in scored) entry.lang];
  }
}

int _levenshtein(String a, String b) {
  if (a == b) return 0;
  if (a.isEmpty) return b.length;
  if (b.isEmpty) return a.length;

  var previous = List<int>.generate(b.length + 1, (i) => i);
  var current = List<int>.filled(b.length + 1, 0);

  for (var i = 1; i <= a.length; i++) {
    current[0] = i;

    for (var j = 1; j <= b.length; j++) {
      final cost = a.codeUnitAt(i - 1) == b.codeUnitAt(j - 1) ? 0 : 1;
      current[j] = [
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      ].reduce((x, y) => x < y ? x : y);
    }

    final swap = previous;
    previous = current;
    current = swap;
  }

  return previous[b.length];
}
