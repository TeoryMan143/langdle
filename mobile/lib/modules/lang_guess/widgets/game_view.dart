import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/i18n/translations.dart';
import '../../../core/models/language.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/async_view.dart';
import '../../../core/ui/lang_flag.dart';
import '../../../core/ui/neo_button.dart';
import '../../../core/ui/neo_dialog.dart';
import '../game_controller.dart';
import 'daily_timer.dart';
import 'guess_search.dart';
import 'guesses_list.dart';

/// A whole game screen, daily or random, driven by the [GameController]
/// above it.
class GameView extends StatelessWidget {
  const GameView({super.key});

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameController>();

    return switch (game.status) {
      GameStatus.loading => const NeoLoading(),
      GameStatus.error => NeoError(error: game.error!, onRetry: game.start),
      _ => RefreshIndicator(
        color: NeoColors.foreground,
        backgroundColor: NeoColors.main,
        onRefresh: game.start,
        child: ListView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
          children: [
            Text(
              context.t(
                game.type == GameType.daily ? 'Home.title' : 'Game.guessRandom',
              ),
              textAlign: TextAlign.center,
              style: NeoText.display(44),
            ),
            if (game.type == GameType.random) ...[
              const SizedBox(height: 8),
              Center(
                child: NeoButton(
                  variant: NeoButtonVariant.neutral,
                  onPressed: game.start,
                  semanticLabel: context.t('Mobile.newRandom'),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.shuffle_rounded),
                      const SizedBox(width: 8),
                      Text(context.t('Mobile.newRandom')),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),
            GuessSearch(
              onOutcome: (outcome) => _showResult(context, outcome, game),
            ),
            const SizedBox(height: 20),
            const _Status(),
            if (game.type == GameType.daily) ...[
              const SizedBox(height: 8),
              Center(child: DailyTimer(onReset: game.refreshIfNewDay)),
            ],
            const SizedBox(height: 20),
            const GuessesList(),
          ],
        ),
      ),
    };
  }

  void _showResult(
    BuildContext context,
    GuessOutcome outcome,
    GameController game,
  ) {
    final target = game.target;

    if (target == null ||
        (outcome != GuessOutcome.won && outcome != GuessOutcome.lost)) {
      return;
    }

    final won = outcome == GuessOutcome.won;
    final t = context.read<LocaleController>().t;

    showNeoDialog(
      context,
      title: t(won ? 'Game.congrats' : 'Game.nextOne'),
      child: Column(
        children: [
          Text(
            t(won ? 'Game.youGuessed' : 'Game.theLangWas', {
              'lang': target.name,
            }),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          LangFlag(target.id, width: 192, height: 128),
        ],
      ),
    );
  }
}

/// Attempts left while playing, the target once the game is over.
class _Status extends StatelessWidget {
  const _Status();

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameController>();
    const style = TextStyle(color: Color(0xFF4B5563));

    if (!game.finished) {
      return Text(
        '${context.t('Game.attLeft')}: ${game.attemptsLeft}',
        textAlign: TextAlign.center,
        style: style,
      );
    }

    final Language target = game.target!;

    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 8,
      children: [
        Text(
          '${context.t(game.type == GameType.daily ? 'Game.dailyLang' : 'Game.randomLang')}:',
          style: style,
        ),
        LangFlag(target.id),
        Text(target.label(context), style: style),
      ],
    );
  }
}
