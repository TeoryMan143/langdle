import 'package:flutter/material.dart';

import '../../../core/i18n/translations.dart';
import '../../../core/models/language.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/lang_flag.dart';

/// The web `LangSelector`: a sheet listing [languages], ranked by the same
/// search as the game. Answers the picked language, `null` if dismissed.
Future<Language?> showLanguagePicker(
  BuildContext context, {
  required String title,
  required List<Language> languages,
  Set<String> excluded = const {},
}) {
  return showModalBottomSheet<Language>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: NeoColors.overlay,
    builder: (_) => _LanguageSheet(
      title: title,
      languages: [
        for (final lang in languages)
          if (!excluded.contains(lang.id)) lang,
      ],
    ),
  );
}

class _LanguageSheet extends StatefulWidget {
  const _LanguageSheet({required this.title, required this.languages});

  final String title;
  final List<Language> languages;

  @override
  State<_LanguageSheet> createState() => _LanguageSheetState();
}

class _LanguageSheetState extends State<_LanguageSheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final matches = Language.search(widget.languages, _query);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: Container(
          height: MediaQuery.sizeOf(context).height * 0.7,
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(16),
          decoration: Neo.box(color: NeoColors.background),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(widget.title, style: NeoText.heading(20)),
              const SizedBox(height: 12),
              TextField(
                autocorrect: false,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: context.t('PublicDataPage.search.placeholder'),
                  prefixIcon: const Icon(
                    Icons.search_rounded,
                    color: NeoColors.foreground,
                  ),
                ),
                onChanged: (value) =>
                    setState(() => _query = value.toLowerCase().trim()),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: Container(
                  decoration: Neo.box(shadow: false),
                  clipBehavior: Clip.antiAlias,
                  child: ListView.separated(
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    itemCount: matches.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final lang = matches[index];

                      return Semantics(
                        button: true,
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () => Navigator.of(context).pop(lang),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 12,
                            ),
                            child: Row(
                              children: [
                                LangFlag(lang.id),
                                const SizedBox(width: 10),
                                Expanded(child: Text(lang.label(context))),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
