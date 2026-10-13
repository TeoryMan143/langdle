import 'package:flutter/material.dart';

/// The flag of a language, from the assets synced from `public/flags`. Falls
/// back to the `unknown` flag like the web `LangImage`.
class LangFlag extends StatelessWidget {
  const LangFlag(this.code, {super.key, this.width = 24, this.height = 20});

  final String code;
  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(2),
      child: Image.asset(
        'assets/flags/$code.webp',
        width: width,
        height: height,
        fit: BoxFit.cover,
        semanticLabel: '$code flag',
        errorBuilder: (_, _, _) => Image.asset(
          'assets/flags/unknown.webp',
          width: width,
          height: height,
          fit: BoxFit.cover,
        ),
      ),
    );
  }
}
