import 'package:flutter/foundation.dart';

import '../../core/api/api_client.dart';
import '../../core/models/language.dart';
import 'lang_repository.dart';

enum ClaimStatus { claiming, granted, failed }

/// Claims the edit permission of a shared link (the web `/addpermission`):
/// `PUT /lang/permissions/claim/:token`, then the language it granted.
class PermissionController extends ChangeNotifier {
  PermissionController({required this.token, required this._langs}) {
    claim();
  }

  /// `null` when the link carried none.
  final String? token;
  final LangRepository _langs;

  ClaimStatus _status = ClaimStatus.claiming;
  Language? _language;
  Object? _error;
  bool _disposed = false;

  ClaimStatus get status => _status;

  /// The language the permission is for, once [ClaimStatus.granted].
  Language? get language => _language;

  /// What went wrong, once [ClaimStatus.failed].
  Object? get error => _error;

  /// The translation of the failure: the API's `key` under
  /// `AddPermissionPage.errors` (`tokenNotFound`, `userIsAdmin`, …).
  String get errorKey {
    final error = _error;

    if (token == null) return 'AddPermissionPage.errors.tokenNotFound';
    if (error is ApiException && error.isNetwork) {
      return 'Mobile.connectionError';
    }

    return 'AddPermissionPage.errors.${error is ApiException ? error.key : 'unknown'}';
  }

  /// A network failure can be retried; the API's answers are final.
  bool get canRetry =>
      _error is ApiException && (_error as ApiException).isNetwork;

  Future<void> claim() async {
    final token = this.token;

    _status = ClaimStatus.claiming;
    _error = null;
    _notify();

    if (token == null || token.isEmpty) {
      _status = ClaimStatus.failed;
      _notify();
      return;
    }

    try {
      final langId = await _langs.claimPermission(token);
      _status = ClaimStatus.granted;

      try {
        _language = await _langs.one(langId);
      } catch (_) {
        // Granted all the same: the screen falls back to the id.
        _language = Language(id: langId, name: langId);
      }
    } catch (e) {
      _error = e;
      _status = ClaimStatus.failed;
    }

    _notify();
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
