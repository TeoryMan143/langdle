import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/api/api_client.dart';
import '../../core/i18n/translations.dart';
import 'game_log_models.dart';

/// A random 32 hex characters id.
String randomId() {
  final random = Random.secure();
  return [for (var i = 0; i < 16; i++) random.nextInt(256).toRadixString(16)]
      .map((byte) => byte.padLeft(2, '0'))
      .join();
}

/// Reports game events to `POST /api/logs/game` (the web's `game-logs`
/// module), signed when a session is open.
class GameLogRepository {
  GameLogRepository(this._api, {this._locale});

  static const _visitorKey = 'visitor-id';

  final ApiClient _api;
  final LocaleController? _locale;
  String? _visitorId;

  /// Sends [log] with this device's details. Never throws: a log that fails
  /// is dropped and never gets in the way of the game.
  Future<void> log(GameLog log) async {
    try {
      await _api.post(
        '/logs/game',
        body: {
          ...log.toRequest(),
          'visitorId': await _visitor(),
          'client': _client(),
        },
      );
    } catch (e) {
      debugPrint('Game event not logged: $e');
    }
  }

  /// The id this install keeps across games, like the web's `visitor-id`.
  Future<String> _visitor() async {
    if (_visitorId case final id?) return id;

    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(_visitorKey);

    if (id == null) {
      id = randomId();
      await prefs.setString(_visitorKey, id);
    }

    return _visitorId = id;
  }

  Map<String, dynamic> _client() {
    final dispatcher = PlatformDispatcher.instance;
    final view = dispatcher.implicitView ?? dispatcher.views.firstOrNull;
    final now = DateTime.now();

    return {
      'platform': defaultTargetPlatform.name.toLowerCase(),
      'locale': ?_locale?.code,
      'timezone': now.timeZoneName,
      'utcOffsetMinutes': now.timeZoneOffset.inMinutes,
      'languages': [
        for (final locale in dispatcher.locales.take(10))
          locale.toLanguageTag(),
      ],
      if (view != null) ...{
        'screen': {
          'width': view.display.size.width ~/ view.display.devicePixelRatio,
          'height': view.display.size.height ~/ view.display.devicePixelRatio,
        },
        'viewport': {
          'width': view.physicalSize.width ~/ view.devicePixelRatio,
          'height': view.physicalSize.height ~/ view.devicePixelRatio,
        },
        'pixelRatio': view.devicePixelRatio,
      },
    };
  }
}
