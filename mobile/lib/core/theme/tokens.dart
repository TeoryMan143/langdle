import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// The neobrutalism tokens of the web app (`src/app/[locale]/globals.css`),
/// converted from oklch. Use these instead of raw colours.
abstract final class NeoColors {
  static const background = Color(0xFFDCEBFE);
  static const secondaryBackground = Color(0xFFFFFFFF);
  static const foreground = Color(0xFF000000);
  static const main = Color(0xFF6EA5FF);
  static const mainForeground = Color(0xFF000000);
  static const softDet = Color(0xFF375B93);
  static const border = Color(0xFF000000);
  static const overlay = Color(0xCC000000);

  /// Surface of a feature result in the guesses list.
  static const featureSurface = Color(0xFFFDFBFB);

  // Game semantic colours: the one allowed exception to the palette.
  static const correct = main;
  static const partial = Color(0xFFFBBF24);
  static const incorrect = Color(0xFFFF2C2C);

  static const presentBorder = Color(0xFF059669);
  static const presentSurface = Color(0xFFD1FAE5);
  static const presentText = Color(0xFF022C22);
  static const presentIcon = Color(0xFF047857);
  static const partialBorder = Color(0xFFF59E0B);
  static const partialSurface = Color(0xFFFEF3C7);
  static const partialText = Color(0xFF451A03);
  static const partialIcon = Color(0xFFB45309);
  static const absentIcon = Color(0xFF475569);
}

/// Shape tokens: 2px borders, `rounded-base` (5px) and the hard 4px shadow.
abstract final class Neo {
  static const borderWidth = 2.0;
  static const radius = 5.0;
  static const shadowOffset = Offset(4, 4);

  static final borderRadius = BorderRadius.circular(radius);
  static final border = Border.all(color: NeoColors.border, width: borderWidth);
  static const shadow = [
    BoxShadow(color: NeoColors.border, offset: shadowOffset),
  ];

  static BoxDecoration box({
    Color color = NeoColors.secondaryBackground,
    bool shadow = true,
  }) => BoxDecoration(
    color: color,
    border: border,
    borderRadius: borderRadius,
    boxShadow: shadow ? Neo.shadow : null,
  );
}

/// Type helpers: Dongle for the display titles, Noto Sans for the rest and a
/// monospace face for the small uppercase eyebrows.
abstract final class NeoText {
  static TextStyle display(double size, {Color color = NeoColors.foreground}) =>
      GoogleFonts.dongle(fontSize: size, height: 0.9, color: color);

  static TextStyle heading(double size) => TextStyle(
    fontSize: size,
    fontWeight: FontWeight.w700,
    color: NeoColors.foreground,
    height: 1.1,
  );

  static TextStyle eyebrow({Color color = NeoColors.softDet}) =>
      GoogleFonts.robotoMono(
        fontSize: 11,
        letterSpacing: 2.2,
        color: color,
        fontWeight: FontWeight.w500,
      );

  static const muted = TextStyle(
    fontSize: 14,
    height: 1.5,
    color: Color(0xCC000000),
  );
}
