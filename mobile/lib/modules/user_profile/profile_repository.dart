import '../../core/api/api_client.dart';
import '../auth/auth_models.dart';

/// The profile endpoints (`/api/user`). Each change answers the whole
/// updated user.
class ProfileRepository {
  ProfileRepository(this._api);

  final ApiClient _api;

  Future<AuthUser> setNativeLanguage(String langId) async => _updated(
    await _api.put('/user/native-lang', body: {'nativeLang': langId}),
  );

  /// Replaces the whole list of fluent languages.
  Future<AuthUser> setFluentLanguages(List<String> langIds) async =>
      _updated(await _api.put('/user/fluent', body: {'fluent': langIds}));

  static AuthUser _updated(Object? json) => AuthUser.fromJson(
    (json as Map<String, dynamic>)['updated'] as Map<String, dynamic>,
  );
}
