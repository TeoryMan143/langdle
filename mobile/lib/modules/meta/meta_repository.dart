import '../../core/api/api_client.dart';
import '../../core/models/country.dart';

/// The read-only catalogues (`/api/meta`). They only change with a deploy, so
/// each one is fetched once per run.
class MetaRepository {
  MetaRepository(this._api);

  final ApiClient _api;

  List<Country>? _countries;

  Future<List<Country>> countries() async => _countries ??= [
    for (final country in (await _api.get(
      '/meta/countries',
    ) as List).cast<Map<String, dynamic>>())
      Country.fromJson(country),
  ];
}
