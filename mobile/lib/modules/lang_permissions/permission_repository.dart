import '../../core/api/api_client.dart';

/// The edit permissions of languages (`/api/lang/permissions`).
class PermissionRepository {
  PermissionRepository(this._api);

  final ApiClient _api;

  /// Claims the edit permission an administrator shared as a link
  /// (`/addpermission?token=`). Answers the id of the language it grants.
  Future<String> claim(String token) async {
    final json = await _api.put(
      '/lang/permissions/claim/${Uri.encodeComponent(token)}',
    ) as Map<String, dynamic>;

    return json['lang'] as String;
  }
}
