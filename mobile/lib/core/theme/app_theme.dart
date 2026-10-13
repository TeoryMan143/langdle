import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'tokens.dart';

ThemeData buildAppTheme() {
  // Only the family comes from google_fonts: its `TextTheme` helpers are built
  // on the `material_ui` package, not on `flutter/material.dart`.
  final base = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    fontFamily: GoogleFonts.notoSans().fontFamily,
  );

  final outline = OutlineInputBorder(
    borderRadius: Neo.borderRadius,
    borderSide: const BorderSide(
      color: NeoColors.border,
      width: Neo.borderWidth,
    ),
  );

  return base.copyWith(
    scaffoldBackgroundColor: NeoColors.background,
    colorScheme: const ColorScheme.light(
      primary: NeoColors.main,
      onPrimary: NeoColors.mainForeground,
      secondary: NeoColors.softDet,
      surface: NeoColors.secondaryBackground,
      onSurface: NeoColors.foreground,
      error: NeoColors.incorrect,
    ),
    textTheme: base.textTheme.apply(
      bodyColor: NeoColors.foreground,
      displayColor: NeoColors.foreground,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: NeoColors.secondaryBackground,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: outline,
      enabledBorder: outline,
      focusedBorder: outline.copyWith(
        borderSide: const BorderSide(color: NeoColors.border, width: 3),
      ),
      // The web marks an invalid field with a red ring.
      errorBorder: outline.copyWith(
        borderSide: const BorderSide(
          color: NeoColors.incorrect,
          width: Neo.borderWidth,
        ),
      ),
      focusedErrorBorder: outline.copyWith(
        borderSide: const BorderSide(color: NeoColors.incorrect, width: 3),
      ),
      errorStyle: const TextStyle(color: NeoColors.incorrect, fontSize: 13),
      errorMaxLines: 3,
      hintStyle: const TextStyle(color: Color(0x99000000)),
    ),
    textSelectionTheme: const TextSelectionThemeData(
      cursorColor: NeoColors.foreground,
      selectionColor: NeoColors.main,
      selectionHandleColor: NeoColors.softDet,
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: NeoColors.foreground,
    ),
    tooltipTheme: TooltipThemeData(
      decoration: Neo.box(),
      textStyle: const TextStyle(color: NeoColors.foreground, fontSize: 14),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      margin: const EdgeInsets.symmetric(horizontal: 24),
      showDuration: const Duration(seconds: 4),
      triggerMode: TooltipTriggerMode.tap,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: NeoColors.secondaryBackground,
      contentTextStyle: const TextStyle(color: NeoColors.foreground),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: Neo.borderRadius,
        side: const BorderSide(color: NeoColors.border, width: Neo.borderWidth),
      ),
    ),
    dividerColor: NeoColors.border,
  );
}
