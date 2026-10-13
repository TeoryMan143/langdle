import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/i18n/translations.dart';
import '../../../core/models/language.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/async_view.dart';
import '../../../core/ui/feature_chip.dart';
import '../../../core/ui/lang_flag.dart';
import '../../../core/ui/neo_card.dart';
import '../lang_repository.dart';

typedef _AtlasData = ({List<Language> languages, FeatureCatalogue catalogue});

/// The public atlas: every language with the features marked for it (the web
/// `/data/public`). Read only.
class AtlasScreen extends StatefulWidget {
  const AtlasScreen({super.key});

  @override
  State<AtlasScreen> createState() => _AtlasScreenState();
}

class _AtlasScreenState extends State<AtlasScreen> {
  late Future<_AtlasData> _data = _load();
  String _query = '';

  Future<_AtlasData> _load() async {
    final repo = context.read<LangRepository>();
    final languages = repo.all();
    final catalogue = repo.catalogue();
    await Future.wait([languages, catalogue]);
    return (languages: await languages, catalogue: await catalogue);
  }

  Future<void> _reload() {
    final next = _load();
    setState(() => _data = next);
    return next.then((_) {}, onError: (_) {});
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _data,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return NeoError(error: snapshot.error!, onRetry: _reload);
        }

        if (!snapshot.hasData) {
          return const NeoLoading();
        }

        final (:languages, :catalogue) = snapshot.data!;
        final query = _query.trim().toLowerCase();
        final filtered = query.isEmpty
            ? languages
            : languages
                  .where(
                    (l) => '${l.id} ${l.name} ${l.exonym ?? ''}'
                        .toLowerCase()
                        .contains(query),
                  )
                  .toList();

        return RefreshIndicator(
          color: NeoColors.foreground,
          backgroundColor: NeoColors.main,
          onRefresh: _reload,
          child: ListView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
            children: [
              _Intro(languages: languages),
              const SizedBox(height: 20),
              NeoCard(
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
                      autocorrect: false,
                      onChanged: (value) => setState(() => _query = value),
                      decoration: InputDecoration(
                        hintText: context.t(
                          'PublicDataPage.search.placeholder',
                        ),
                        prefixIcon: const Icon(Icons.search_rounded),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              if (filtered.isEmpty)
                NeoCard(
                  child: Text(
                    context.t('PublicDataPage.empty'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 16),
                  ),
                ),
              for (final language in filtered) ...[
                _LanguageCard(language: language, catalogue: catalogue),
                const SizedBox(height: 20),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _Intro extends StatelessWidget {
  const _Intro({required this.languages});

  final List<Language> languages;

  @override
  Widget build(BuildContext context) {
    final stats = [
      ('PublicDataPage.summary.languages', languages.length),
      (
        'PublicDataPage.summary.activeLanguages',
        languages.where((l) => l.active).length,
      ),
      (
        'PublicDataPage.summary.activeFeatures',
        languages.fold(0, (sum, l) => sum + l.features.length),
      ),
      (
        'PublicDataPage.summary.partialFeatures',
        languages.fold(0, (sum, l) => sum + l.partial.length),
      ),
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
  const _LanguageCard({required this.language, required this.catalogue});

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
