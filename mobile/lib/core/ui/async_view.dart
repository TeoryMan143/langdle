import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../i18n/translations.dart';
import '../theme/tokens.dart';
import 'neo_button.dart';
import 'neo_card.dart';

/// Centered spinner for a screen that is still loading.
class NeoLoading extends StatelessWidget {
  const NeoLoading({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(32),
        child: CircularProgressIndicator(strokeWidth: 3),
      ),
    );
  }
}

/// The error card of a screen that failed to load, with a retry button.
class NeoError extends StatelessWidget {
  const NeoError({super.key, required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: NeoCard(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 36),
              const SizedBox(height: 12),
              Text(
                errorMessage(context, error),
                textAlign: TextAlign.center,
                style: NeoText.muted,
              ),
              const SizedBox(height: 16),
              NeoButton(
                onPressed: onRetry,
                child: Text(context.t('Mobile.retry')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A human message for an error: the connection message for network failures,
/// the generic one otherwise. Only for `build` methods.
String errorMessage(BuildContext context, Object error) {
  return error is ApiException && !error.isNetwork
      ? context.t('Game.unkError')
      : context.t('Mobile.connectionError');
}
