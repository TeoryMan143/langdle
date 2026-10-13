import 'package:flutter/material.dart';

import '../i18n/translations.dart';
import '../theme/tokens.dart';

enum FeatureMatch { correct, partial, incorrect }

enum FeatureStatus { present, partial, absent }

/// Shows the feature description on tap, the touch version of the web
/// `FeatureTooltip`.
class FeatureTooltip extends StatelessWidget {
  const FeatureTooltip({super.key, required this.feature, required this.child});

  final String feature;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: context.t('Features.description.$feature'),
      child: child,
    );
  }
}

/// A feature of a guess and how it matches the target (the web `Feature`).
class FeatureResult extends StatelessWidget {
  const FeatureResult({super.key, required this.feature, required this.match});

  final String feature;
  final FeatureMatch match;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = switch (match) {
      FeatureMatch.correct => (Icons.check_rounded, NeoColors.correct),
      FeatureMatch.partial => (Icons.circle, NeoColors.partial),
      FeatureMatch.incorrect => (Icons.close_rounded, NeoColors.incorrect),
    };

    return FeatureTooltip(
      feature: feature,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: NeoColors.featureSurface,
          borderRadius: BorderRadius.circular(3),
          border: Border.all(color: NeoColors.softDet),
          boxShadow: const [
            BoxShadow(
              color: Color(0x22000000),
              blurRadius: 12,
              offset: Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: match == FeatureMatch.partial ? 14 : 20,
              color: color,
            ),
            const SizedBox(width: 6),
            Flexible(child: Text(context.t('Features.name.$feature'))),
          ],
        ),
      ),
    );
  }
}

/// A feature of a language in the atlas: green present, amber partial, muted
/// absent.
class FeatureStatusChip extends StatelessWidget {
  const FeatureStatusChip({
    super.key,
    required this.feature,
    required this.status,
  });

  final String feature;
  final FeatureStatus status;

  @override
  Widget build(BuildContext context) {
    final (surface, border, text) = switch (status) {
      FeatureStatus.present => (
        NeoColors.presentSurface,
        NeoColors.presentBorder,
        NeoColors.presentText,
      ),
      FeatureStatus.partial => (
        NeoColors.partialSurface,
        NeoColors.partialBorder,
        NeoColors.partialText,
      ),
      FeatureStatus.absent => (
        NeoColors.secondaryBackground,
        NeoColors.border,
        const Color(0xA6000000),
      ),
    };

    return FeatureTooltip(
      feature: feature,
      child: Opacity(
        opacity: status == FeatureStatus.absent ? 0.8 : 1,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: surface,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: border),
          ),
          child: Text(
            context.t('Features.name.$feature'),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: text,
            ),
          ),
        ),
      ),
    );
  }
}
