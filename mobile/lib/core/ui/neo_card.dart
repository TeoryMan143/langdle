import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// A bordered surface: `rounded-base border-2 border-border` with or without
/// `shadow-shadow`.
class NeoCard extends StatelessWidget {
  const NeoCard({
    super.key,
    required this.child,
    this.color = NeoColors.secondaryBackground,
    this.shadow = true,
    this.padding = const EdgeInsets.all(20),
    this.width,
  });

  final Widget child;
  final Color color;
  final bool shadow;
  final EdgeInsetsGeometry padding;
  final double? width;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      padding: padding,
      decoration: Neo.box(color: color, shadow: shadow),
      child: child,
    );
  }
}

/// The small uppercase monospace label above a title.
class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key, this.color = NeoColors.softDet});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Text(text.toUpperCase(), style: NeoText.eyebrow(color: color));
  }
}

/// A rounded pill with the 2px border, used for badges and tags.
class NeoPill extends StatelessWidget {
  const NeoPill({
    super.key,
    required this.child,
    this.color = NeoColors.secondaryBackground,
  });

  final Widget child;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
        border: Neo.border,
      ),
      child: DefaultTextStyle.merge(
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
        child: child,
      ),
    );
  }
}
