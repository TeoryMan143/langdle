import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/i18n/translations.dart';
import '../../../core/models/language.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/async_view.dart';
import '../../../core/ui/feature_chip.dart';
import '../../../core/ui/lang_flag.dart';
import '../../../core/ui/neo_button.dart';
import '../../../core/ui/neo_card.dart';
import '../atlas_controller.dart';
import '../../lang_data/lang_models.dart';
import '../../lang_data/lang_repository.dart';

/// The public atlas: every language with the features marked for it (the web
/// `/data/public`). Read only, loaded batch by batch as the user scrolls.
class AtlasScreen extends StatefulWidget {
  const AtlasScreen({super.key});

  @override
  State<AtlasScreen> createState() => _AtlasScreenState();
}

class _AtlasScreenState extends State<AtlasScreen> {
  /// Owned here: the search card leaves the list when scrolled far away and
  /// must find its text again when it comes back.
  late final _search = TextEditingController(
    text: context.read<AtlasController>().query,
  );

  /// How close to the end (in pixels) the next batch starts loading.
  static const _loadAhead = 1500.0;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final atlas = context.watch<AtlasController>();
    final summary = atlas.summary;
    final catalogue = atlas.catalogue;

    if (atlas.loading) {
      return const NeoLoading();
    }

    if (summary == null || catalogue == null) {
      return NeoError(error: atlas.error!, onRetry: atlas.retry);
    }

    final languages = atlas.languages;
    final body = <Widget>[
      if (atlas.error != null)
        NeoError(error: atlas.error!, onRetry: atlas.retry)
      else if (languages.isEmpty && !atlas.searching)
        NeoCard(
          child: Text(
            context.t('PublicDataPage.empty'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16),
          ),
        ),
    ];
    final header = [
      _Intro(summary: summary),
      _SearchCard(
        controller: _search,
        searching: atlas.searching,
        onChanged: atlas.search,
      ),
    ];
    final cards = body.isEmpty ? languages.length : 0;

    return RefreshIndicator(
      color: NeoColors.foreground,
      backgroundColor: NeoColors.main,
      onRefresh: atlas.load,
      // Scrolling near the end loads the next batch; so does a layout that
      // leaves the end in reach (a batch too short to fill the screen).
      child: NotificationListener<Notification>(
        onNotification: (notification) {
          final metrics = switch (notification) {
            ScrollNotification(:final metrics) => metrics,
            ScrollMetricsNotification(:final metrics) => metrics,
            _ => null,
          };

          if (metrics != null && metrics.extentAfter < _loadAhead) {
            atlas.loadMore();
          }
          return false;
        },
        child: ListView.separated(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
          itemCount: header.length + body.length + cards + 1,
          separatorBuilder: (_, _) => const SizedBox(height: 20),
          itemBuilder: (context, index) {
            if (index < header.length) {
              return header[index];
            }

            index -= header.length;

            if (index < body.length) {
              return body[index];
            }

            index -= body.length;

            if (index < cards) {
              return _LanguageCard(
                key: ValueKey(languages[index].id),
                language: languages[index],
                catalogue: catalogue,
              );
            }

            return _Footer(atlas: atlas);
          },
        ),
      ),
    );
  }
}

class _SearchCard extends StatelessWidget {
  const _SearchCard({
    required this.controller,
    required this.searching,
    required this.onChanged,
  });

  final TextEditingController controller;
  final bool searching;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return NeoCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.t('PublicDataPage.search.label'),
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: controller,
            autocorrect: false,
            onChanged: onChanged,
            decoration: InputDecoration(
              hintText: context.t('PublicDataPage.search.placeholder'),
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: searching
                  ? const Padding(
                      padding: EdgeInsets.all(14),
                      child: SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      ),
                    )
                  : null,
            ),
          ),
        ],
      ),
    );
  }
}

/// The end of the list: the next batch loading (or its retry), how many are
/// shown, and the attribution.
class _Footer extends StatelessWidget {
  const _Footer({required this.atlas});

  final AtlasController atlas;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (atlas.loadingMore)
          const Padding(
            padding: EdgeInsets.only(bottom: 16),
            child: CircularProgressIndicator(strokeWidth: 3),
          )
        else if (atlas.moreError != null && atlas.hasMore)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: NeoButton(
              variant: NeoButtonVariant.neutral,
              onPressed: atlas.loadMore,
              child: Text(context.t('PublicDataPage.showMore')),
            ),
          ),
        if (atlas.error == null && atlas.languages.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Text(
              context.t('PublicDataPage.showing', {
                'shown': atlas.languages.length,
                'total': atlas.total,
              }),
              textAlign: TextAlign.center,
              style: NeoText.muted,
            ),
          ),
        Text(
          context.t('PublicDataPage.attribution'),
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 12),
        ),
      ],
    );
  }
}

class _Intro extends StatelessWidget {
  const _Intro({required this.summary});

  final LanguagesSummary summary;

  @override
  Widget build(BuildContext context) {
    final stats = [
      ('PublicDataPage.summary.languages', summary.languages),
      ('PublicDataPage.summary.activeLanguages', summary.activeLanguages),
      ('PublicDataPage.summary.activeFeatures', summary.activeFeatures),
      ('PublicDataPage.summary.partialFeatures', summary.partialFeatures),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        NeoCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Eyebrow(context.t('PublicDataPage.eyebrow')),
              const SizedBox(height: 10),
              Text(
                context.t('PublicDataPage.title'),
                style: NeoText.heading(30),
              ),
              const SizedBox(height: 12),
              Text(context.t('PublicDataPage.intro'), style: NeoText.muted),
            ],
          ),
        ),
        const SizedBox(height: 16),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 14,
          crossAxisSpacing: 14,
          childAspectRatio: 1.45,
          children: [
            for (final (key, value) in stats)
              NeoCard(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Eyebrow(context.t(key), color: const Color(0x99000000)),
                    Text('$value', style: NeoText.heading(28)),
                  ],
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _LanguageCard extends StatelessWidget {
  const _LanguageCard({
    super.key,
    required this.language,
    required this.catalogue,
  });

  final Language language;
  final FeatureCatalogue catalogue;

  @override
  Widget build(BuildContext context) {
    final present = language.features.toSet();
    final partial = language.partial.toSet();

    return NeoCard(
      color: NeoColors.background,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: LangFlag(language.id, width: 44, height: 32),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(language.name, style: NeoText.heading(22)),
                    if (language.exonym != null)
                      Text(
                        language.exonym!,
                        style: const TextStyle(
                          fontSize: 14,
                          color: Color(0xB3000000),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              NeoPill(
                color: NeoColors.main,
                child: Text(
                  context.t(
                    language.active
                        ? 'PublicDataPage.status.active'
                        : 'PublicDataPage.status.inactive',
                  ),
                ),
              ),
              NeoPill(
                child: Text(
                  '${language.features.length} ${context.t('PublicDataPage.summary.activeFeatures')}',
                ),
              ),
              NeoPill(
                child: Text(
                  '${language.partial.length} ${context.t('PublicDataPage.summary.partialFeatures')}',
                ),
              ),
            ],
          ),
          for (final MapEntry(key: group, value: features)
              in catalogue.groups.entries)
            if (features.isNotEmpty) ...[
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  borderRadius: Neo.borderRadius,
                  border: Border.all(color: const Color(0xB3000000)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.t('PublicDataPage.groups.$group'),
                      style: NeoText.heading(16),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final f in features.where(present.contains))
                          FeatureStatusChip(
                            feature: f,
                            status: FeatureStatus.present,
                          ),
                        for (final f in features.where(partial.contains))
                          FeatureStatusChip(
                            feature: f,
                            status: FeatureStatus.partial,
                          ),
                        for (final f in features.where(
                          (f) => !present.contains(f) && !partial.contains(f),
                        ))
                          FeatureStatusChip(
                            feature: f,
                            status: FeatureStatus.absent,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
        ],
      ),
    );
  }
}
