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

/// The kit `Dialog` asking to confirm an action: [cancel] and [confirm]
/// buttons in its footer. Answers `true` only when [confirm] was pressed.
Future<bool> showNeoConfirm(
  BuildContext context, {
  required String title,
  required String description,
  required String confirm,
  required String cancel,
}) async {
  final confirmed = await showDialog<bool>(
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
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: NeoText.heading(22)),
            const SizedBox(height: 10),
            Text(description, style: NeoText.muted),
            const SizedBox(height: 20),
            Wrap(
              alignment: WrapAlignment.end,
              spacing: 12,
              runSpacing: 12,
              children: [
                NeoButton(
                  variant: NeoButtonVariant.neutral,
                  onPressed: () => Navigator.of(context).pop(false),
                  child: Text(cancel),
                ),
                NeoButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: Text(confirm),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );

  return confirmed ?? false;
}
