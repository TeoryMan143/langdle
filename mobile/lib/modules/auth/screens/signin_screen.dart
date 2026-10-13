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
import '../widgets/oauth_buttons.dart';

/// Sign in with a nickname and password, Google or Apple (the web `/signin`).
/// Once signed in, the router moves on to `/account`, or claims the
/// permission link [redtk] came from.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key, this.redtk});

  final String? redtk;

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _nickname = TextEditingController();
  final _password = TextEditingController();
  Map<String, List<String>> _errors = const {};

  @override
  void dispose() {
    _nickname.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final auth = context.read<AuthController>();
    final locale = context.read<LocaleController>();
    final messenger = ScaffoldMessenger.of(context);

    if (auth.busy) return;

    setState(() => _errors = const {});

    try {
      await auth.signIn(nickname: _nickname.text, password: _password.text);
      TextInput.finishAutofillContext();
      messenger.showSnackBar(
        SnackBar(content: Text(locale.t('AuthPage.signedIn'))),
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
      title: context.t('AuthPage.signIn'),
      children: [
        AuthTextField(
          controller: _nickname,
          hint: context.t('AuthPage.nickname'),
          errors: _errors['nickname'],
          autofillHints: const [AutofillHints.username],
        ),
        const SizedBox(height: 12),
        AuthTextField(
          controller: _password,
          hint: context.t('AuthPage.password'),
          errors: _errors['password'],
          password: true,
          autofillHints: const [AutofillHints.password],
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _submit(),
        ),
        const SizedBox(height: 20),
        NeoButton(
          onPressed: busy ? null : _submit,
          child: Text(
            busy
                ? context.t('AuthPage.signingIn')
                : context.t('AuthPage.signIn'),
            textAlign: TextAlign.center,
          ),
        ),
        OAuthButtons(redtk: widget.redtk),
        const SizedBox(height: 12),
        AuthSwitchLink(
          question: context.t('AuthPage.noAccount'),
          action: context.t('AuthPage.signUpHere'),
          onTap: () => context.go(withRedirectToken('/signup', widget.redtk)),
        ),
      ],
    );
  }
}
