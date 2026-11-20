import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/i18n/translations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/async_view.dart';
import '../../../core/ui/lang_flag.dart';
import '../../../core/ui/neo_button.dart';
import '../../../core/ui/neo_card.dart';
import '../permission_controller.dart';

/// Where a shared edit link lands (the web `/addpermission?token=`). The
/// router sends a signed out user to sign up first and back here after.
class AddPermissionScreen extends StatelessWidget {
  const AddPermissionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final claim = context.watch<PermissionController>();

    if (claim.status == ClaimStatus.claiming) {
      return const NeoLoading();
    }

    final granted = claim.status == ClaimStatus.granted;
    final language = claim.language;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
      children: [
        NeoCard(
          color: granted ? NeoColors.main : NeoColors.secondaryBackground,
          child: Column(
            children: [
              Icon(
                granted ? Icons.verified_rounded : Icons.link_off_rounded,
                size: 40,
              ),
              const SizedBox(height: 12),
              if (granted && language != null) ...[
                Text(
                  context.t('AddPermissionPage.permissionSet'),
                  textAlign: TextAlign.center,
                  style: NeoText.heading(26),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    LangFlag(language.id),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        language.label(context),
                        style: NeoText.heading(18),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  context.t('AddPermissionPage.nowHavePermission', {
                    'lang': language.name,
                  }),
                  textAlign: TextAlign.center,
                  style: NeoText.muted,
                ),
              ] else
                Text(
                  context.watch<LocaleController>().maybe(claim.errorKey) ??
                      context.t('AddPermissionPage.errors.unknown'),
                  textAlign: TextAlign.center,
                  style: NeoText.heading(20),
                ),
              const SizedBox(height: 20),
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 12,
                runSpacing: 12,
                children: [
                  if (claim.canRetry)
                    NeoButton(
                      onPressed: claim.claim,
                      child: Text(context.t('Mobile.retry')),
                    ),
                  NeoButton(
                    variant: NeoButtonVariant.neutral,
                    onPressed: () => context.go(granted ? '/data/public' : '/'),
                    child: Text(
                      context.t(
                        granted
                            ? 'AddPermissionPage.goLangList'
                            : 'AddPermissionPage.goHome',
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
