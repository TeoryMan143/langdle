import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/shell/app_shell.dart';
import 'modules/how_to_play/how_to_play_screen.dart';
import 'modules/lang_data/lang_repository.dart';
import 'modules/lang_data/screens/atlas_screen.dart';
import 'modules/lang_guess/game_controller.dart';
import 'modules/lang_guess/guess_repository.dart';
import 'modules/lang_guess/widgets/game_view.dart';

/// Paths mirror the web routes, so links can be shared between both.
GoRouter buildRouter() => GoRouter(
  initialLocation: '/',
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
  ),
  child: const GameView(),
);
