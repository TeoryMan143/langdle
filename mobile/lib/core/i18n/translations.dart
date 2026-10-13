import 'dart:convert';
import 'dart:ui';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Holds the current locale and its messages.
///
/// The messages are the web app's own `messages/<locale>.json`, copied into
/// `assets/i18n` by `tool/sync_shared.dart`, so both clients share one set of
/// translations and the same keys (`Game.guess`, `Features.name.tones`, …).
class LocaleController extends ChangeNotifier {
  static const supported = ['en', 'es', 'pt'];
  static const names = {'en': 'English', 'es': 'Español', 'pt': 'Português'};

  static const _prefsKey = 'locale';

  String _code = 'en';
  Map<String, dynamic> _messages = const {};

  String get code => _code;
  Locale get locale => Locale(_code);

  /// Picks the saved locale, else the device one when supported, else English.
  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefsKey);
    final device = PlatformDispatcher.instance.locale.languageCode;

    await _use(
      saved ?? (supported.contains(device) ? device : supported.first),
    );
  }

  Future<void> setLocale(String code) async {
    if (!supported.contains(code) || code == _code) {
      return;
    }

    await _use(code);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, code);
  }

  Future<void> _use(String code) async {
    final raw = await rootBundle.loadString('assets/i18n/$code.json');
    _messages = jsonDecode(raw) as Map<String, dynamic>;
    _code = code;
    notifyListeners();
  }

  /// The message at a dotted path, with `{name}` placeholders filled from
  /// [args]. Answers the path itself when the message is missing.
  String t(String path, [Map<String, Object> args = const {}]) {
    var message = maybe(path) ?? path;

    for (final MapEntry(:key, :value) in args.entries) {
      message = message.replaceAll('{$key}', '$value');
    }

    return message;
  }

  /// The message at a dotted path, `null` when it does not exist.
  String? maybe(String path) {
    Object? node = _messages;

    for (final part in path.split('.')) {
      if (node is! Map<String, dynamic>) {
        return null;
      }
      node = node[part];
    }

    return node is String ? node : null;
  }
}

extension Translate on BuildContext {
  /// Translates and rebuilds the widget when the locale changes. Only for
  /// `build` methods; callbacks use `context.read<LocaleController>().t`.
  String t(String path, [Map<String, Object> args = const {}]) =>
      watch<LocaleController>().t(path, args);
}
