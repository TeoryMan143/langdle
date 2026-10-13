import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/i18n/translations.dart';

/// Countdown to the next daily language, which rolls at 00:00 UTC.
class DailyTimer extends StatefulWidget {
  const DailyTimer({super.key, this.onReset});

  /// Called when the countdown crosses midnight UTC.
  final VoidCallback? onReset;

  @override
  State<DailyTimer> createState() => _DailyTimerState();
}

class _DailyTimerState extends State<DailyTimer> {
  late Duration _remaining = _untilReset();
  late final Timer _timer;

  static Duration _untilReset() {
    final now = DateTime.now().toUtc();
    final midnight = DateTime.utc(now.year, now.month, now.day + 1);
    return midnight.difference(now);
  }

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      final next = _untilReset();
      if (next > _remaining) {
        widget.onReset?.call();
      }
      setState(() => _remaining = next);
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final total = _remaining.inSeconds;
    final time = [
      total ~/ 3600,
      (total % 3600) ~/ 60,
      total % 60,
    ].map((n) => '$n'.padLeft(2, '0')).join(':');

    return Text.rich(
      TextSpan(
        text: '${context.t('Game.nextLang')}: ',
        children: [
          TextSpan(
            text: time,
            style: GoogleFonts.robotoMono(
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
      style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
    );
  }
}
