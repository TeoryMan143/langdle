import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/i18n/translations.dart';
import '../../../core/models/country.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/neo_button.dart';
import '../../../core/ui/neo_card.dart';
import '../../../core/ui/neo_dialog.dart';
import '../../lang_guess/history_controller.dart';
import '../../lang_guess/widgets/game_history.dart';
import '../../meta/meta_repository.dart';
import '../../user_profile/profile_controller.dart';
import '../../user_profile/widgets/profile_languages.dart';
import '../auth_controller.dart';
import '../auth_models.dart';
import '../widgets/country_field.dart';

/// The signed in user's account (the web `/account`): who is signed in, their
/// languages, their games, sign out and delete the account. The router only
/// opens it with a session, under a [ProfileController] and a
/// [HistoryController].
class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  Future<void> _signOut(BuildContext context) async {
    final auth = context.read<AuthController>();
    final locale = context.read<LocaleController>();
    final messenger = ScaffoldMessenger.of(context);

    await auth.signOut();
    messenger.showSnackBar(
      SnackBar(content: Text(locale.t('AccountPage.successSignOut'))),
    );
  }

  Future<void> _delete(BuildContext context) async {
    final auth = context.read<AuthController>();
    final locale = context.read<LocaleController>();
    final messenger = ScaffoldMessenger.of(context);
    final t = locale.t;

    final confirmed = await showNeoConfirm(
      context,
      title: t('AccountPage.deleteAccountTitle'),
      description: t('AccountPage.deleteAccountDescription'),
      confirm: t('AccountPage.deleteAccountConfirm'),
      cancel: t('AccountPage.cancel'),
    );

    if (!confirmed) return;

    try {
      await auth.deleteAccount();
      messenger.showSnackBar(
        SnackBar(content: Text(t('AccountPage.successDeleteAccount'))),
      );
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            t(
              e is ApiException && e.isNetwork
                  ? 'Mobile.connectionError'
                  : 'AccountPage.errorDeleteAccount',
            ),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final user = auth.user;

    if (user == null) {
      return const SizedBox.shrink();
    }

    return RefreshIndicator(
      color: NeoColors.foreground,
      backgroundColor: NeoColors.main,
      onRefresh: () => Future.wait([
        auth.refreshUser(),
        context.read<ProfileController>().load(),
        context.read<HistoryController>().load(),
      ]),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
        children: [
          Text(
            context.t('AccountPage.title'),
            textAlign: TextAlign.center,
            style: NeoText.display(52),
          ),
          const SizedBox(height: 16),
          NeoCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Eyebrow(context.t('AuthPage.nickname')),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Flexible(
                      child: Text(user.nickname, style: NeoText.heading(28)),
                    ),
                    if (user.admin) ...[
                      const SizedBox(width: 10),
                      const NeoPill(
                        color: NeoColors.main,
                        child: Icon(Icons.verified_user_rounded, size: 16),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                Eyebrow(context.t('AuthPage.email')),
                const SizedBox(height: 4),
                Text(user.email, style: NeoText.heading(16)),
                const SizedBox(height: 16),
                Eyebrow(context.t('AuthPage.country')),
                const SizedBox(height: 4),
                _CountryName(code: user.country),
                if (_providers(user) case final providers
                    when providers.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final provider in providers)
                        NeoPill(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.link_rounded, size: 16),
                              const SizedBox(width: 6),
                              Text(provider),
                            ],
                          ),
                        ),
                    ],
                  ),
                ],
                const SizedBox(height: 16),
                const Divider(thickness: Neo.borderWidth),
                const SizedBox(height: 16),
                const ProfileLanguages(),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const GameHistory(),
          const SizedBox(height: 24),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 12,
            runSpacing: 12,
            children: [
              NeoButton(
                onPressed: auth.busy ? null : () => _signOut(context),
                child: Text(
                  auth.busy
                      ? context.t('AccountPage.signingOut')
                      : context.t('AccountPage.signOut'),
                ),
              ),
              NeoButton(
                variant: NeoButtonVariant.neutral,
                onPressed: auth.busy ? null : () => _delete(context),
                child: Text(context.t('AccountPage.deleteAccount')),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// The providers linked to the account, by their brand names.
  static List<String> _providers(AuthUser user) => [
    if (user.googleId != null) 'Google',
    if (user.appleId != null) 'Apple',
  ];
}

class _CountryName extends StatefulWidget {
  const _CountryName({required this.code});

  final String code;

  @override
  State<_CountryName> createState() => _CountryNameState();
}

class _CountryNameState extends State<_CountryName> {
  late final Future<List<Country>> _countries;

  @override
  void initState() {
    super.initState();
    _countries = context.read<MetaRepository>().countries();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _countries,
      builder: (context, snapshot) {
        final name = snapshot.data
            ?.where((country) => country.code == widget.code)
            .firstOrNull
            ?.name;

        return Text(
          '${countryFlag(widget.code)}  ${name ?? widget.code}',
          style: NeoText.heading(16),
        );
      },
    );
  }
}
