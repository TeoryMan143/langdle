import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/i18n/translations.dart';
import '../../../core/models/language.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/lang_flag.dart';
import '../../../core/ui/neo_button.dart';
import '../../../core/ui/neo_card.dart';
import '../profile_controller.dart';
import 'language_picker.dart';

/// The native and fluent languages of the account, editable (the web
/// `NativeLang` and `FluentLangs`). Needs a [ProfileController] above it.
class ProfileLanguages extends StatelessWidget {
  const ProfileLanguages({super.key});

  Future<void> _edit(
    BuildContext context,
    Future<void> Function() edit,
    String successKey,
  ) async {
    final t = context.read<LocaleController>().t;
    final messenger = ScaffoldMessenger.of(context);

    try {
      await edit();
      messenger.showSnackBar(SnackBar(content: Text(t(successKey))));
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            t(
              e is ApiException && e.isNetwork
                  ? 'Mobile.connectionError'
                  : 'AccountPage.unknownError',
            ),
          ),
        ),
      );
    }
  }

  Future<void> _pickNative(BuildContext context) async {
    final profile = context.read<ProfileController>();
    final picked = await showLanguagePicker(
      context,
      title: context.read<LocaleController>().t('AccountPage.nativeLang'),
      languages: profile.languages ?? const [],
      excluded: {?profile.nativeId},
    );

    if (picked != null && context.mounted) {
      await _edit(
        context,
        () => profile.setNative(picked),
        'AccountPage.newNative',
      );
    }
  }

  Future<void> _addFluent(BuildContext context) async {
    final profile = context.read<ProfileController>();
    final picked = await showLanguagePicker(
      context,
      title: context.read<LocaleController>().t('AccountPage.fluentLang'),
      languages: profile.languages ?? const [],
      excluded: profile.fluentIds.toSet(),
    );

    if (picked != null && context.mounted) {
      await _edit(
        context,
        () => profile.addFluent(picked),
        'AccountPage.newFluent',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = context.watch<ProfileController>();
    final languages = profile.languages;

    if (languages == null) {
      return profile.error == null
          ? const Padding(
              padding: EdgeInsets.all(12),
              child: Center(child: CircularProgressIndicator(strokeWidth: 3)),
            )
          : Row(
              children: [
                Expanded(
                  child: Text(
                    context.t('AccountPage.unknownError'),
                    style: NeoText.muted,
                  ),
                ),
                NeoButton(
                  variant: NeoButtonVariant.neutral,
                  onPressed: profile.load,
                  child: Text(context.t('Mobile.retry')),
                ),
              ],
            );
    }

    final nativeId = profile.nativeId;
    final busy = profile.saving;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Eyebrow(context.t('AccountPage.nativeLang')),
        const SizedBox(height: 6),
        if (nativeId == null)
          _AddButton(
            label: context.t('AccountPage.addNativeLang'),
            onPressed: busy ? null : () => _pickNative(context),
          )
        else
          _LanguageRow(
            id: nativeId,
            language: profile.language(nativeId),
            icon: Icons.edit_rounded,
            semanticLabel: context.t('Mobile.edit'),
            onPressed: busy ? null : () => _pickNative(context),
          ),
        const SizedBox(height: 16),
        Eyebrow(context.t('AccountPage.fluentLang')),
        const SizedBox(height: 6),
        for (final id in profile.fluentIds) ...[
          _LanguageRow(
            id: id,
            language: profile.language(id),
            icon: Icons.close_rounded,
            semanticLabel: context.t('Mobile.remove'),
            onPressed: busy
                ? null
                : () => _edit(
                    context,
                    () => profile.removeFluent(id),
                    'AccountPage.fluentRemoved',
                  ),
          ),
          const SizedBox(height: 8),
        ],
        _AddButton(
          label: context.t('AccountPage.addFluentLang'),
          onPressed: busy ? null : () => _addFluent(context),
        ),
      ],
    );
  }
}

class _LanguageRow extends StatelessWidget {
  const _LanguageRow({
    required this.id,
    required this.language,
    required this.icon,
    required this.semanticLabel,
    required this.onPressed,
  });

  final String id;

  /// `null` when the language left the catalogue: the id is shown instead.
  final Language? language;
  final IconData icon;
  final String semanticLabel;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        LangFlag(id),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            language?.label(context) ?? id,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
        NeoButton(
          variant: NeoButtonVariant.noShadow,
          semanticLabel: semanticLabel,
          padding: const EdgeInsets.all(6),
          onPressed: onPressed,
          child: Icon(icon, size: 18),
        ),
      ],
    );
  }
}

class _AddButton extends StatelessWidget {
  const _AddButton({required this.label, required this.onPressed});

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return NeoButton(
      variant: NeoButtonVariant.neutral,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      onPressed: onPressed,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.add_rounded, size: 18),
          const SizedBox(width: 6),
          Text(label),
        ],
      ),
    );
  }
}
