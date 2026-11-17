import '../../core/models/language.dart';

/// One batch of the catalogue (`GET /api/lang/page`): [nextCursor] goes back
/// as `?cursor=` for the next batch, `null` on the last one. [total] counts
/// every language matching the filters, not only this batch.
class LanguagePage {
  const LanguagePage({
    required this.items,
    required this.nextCursor,
    required this.total,
  });

  factory LanguagePage.fromJson(Map<String, dynamic> json) => LanguagePage(
    items: [
      for (final item in json['items'] as List)
        if (item is Map<String, dynamic>) Language.fromJson(item),
    ],
    nextCursor: json['nextCursor'] as String?,
    total: (json['total'] as num).toInt(),
  );

  final List<Language> items;
  final String? nextCursor;
  final int total;
}

/// The atlas counters (`GET /api/lang/summary`).
class LanguagesSummary {
  const LanguagesSummary({
    required this.languages,
    required this.activeLanguages,
    required this.activeFeatures,
    required this.partialFeatures,
  });

  factory LanguagesSummary.fromJson(Map<String, dynamic> json) =>
      LanguagesSummary(
        languages: (json['languages'] as num).toInt(),
        activeLanguages: (json['activeLanguages'] as num).toInt(),
        activeFeatures: (json['activeFeatures'] as num).toInt(),
        partialFeatures: (json['partialFeatures'] as num).toInt(),
      );

  final int languages;
  final int activeLanguages;
  final int activeFeatures;
  final int partialFeatures;
}
