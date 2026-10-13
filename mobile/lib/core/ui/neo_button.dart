import 'package:flutter/material.dart';

import '../theme/tokens.dart';

enum NeoButtonVariant {
  /// `bg-main` with the hard shadow: the primary action.
  main,

  /// White surface with the hard shadow.
  neutral,

  /// Flush in a bar, without shadow (the header icons).
  noShadow,
}

/// The kit `Button`: 2px border, `rounded-base`, and the shadow it "presses"
/// into while touched (the touch version of the web hover translate).
class NeoButton extends StatefulWidget {
  const NeoButton({
    super.key,
    required this.child,
    required this.onPressed,
    this.variant = NeoButtonVariant.main,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
    this.color,
    this.semanticLabel,
  });

  final Widget child;
  final VoidCallback? onPressed;
  final NeoButtonVariant variant;
  final EdgeInsetsGeometry padding;

  /// Overrides the surface colour of the variant.
  final Color? color;
  final String? semanticLabel;

  @override
  State<NeoButton> createState() => _NeoButtonState();
}

class _NeoButtonState extends State<NeoButton> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed != value) {
      setState(() => _pressed = value);
    }
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null;
    final hasShadow = widget.variant != NeoButtonVariant.noShadow;
    final pressed = _pressed && enabled && hasShadow;

    final surface =
        widget.color ??
        switch (widget.variant) {
          NeoButtonVariant.main => NeoColors.main,
          NeoButtonVariant.neutral ||
          NeoButtonVariant.noShadow => NeoColors.secondaryBackground,
        };

    return Semantics(
      button: true,
      enabled: enabled,
      label: widget.semanticLabel,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: enabled ? (_) => _setPressed(true) : null,
        onTapUp: enabled ? (_) => _setPressed(false) : null,
        onTapCancel: () => _setPressed(false),
        onTap: widget.onPressed,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 90),
          curve: Curves.easeOut,
          transform: Matrix4.translationValues(
            pressed ? Neo.shadowOffset.dx : 0,
            pressed ? Neo.shadowOffset.dy : 0,
            0,
          ),
          padding: widget.padding,
          decoration: BoxDecoration(
            color: enabled ? surface : surface.withValues(alpha: 0.5),
            border: Neo.border,
            borderRadius: Neo.borderRadius,
            boxShadow: hasShadow && !pressed ? Neo.shadow : const [],
          ),
          child: DefaultTextStyle.merge(
            style: const TextStyle(
              color: NeoColors.foreground,
              fontWeight: FontWeight.w500,
              fontSize: 15,
            ),
            child: IconTheme.merge(
              data: const IconThemeData(color: NeoColors.foreground, size: 20),
              child: widget.child,
            ),
          ),
        ),
      ),
    );
  }
}
