import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/i18n/translations.dart';
import 'core/shell/app_shell.dart';
import 'modules/auth/auth_controller.dart';
import 'modules/auth/auth_models.dart';
import 'modules/auth/auth_routes.dart';
import 'modules/auth/screens/account_screen.dart';
import 'modules/auth/screens/oauth_signup_screen.dart';
import 'modules/auth/screens/signin_screen.dart';
import 'modules/auth/screens/signup_screen.dart';
import 'modules/how_to_play/how_to_play_screen.dart';
import 'modules/lang_data/lang_repository.dart';
import 'modules/lang_data/permission_controller.dart';
import 'modules/lang_data/screens/add_permission_screen.dart';
import 'modules/lang_data/screens/atlas_screen.dart';
import 'modules/lang_guess/game_controller.dart';
import 'modules/lang_guess/guess_models.dart';
import 'modules/lang_guess/guess_repository.dart';
import 'modules/lang_guess/history_controller.dart';
import 'modules/lang_guess/widgets/game_view.dart';
import 'modules/user_profile/profile_controller.dart';
import 'modules/user_profile/profile_repository.dart';

/// The locale prefix of a web URL (`/es/addpermission`): the app keeps the
/// locale apart, so a link opened in it drops the prefix.
final _localePrefix = RegExp(
  '^/(${LocaleController.supported.join('|')})(?=/|\$)',
);

/// Where a navigation to [uri] really goes: web links lose their locale
/// prefix, `/account` needs a session and the sign in screens need none. A
/// permission link (`/addpermission?token=`) without a session goes to sign
/// up carrying its token as `redtk`, and comes back once signed in.
String? routeRedirect(Uri uri, {required bool signedIn, Object? extra}) {
  if (_localePrefix.hasMatch(uri.path)) {
    final path = uri.path.replaceFirst(_localePrefix, '');
    return uri.replace(path: path.isEmpty ? '/' : path).toString();
  }

  final path = uri.path;
  final redtk = uri.queryParameters['redtk'];

  if (signedIn) {
    if (!signedOutPaths.contains(path)) return null;

    return redtk == null || redtk.isEmpty
        ? '/account'
        : addPermissionPath(redtk);
  }

  final token = uri.queryParameters['token'];

  if (path == '/addpermission' && token != null && token.isNotEmpty) {
    return withRedirectToken('/signup', token);
  }

  if (path == '/account' ||
      (path == '/endgoogle' && extra is! OAuthSignupData)) {
    return withRedirectToken('/signin', redtk);
  }

  return null;
}

/// Paths mirror the web routes, so links can be shared between both.
GoRouter buildRouter(AuthController auth) => GoRouter(
  initialLocation: '/',
  refreshListenable: auth.signedInChanges,
  redirect: (context, state) =>
      routeRedirect(state.uri, signedIn: auth.signedIn, extra: state.extra),
  routes: [
    StatefulShellRoute.indexedStack(
      builder: (context, state, shell) => AppShell(shell: shell),
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(path: '/', builder: (_, _) => _game(GameType.daily)),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(path: '/random', builder: (_, _) => _game(GameType.random)),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/data/public',
              builder: (_, _) => const AtlasScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/howtoplay',
              builder: (_, _) => const HowToPlayScreen(),
            ),
          ],
        ),
        // The account tab: the account itself with a session, the sign in
        // screens without one.
        StatefulShellBranch(
          routes: [
            GoRoute(path: '/account', builder: (_, _) => _account()),
            GoRoute(
              path: '/signin',
              builder: (_, state) =>
                  SignInScreen(redtk: state.uri.queryParameters['redtk']),
            ),
            GoRoute(
              path: '/signup',
              builder: (_, state) =>
                  SignUpScreen(redtk: state.uri.queryParameters['redtk']),
            ),
            GoRoute(
              path: '/endgoogle',
              builder: (_, state) => OAuthSignUpScreen(
                data: state.extra! as OAuthSignupData,
                redtk: state.uri.queryParameters['redtk'],
              ),
            ),
            GoRoute(
              path: '/addpermission',
              builder: (_, state) =>
                  _addPermission(state.uri.queryParameters['token']),
            ),
          ],
        ),
      ],
    ),
  ],
);

Widget _game(GameType type) => ChangeNotifierProvider(
  create: (context) => GameController(
    type: type,
    langs: context.read<LangRepository>(),
    guesses: context.read<GuessRepository>(),
    saves: context.read<DailySaveStore>(),
    auth: context.read<AuthController>(),
  ),
  child: const GameView(),
);

Widget _account() => MultiProvider(
  providers: [
    ChangeNotifierProvider(
      create: (context) => ProfileController(
        auth: context.read<AuthController>(),
        langs: context.read<LangRepository>(),
        profile: context.read<ProfileRepository>(),
      ),
    ),
    ChangeNotifierProvider(
      create: (context) => HistoryController(
        guesses: context.read<GuessRepository>(),
        langs: context.read<LangRepository>(),
      ),
    ),
  ],
  child: const AccountScreen(),
);

/// Keyed by the token: a second link opened over the first claims again.
Widget _addPermission(String? token) => ChangeNotifierProvider(
  key: ValueKey(token),
  create: (context) =>
      PermissionController(token: token, langs: context.read<LangRepository>()),
  child: const AddPermissionScreen(),
);
