import 'package:flutter/foundation.dart';

import '../../core/models/language.dart';
import '../auth/auth_controller.dart';
import '../auth/auth_models.dart';
import '../lang_data/lang_repository.dart';
import 'profile_repository.dart';

/// The languages part of the account (the web `AccountData`): the native
/// language and the fluent ones, with their edits.
///
/// The user itself stays in [AuthController]: every edit hands it the user
/// the API answered.
class ProfileController extends ChangeNotifier {
  ProfileController({
    required this._auth,
    required this._langs,
    required this._profile,
  }) {
    load();
  }

  final AuthController _auth;
  final LangRepository _langs;
  final ProfileRepository _profile;

  List<Language>? _languages;
  Object? _error;
  bool _saving = false;
  bool _disposed = false;

  /// Every language of the catalogue, what the pickers offer. `null` while
  /// loading.
  List<Language>? get languages => _languages;
  Object? get error => _error;

  /// An edit is being sent.
  bool get saving => _saving;

  AuthUser? get user => _auth.user;

  String? get nativeId => user?.nativeLanguage;

  /// The API keeps them as a comma separated list.
  List<String> get fluentIds => [
    for (final id in (user?.fluent ?? '').split(','))
      if (id.isNotEmpty) id,
  ];

  Language? language(String id) =>
      _languages?.where((lang) => lang.id == id).firstOrNull;

  Future<void> load() async {
    _error = null;
    _notify();

    try {
      _languages = await _langs.all();
    } catch (e) {
      _error = e;
    }

    _notify();
  }

  Future<void> setNative(Language language) =>
      _save(() => _profile.setNativeLanguage(language.id));

  Future<void> addFluent(Language language) {
    final ids = fluentIds;

    return ids.contains(language.id)
        ? Future.value()
        : _save(() => _profile.setFluentLanguages([...ids, language.id]));
  }

  Future<void> removeFluent(String id) => _save(
    () => _profile.setFluentLanguages([
      for (final fluent in fluentIds)
        if (fluent != id) fluent,
    ]),
  );

  /// Runs an edit; throws its failure for the screen to report.
  Future<void> _save(Future<AuthUser> Function() edit) async {
    if (_saving) return;

    _saving = true;
    _notify();

    try {
      await _auth.updateUser(await edit());
    } finally {
      _saving = false;
      _notify();
    }
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
