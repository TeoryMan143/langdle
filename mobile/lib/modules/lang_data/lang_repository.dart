import '../../core/api/api_client.dart';
import '../../core/models/language.dart';
import 'lang_models.dart';

/// The feature catalogue (`GET /api/meta/features`): feature ids by group, in
/// the order the web shows them.
class FeatureCatalogue {
  const FeatureCatalogue(this.groups);

  factory FeatureCatalogue.fromJson(Map<String, dynamic> json) {
    final groups = json['groups'] as Map<String, dynamic>;

    return FeatureCatalogue({
      for (final MapEntry(:key, :value) in groups.entries)
        key: (value as List).whereType<String>().toList(),
    });
  }

  final Map<String, List<String>> groups;
}

/// Reads the language catalogue (`/api/lang`, `/api/meta`). The names the
/// pickers search and the feature catalogue barely change, so they are cached
/// for the life of the app; the catalogue itself is read batch by batch.
class LangRepository {
  LangRepository(this._api);

  /// Languages per atlas batch, as on the web.
  static const pageSize = 24;

  final ApiClient _api;

  final Map<bool?, Future<List<LanguageName>>> _names = {};
  Future<FeatureCatalogue>? _catalogue;

  /// The names of every language by name (`GET /lang/names`), or only the
  /// playable ([active] `true`) or unplayable ones: what a picker searches.
  Future<List<LanguageName>> names({bool? active}) =>
      _names[active] ??= _loadNames(active);

  /// One batch of the catalogue by name, after [cursor] (the previous batch's
  /// `nextCursor`), keeping the languages that match [query] when given.
  Future<LanguagePage> page({
    String? cursor,
    String? query,
    int limit = pageSize,
  }) async => LanguagePage.fromJson(
    await _api.get(
      '/lang/page',
      query: {
        'limit': limit,
        'cursor': ?cursor,
        if (query != null && query.trim().isNotEmpty) 'q': query.trim(),
      },
    ) as Map<String, dynamic>,
  );

  /// How many languages and features the catalogue holds.
  Future<LanguagesSummary> summary() async => LanguagesSummary.fromJson(
    await _api.get('/lang/summary') as Map<String, dynamic>,
  );

  Future<Language> random() async =>
      Language.fromJson(await _api.get('/lang/random') as Map<String, dynamic>);

  Future<Language> one(String id) async => Language.fromJson(
    await _api.get('/lang/${Uri.encodeComponent(id)}') as Map<String, dynamic>,
  );

  /// The languages with these ids, playable or not. Ids no longer in the
  /// catalogue are left out (the API answers holes, or `404` for none).
  Future<List<Language>> byIds(Iterable<String> ids) async {
    final unique = ids.toSet();

    if (unique.isEmpty) {
      return const [];
    }

    final Object? json;

    try {
      json = await _api.get('/lang', query: {'id': unique});
    } on ApiException catch (e) {
      if (e.key == 'notFounds') return const [];
      rethrow;
    }

    return [
      for (final item in json as List)
        if (item is Map<String, dynamic> && item['name'] is String)
          Language.fromJson(item),
    ];
  }

  /// Claims the edit permission an administrator shared as a link
  /// (`/addpermission?token=`). Answers the id of the language it grants.
  Future<String> claimPermission(String token) async {
    final json = await _api.put(
      '/lang/permissions/claim/${Uri.encodeComponent(token)}',
    ) as Map<String, dynamic>;

    return json['lang'] as String;
  }

  Future<FeatureCatalogue> catalogue() => _catalogue ??= _loadCatalogue();

  Future<List<LanguageName>> _loadNames(bool? active) async {
    try {
      final json = await _api.get('/lang/names', query: {'active': ?active});

      return [
        for (final item in json as List)
          if (item is Map<String, dynamic>) LanguageName.fromJson(item),
      ];
    } catch (_) {
      _names.remove(active);
      rethrow;
    }
  }

  Future<FeatureCatalogue> _loadCatalogue() async {
    try {
      return FeatureCatalogue.fromJson(
        await _api.get('/meta/features') as Map<String, dynamic>,
      );
    } catch (_) {
      _catalogue = null;
      rethrow;
    }
  }
}
