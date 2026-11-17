import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/i18n/translations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/feature_chip.dart';
import '../../../core/ui/lang_flag.dart';
import '../../../core/ui/neo_card.dart';
import '../game_controller.dart';
import '../guess_models.dart';

/// The guesses so far, newest first, each with its feature matching (the web
/// `GuessesTable`, as stacked rows for a narrow screen).
class GuessesList extends StatelessWidget {
  const GuessesList({super.key});

  @override
  Widget build(BuildContext context) {
    final guesses = context.watch<GameController>().guesses;

    return Container(
      decoration: Neo.box(),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            color: NeoColors.main,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Text(context.t('Game.lang'), style: NeoText.heading(16)),
                const Spacer(),
                Text(context.t('Game.features'), style: NeoText.heading(16)),
              ],
            ),
          ),
          const Divider(height: Neo.borderWidth, thickness: Neo.borderWidth),
          if (guesses.isEmpty)
            Container(
              color: NeoColors.background,
              padding: const EdgeInsets.all(24),
              child: Text(
                context.t('Game.firstGuess'),
                textAlign: TextAlign.center,
              ),
            ),
          for (final (index, guess) in guesses.reversed.indexed) ...[
            if (index > 0)
              const Divider(height: 1, thickness: 1, color: NeoColors.softDet),
            _GuessRow(key: ValueKey(guess.language.id), guess: guess),
          ],
        ],
      ),
    );
  }
}

class _GuessRow extends StatelessWidget {
  const _GuessRow({super.key, required this.guess});

  final LanguageGuess guess;

  @override
  Widget build(BuildContext context) {
    final matching = guess.matching;
    final features = [
      for (final f in matching.correct) (f, FeatureMatch.correct),
      for (final f in matching.partial) (f, FeatureMatch.partial),
      for (final f in matching.incorrect) (f, FeatureMatch.incorrect),
    ];

    return Container(
      color: NeoColors.background,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              LangFlag(guess.language.id),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  guess.language.label(context),
                  style: NeoText.heading(16),
                ),
              ),
            ],
          ),
          if (matching.hints case final hints? when !hints.isEmpty) ...[
            const SizedBox(height: 8),
            _Hints(hints: hints),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final (index, (feature, match)) in features.indexed)
                _StaggeredIn(
                  delay: Duration(milliseconds: 100 * index),
                  child: FeatureResult(feature: feature, match: match),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Distance and direction to the target, and how related the guess is (the
/// web `GuessHints`).
class _Hints extends StatelessWidget {
  const _Hints({required this.hints});

  final GuessHints hints;

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).languageCode;
    final distance = hints.distanceKm;
    final bearing = hints.bearing;
    final relation = switch (hints.relation) {
      GuessRelation.genus => (
        'Game.hintSameGenus',
        Icons.check_rounded,
        NeoColors.correct,
      ),
      GuessRelation.family => (
        'Game.hintSameFamily',
        Icons.circle,
        NeoColors.partial,
      ),
      GuessRelation.none => (
        'Game.hintOtherFamily',
        Icons.close_rounded,
        NeoColors.incorrect,
      ),
      null => null,
    };

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        if (distance != null)
          NeoPill(
            color: NeoColors.featureSurface,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (bearing != null) ...[
                  Semantics(
                    label: context.t('Game.hintDirection'),
                    child: Transform.rotate(
                      angle: bearing * math.pi / 180,
                      child: const Icon(Icons.arrow_upward_rounded, size: 16),
                    ),
                  ),
                  const SizedBox(width: 4),
                ],
                Text(
                  context.t('Game.hintDistance', {
                    'km': groupDigits(distance, locale),
                  }),
                ),
              ],
            ),
          ),
        if (relation case (final key, final icon, final color))
          NeoPill(
            color: NeoColors.featureSurface,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: icon == Icons.circle ? 10 : 16, color: color),
                const SizedBox(width: 4),
                Text(context.t(key)),
              ],
            ),
          ),
      ],
    );
  }
}

/// `1,053` in English, `1.053` in Portuguese, `1053` in Spanish (which only
/// groups from five digits), as the web's number formatting writes them.
String groupDigits(int value, String locale) {
  final digits = value.abs().toString();

  if (locale == 'es' && digits.length < 5) return value.toString();

  final separator = locale == 'en' ? ',' : '.';
  final grouped = digits.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => separator,
  );

  return value < 0 ? '-$grouped' : grouped;
}

/// Slides a feature in after [delay], like the web stagger animation.
class _StaggeredIn extends StatefulWidget {
  const _StaggeredIn({required this.delay, required this.child});

  final Duration delay;
  final Widget child;

  @override
  State<_StaggeredIn> createState() => _StaggeredInState();
}

class _StaggeredInState extends State<_StaggeredIn>
    with SingleTickerProviderStateMixin {
  late final _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 300),
  );
  late final _curve = CurvedAnimation(
    parent: _controller,
    curve: Curves.easeOutBack,
  );

  @override
  void initState() {
    super.initState();
    Future.delayed(widget.delay, () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _curve.dispose();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _curve,
      child: widget.child,
      builder: (context, child) {
        final value = _curve.value;

        return Opacity(
          opacity: _controller.value,
          child: Transform.translate(
            offset: Offset(-20 * (1 - value), 20 * (1 - value)),
            child: child,
          ),
        );
      },
    );
  }
}
