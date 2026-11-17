import 'package:flutter/material.dart';

import '../config.dart';

/// The flag of a language, like the web `LangImage`: first the assets synced
/// from `public/flags`, then the flags bucket (languages added through
/// requests), then the `unknown` flag.
class LangFlag extends StatelessWidget {
  const LangFlag(
    this.code, {
    super.key,
    this.width = 24,
    this.height = 20,
    this.flagsBaseUrl,
  });

  final String code;
  final double width;
  final double height;

  /// Overrides [AppConfig.flagsBaseUrl], for tests.
  final String? flagsBaseUrl;

  @override
  Widget build(BuildContext context) {
    final bucket = flagsBaseUrl ?? AppConfig.flagsBaseUrl;

    Widget unknown() => Image.asset(
      'assets/flags/unknown.webp',
      width: width,
      height: height,
      fit: BoxFit.cover,
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(2),
      child: Image.asset(
        'assets/flags/$code.webp',
        width: width,
        height: height,
        fit: BoxFit.cover,
        semanticLabel: '$code flag',
        errorBuilder: (_, _, _) => bucket == null
            ? unknown()
            : Image.network(
                '$bucket/flags/$code.webp',
                width: width,
                height: height,
                fit: BoxFit.cover,
                semanticLabel: '$code flag',
                errorBuilder: (_, _, _) => unknown(),
              ),
      ),
    );
  }
}
