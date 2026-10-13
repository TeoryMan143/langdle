import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_client.dart';
import '../../../core/i18n/translations.dart';
import '../../../core/ui/neo_button.dart';
import '../auth_controller.dart';
import '../auth_routes.dart';
import '../widgets/auth_form_card.dart';
import '../widgets/auth_text_field.dart';
import '../widgets/country_field.dart';
import '../widgets/oauth_buttons.dart';

/// Creates an account with a password, or through Google / Apple (the web
/// `/signup`). The API validates the fields; its messages show under each.
class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key, this.redtk});

  /// The token of the permission link that sent the user here.
  final String? redtk;

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _nickname = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  String? _country = deviceCountryCode();
  Map<String, List<String>> _errors = const {};

  @override
  void initState() {
    super.initState();

    if (widget.redtk != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              context.read<LocaleController>().t('AuthPage.needAccountForPerm'),
            ),
          ),
        );
      });
    }
  }

  @override
  void dispose() {
    _nickname.dispose();
    _email.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final auth = context.read<AuthController>();
    final locale = context.read<LocaleController>();
    final messenger = ScaffoldMessenger.of(context);

    if (auth.busy) return;

    setState(() => _errors = const {});

    try {
      await auth.signUp(
        nickname: _nickname.text,
        email: _email.text,
        password: _password.text,
        confirmPassword: _confirmPassword.text,
        country: _country ?? '',
      );
      TextInput.finishAutofillContext();
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

    return AuthFormCard(
      title: context.t('AuthPage.signUp'),
      children: [
        AuthTextField(
          controller: _nickname,
          hint: context.t('AuthPage.nickname'),
          errors: _errors['nickname'],
          autofillHints: const [AutofillHints.newUsername],
        ),
        const SizedBox(height: 12),
        AuthTextField(
          controller: _email,
          hint: context.t('AuthPage.email'),
          errors: _errors['email'],
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email],
        ),
        const SizedBox(height: 12),
        AuthTextField(
          controller: _password,
          hint: context.t('AuthPage.password'),
          errors: _errors['password'],
          password: true,
          autofillHints: const [AutofillHints.newPassword],
        ),
        const SizedBox(height: 12),
        AuthTextField(
          controller: _confirmPassword,
          hint: context.t('AuthPage.confirmPassword'),
          errors: _errors['confirmPassword'],
          password: true,
          autofillHints: const [AutofillHints.newPassword],
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
        OAuthButtons(redtk: widget.redtk),
        const SizedBox(height: 12),
        AuthSwitchLink(
          question: context.t('AuthPage.alreadyHaveAccount'),
          action: context.t('AuthPage.signInHere'),
          onTap: () => context.go(withRedirectToken('/signin', widget.redtk)),
        ),
      ],
    );
  }
}
