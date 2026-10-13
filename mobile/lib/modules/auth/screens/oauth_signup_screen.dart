import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/i18n/translations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/neo_button.dart';
import '../../../core/ui/neo_card.dart';
import '../auth_controller.dart';
import '../auth_models.dart';
import '../auth_routes.dart';
import '../widgets/auth_form_card.dart';
import '../widgets/auth_text_field.dart';
import '../widgets/country_field.dart';

/// Finishes a Google / Apple sign up: the user confirms a nickname and picks
/// a country (the web `/endgoogle`, used for both providers).
class OAuthSignUpScreen extends StatefulWidget {
  const OAuthSignUpScreen({super.key, required this.data, this.redtk});

  final OAuthSignupData data;

  /// The token of the permission link that started the sign in.
  final String? redtk;

  @override
  State<OAuthSignUpScreen> createState() => _OAuthSignUpScreenState();
}

class _OAuthSignUpScreenState extends State<OAuthSignUpScreen> {
  late final _nickname = TextEditingController(text: widget.data.nickname);
  String? _country = deviceCountryCode();
  Map<String, List<String>> _errors = const {};

  @override
  void dispose() {
    _nickname.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final auth = context.read<AuthController>();
    final locale = context.read<LocaleController>();
    final messenger = ScaffoldMessenger.of(context);

    if (auth.busy) return;

    setState(() => _errors = const {});

    try {
      await auth.completeOAuthSignUp(
        widget.data,
        nickname: _nickname.text.trim(),
        country: _country ?? '',
      );
      messenger.showSnackBar(
        SnackBar(content: Text(locale.t('AuthPage.accountCreated'))),
      );
    } catch (e) {
      if (mounted && e is ApiException) {
        setState(() => _errors = e.fieldErrors);
      }
      messenger.showSnackBar(
        SnackBar(content: Text(locale.t(authErrorKey(locale, e)))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final busy = context.select<AuthController, bool>((auth) => auth.busy);
    final email = widget.data.email;

    return AuthFormCard(
      title: context.t('AuthPage.almostDone'),
      subtitle: context.t('Mobile.finishSignup'),
      children: [
        if (email.isNotEmpty) ...[
          Eyebrow(context.t('AuthPage.email')),
          const SizedBox(height: 4),
          Text(email, style: NeoText.heading(16)),
          const SizedBox(height: 16),
        ],
        AuthTextField(
          controller: _nickname,
          hint: widget.data.nickname.isEmpty
              ? context.t('AuthPage.nickname')
              : widget.data.nickname,
          errors: _errors['nickname'],
          autofillHints: const [AutofillHints.newUsername],
          textInputAction: TextInputAction.done,
        ),
        const SizedBox(height: 12),
        CountryField(
          value: _country,
          errors: _errors['country'],
          onChanged: (code) => setState(() => _country = code),
        ),
        const SizedBox(height: 20),
        NeoButton(
          onPressed: busy ? null : _submit,
          child: Text(
            busy
                ? context.t('AuthPage.signingUp')
                : context.t('AuthPage.createAccount'),
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: 12),
        NeoButton(
          variant: NeoButtonVariant.neutral,
          onPressed: busy
              ? null
              : () => context.go(withRedirectToken('/signin', widget.redtk)),
          child: Text(
            context.t('AccountPage.cancel'),
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }
}
