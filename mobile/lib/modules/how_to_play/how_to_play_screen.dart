import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/i18n/translations.dart';
import '../../core/theme/tokens.dart';
import '../../core/ui/feature_chip.dart';
import '../../core/ui/neo_button.dart';
import '../../core/ui/neo_card.dart';

const _exampleFeatures = [
  ('sov', FeatureMatch.correct),
  ('nounClasses', FeatureMatch.incorrect),
  ('tones', FeatureMatch.partial),
  ('caseMarking', FeatureMatch.correct),
];

const _featureCategories = [
  'wordOrder',
  'morphology',
  'phonology',
  'writingSystem',
];

/// How the game works (the web `/howtoplay`).
class HowToPlayScreen extends StatelessWidget {
  const HowToPlayScreen({super.key});

  String _k(String key) => 'HowToPlayPage.$key';

  @override
  Widget build(BuildContext context) {
    String t(String key) => context.t(_k(key));

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
      children: [
        NeoCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Eyebrow(t('eyebrow')),
              const SizedBox(height: 10),
              Text(t('title'), style: NeoText.heading(34)),
              const SizedBox(height: 14),
              Text(t('intro'), style: NeoText.muted.copyWith(fontSize: 16)),
              const SizedBox(height: 20),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  NeoButton(
                    color: NeoColors.secondaryBackground,
                    onPressed: () => context.go('/'),
                    child: Text(t('ctaDaily')),
                  ),
                  NeoButton(
                    variant: NeoButtonVariant.neutral,
                    onPressed: () => context.go('/random'),
                    child: Text(t('ctaRandom')),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              for (final stat in ['daily', 'guesses', 'modes']) ...[
                NeoCard(
                  shadow: false,
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Eyebrow(t('quickStat.${stat}Label')),
                      const SizedBox(height: 6),
                      Text(
                        t('quickStat.${stat}Value'),
                        style: NeoText.heading(18),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
              ],
            ],
          ),
        ),
        const SizedBox(height: 20),
        NeoCard(
          color: NeoColors.main,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Eyebrow(t('example.eyebrow')),
              const SizedBox(height: 10),
              Text(t('example.title'), style: NeoText.heading(24)),
              const SizedBox(height: 10),
              Text(t('example.copy'), style: NeoText.muted),
              const SizedBox(height: 16),
              for (final (id, match) in _exampleFeatures) ...[
                Align(
                  alignment: Alignment.centerLeft,
                  child: FeatureResult(feature: id, match: match),
                ),
                const SizedBox(height: 8),
              ],
              const SizedBox(height: 8),
              NeoCard(
                shadow: false,
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Eyebrow(t('example.attempt')),
                    const SizedBox(height: 4),
                    Text(t('example.note'), style: NeoText.muted),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        for (final status in FeatureStatus.values) ...[
          _StatusCard(status: status),
          const SizedBox(height: 16),
        ],
        const SizedBox(height: 4),
        NeoCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Eyebrow(t('modes.eyebrow')),
              const SizedBox(height: 8),
              Text(t('modes.title'), style: NeoText.heading(28)),
              const SizedBox(height: 10),
              Text(t('modes.copy'), style: NeoText.muted),
              const SizedBox(height: 20),
              _ModeCard(
                icon: Icons.calendar_month_rounded,
                mode: 'daily',
                onTap: () => context.go('/'),
              ),
              const SizedBox(height: 16),
              _ModeCard(
                icon: Icons.shuffle_rounded,
                mode: 'random',
                onTap: () => context.go('/random'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        NeoCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Eyebrow(t('features.eyebrow')),
              const SizedBox(height: 8),
              Text(t('features.title'), style: NeoText.heading(28)),
              const SizedBox(height: 10),
              Text(t('features.copy'), style: NeoText.muted),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final category in _featureCategories)
                    NeoPill(
                      color: NeoColors.main,
                      child: Text(
                        t('features.list.$category').toUpperCase(),
                        style: NeoText.eyebrow(color: NeoColors.foreground),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        const Divider(thickness: Neo.borderWidth, height: Neo.borderWidth),
        const SizedBox(height: 14),
        Text(
          t('footer').toUpperCase(),
          style: NeoText.eyebrow().copyWith(fontSize: 12),
        ),
      ],
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.status});

  final FeatureStatus status;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = switch (status) {
      FeatureStatus.present => (Icons.check_rounded, NeoColors.presentIcon),
      FeatureStatus.partial => (Icons.circle, NeoColors.partialIcon),
      FeatureStatus.absent => (Icons.close_rounded, NeoColors.absentIcon),
    };
    final key = 'HowToPlayPage.status.${status.name}';

    return NeoCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: NeoColors.secondaryBackground,
                  shape: BoxShape.circle,
                  border: Neo.border,
                ),
                child: Icon(
                  icon,
                  color: color,
                  size: status == FeatureStatus.partial ? 12 : 18,
                ),
              ),
              const SizedBox(width: 12),
              Text(context.t('$key.label'), style: NeoText.heading(20)),
            ],
          ),
          const SizedBox(height: 14),
          Text(context.t('$key.copy'), style: NeoText.muted),
        ],
      ),
    );
  }
}

class _ModeCard extends StatelessWidget {
  const _ModeCard({
    required this.icon,
    required this.mode,
    required this.onTap,
  });

  final IconData icon;
  final String mode;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    String t(String key) => context.t('HowToPlayPage.modes.$mode.$key');

    return NeoButton(
      onPressed: onTap,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: NeoColors.secondaryBackground,
              shape: BoxShape.circle,
              border: Neo.border,
            ),
            child: Icon(icon, size: 20),
          ),
          const SizedBox(height: 14),
          Eyebrow(t('eyebrow')),
          const SizedBox(height: 6),
          Text(t('title'), style: NeoText.heading(22)),
          const SizedBox(height: 8),
          Text(t('copy'), style: NeoText.muted),
          const SizedBox(height: 16),
          Row(
            children: [
              Text(t('cta')),
              const SizedBox(width: 8),
              const Icon(Icons.arrow_forward_rounded, size: 16),
            ],
          ),
        ],
      ),
    );
  }
}
