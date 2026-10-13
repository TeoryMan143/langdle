import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/i18n/translations.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/lang_flag.dart';
import '../../../core/ui/neo_button.dart';
import '../../../core/ui/neo_card.dart';
import '../guess_models.dart';
import '../history_controller.dart';

/// The list of finished games (the web `GameHistory`). Needs a
/// [HistoryController] above it.
class GameHistory extends StatelessWidget {
  const GameHistory({super.key});

  @override
  Widget build(BuildContext context) {
    final history = context.watch<HistoryController>();
    final records = history.records;

    return NeoCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            context.t('AccountPage.gameHistory'),
            style: NeoText.heading(24),
          ),
          const SizedBox(height: 12),
          if (records == null && history.error == null)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Center(child: CircularProgressIndicator(strokeWidth: 3)),
            )
          else if (records == null)
            Row(
              children: [
                Expanded(
                  child: Text(
                    context.t('AccountPage.unknownError'),
                    style: NeoText.muted,
                  ),
                ),
                NeoButton(
                  variant: NeoButtonVariant.neutral,
                  onPressed: history.load,
                  child: Text(context.t('Mobile.retry')),
                ),
              ],
            )
          else if (records.isEmpty)
            Text(context.t('AccountPage.noGames'), style: NeoText.muted)
          else
            for (final record in records) ...[
              _RecordCard(record: record),
              const SizedBox(height: 10),
            ],
        ],
      ),
    );
  }
}

class _RecordCard extends StatelessWidget {
  const _RecordCard({required this.record});

  final GameRecord record;

  @override
  Widget build(BuildContext context) {
    final language = context.read<HistoryController>().language(
      record.targetLang,
    );

    return NeoCard(
      shadow: false,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Eyebrow(
                context.t(
                  record.type == GameType.daily
                      ? 'Mobile.daily'
                      : 'Mobile.random',
                ),
              ),
              const Spacer(),
              if (record.date case final date?)
                Text(date, style: NeoText.eyebrow()),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              LangFlag(record.targetLang),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  language?.label(context) ?? record.targetLang,
                  style: NeoText.heading(16),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              NeoPill(
                color: record.guessed
                    ? NeoColors.presentSurface
                    : NeoColors.incorrect.withValues(alpha: 0.15),
                child: Text(
                  '${context.t('AccountPage.guessed')}: '
                  '${context.t(record.guessed ? 'AccountPage.yes' : 'AccountPage.no')}',
                ),
              ),
              NeoPill(
                child: Text(
                  '${context.t('AccountPage.guesses')}: ${record.guesses}',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
