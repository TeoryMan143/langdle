import 'package:flutter/material.dart';

import '../i18n/translations.dart';
import '../theme/tokens.dart';
import 'neo_button.dart';

/// The kit `Dialog`: `bg-background`, 2px border and hard shadow over the
/// `bg-overlay` backdrop, with a close action.
Future<void> showNeoDialog(
  BuildContext context, {
  required String title,
  required Widget child,
}) {
  return showDialog<void>(
    context: context,
    barrierColor: NeoColors.overlay,
    builder: (context) => Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      insetPadding: const EdgeInsets.all(24),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: Neo.box(color: NeoColors.background),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              textAlign: TextAlign.center,
              style: NeoText.heading(22),
            ),
            const SizedBox(height: 16),
            child,
            const SizedBox(height: 20),
            NeoButton(
              variant: NeoButtonVariant.neutral,
              onPressed: () => Navigator.of(context).pop(),
              child: Text(context.t('Mobile.close')),
            ),
          ],
        ),
      ),
    ),
  );
}
