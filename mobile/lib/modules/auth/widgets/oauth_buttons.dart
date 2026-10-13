import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/i18n/translations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/neo_button.dart';
import '../auth_controller.dart';
import '../auth_models.dart';
import '../auth_routes.dart';

/// The web `Google` icon (`core/components/icons/google.tsx`).
const _googleLogo = '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
<path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917"/>
<path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691"/>
<path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.9 11.9 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44"/>
<path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917"/>
</svg>''';

/// "or", then a button per provider available on this device. Signing in
/// with an unknown account continues on `/endgoogle`, where the user picks a
/// nickname and a country (the web flow's page of the same path).
class OAuthButtons extends StatefulWidget {
  const OAuthButtons({super.key, this.redtk});

  /// The token of the permission link that sent the user to sign in.
  final String? redtk;

  @override
  State<OAuthButtons> createState() => _OAuthButtonsState();
}

class _OAuthButtonsState extends State<OAuthButtons> {
  late final Future<bool> _apple;

  @override
  void initState() {
    super.initState();
    _apple = context.read<AuthController>().appleAvailable();
  }

  Future<void> _signIn(OAuthProvider provider) async {
    final auth = context.read<AuthController>();
    final locale = context.read<LocaleController>();
    final messenger = ScaffoldMessenger.of(context);
    final router = GoRouter.of(context);

    try {
      switch (await auth.signInWith(provider)) {
        case null:
          return;
        case OAuthSignedIn():
          // The router leaves the sign in screens once the session opens.
          messenger.showSnackBar(
            SnackBar(content: Text(locale.t('AuthPage.signedIn'))),
          );
        case OAuthNeedsSignup(:final data):
          router.go(withRedirectToken('/endgoogle', widget.redtk), extra: data);
      }
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(content: Text(locale.t(authErrorKey(locale, e)))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();

    return FutureBuilder(
      future: _apple,
      builder: (context, snapshot) {
        final apple = snapshot.data ?? false;

        if (!auth.googleAvailable && !apple) {
          return const SizedBox.shrink();
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 16),
            Row(
              children: [
                const Expanded(child: Divider(thickness: Neo.borderWidth)),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(
                    context.t('Mobile.or').toUpperCase(),
                    style: NeoText.eyebrow(),
                  ),
                ),
                const Expanded(child: Divider(thickness: Neo.borderWidth)),
              ],
            ),
            const SizedBox(height: 16),
            if (auth.googleAvailable)
              _ProviderButton(
                icon: SvgPicture.string(_googleLogo, width: 20, height: 20),
                label: context.t('Mobile.continueWithGoogle'),
                onPressed: auth.busy
                    ? null
                    : () => _signIn(OAuthProvider.google),
              ),
            if (auth.googleAvailable && apple) const SizedBox(height: 12),
            if (apple)
              _ProviderButton(
                icon: const Icon(Icons.apple, size: 22),
                label: context.t('Mobile.continueWithApple'),
                onPressed: auth.busy
                    ? null
                    : () => _signIn(OAuthProvider.apple),
              ),
          ],
        );
      },
    );
  }
}

class _ProviderButton extends StatelessWidget {
  const _ProviderButton({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final Widget icon;
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return NeoButton(
      variant: NeoButtonVariant.neutral,
      onPressed: onPressed,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          icon,
          const SizedBox(width: 10),
          Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }
}
