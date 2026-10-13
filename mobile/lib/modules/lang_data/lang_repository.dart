import '../../core/api/api_client.dart';
import '../../core/models/language.dart';

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

/// Reads the language catalogue (`/api/lang`, `/api/meta`). The playable
/// languages and the feature catalogue barely change, so they are cached for
/// the life of the app.
class LangRepository {
  LangRepository(this._api);

  final ApiClient _api;

  Future<List<Language>>? _active;
  Future<FeatureCatalogue>? _catalogue;

  /// Every language, playable or not (the public atlas).
  Future<List<Language>> all() async => _parseList(await _api.get('/lang'));

  /// The playable languages, the pool the guess search draws from.
  Future<List<Language>> active() => _active ??= _loadActive();

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

  Future<List<Language>> _loadActive() async {
    try {
      return _parseList(await _api.get('/lang', query: {'oactive': '1'}));
    } catch (_) {
      _active = null;
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

  static List<Language> _parseList(Object? json) => [
    for (final item in (json as List).cast<Map<String, dynamic>>())
      Language.fromJson(item),
  ]..sort((a, b) => a.name.compareTo(b.name));
}
