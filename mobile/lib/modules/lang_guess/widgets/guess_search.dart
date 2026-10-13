import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/i18n/translations.dart';
import '../../../core/models/language.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/ui/lang_flag.dart';
import '../../../core/ui/neo_button.dart';
import '../game_controller.dart';

/// The guess input, its results list and the guess button (the web `search`
/// row with `QueryRes`).
class GuessSearch extends StatefulWidget {
  const GuessSearch({super.key, required this.onOutcome});

  /// Called after each attempt that reached the server.
  final ValueChanged<GuessOutcome> onOutcome;

  @override
  State<GuessSearch> createState() => _GuessSearchState();
}

class _GuessSearchState extends State<GuessSearch> {
  final _controller = TextEditingController();
  final _focus = FocusNode();
  String _query = '';

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final game = context.read<GameController>();
    final messenger = ScaffoldMessenger.of(context);
    final t = context.read<LocaleController>().t;

    try {
      final outcome = await game.guess();

      if (outcome == GuessOutcome.rejected) {
        return;
      }

      _controller.clear();
      setState(() => _query = '');
      widget.onOutcome(outcome);
    } catch (_) {
      messenger.showSnackBar(
        SnackBar(content: Text(t('Mobile.connectionError'))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameController>();
    final showResults = _focus.hasFocus && game.selected == null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AnimatedSize(
          duration: const Duration(milliseconds: 200),
          child: game.hint == null
              ? const SizedBox(width: double.infinity)
              : Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: Neo.box(shadow: false),
                    child: Text(
                      context.t(game.hint!),
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Color(0xFFDC2626)),
                    ),
                  ),
                ),
        ),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                focusNode: _focus,
                enabled: !game.finished,
                textAlign: TextAlign.center,
                textInputAction: TextInputAction.done,
                autocorrect: false,
                decoration: InputDecoration(
                  hintText: context.t('Game.typeGuess'),
                ),
                onChanged: (value) {
                  setState(() => _query = value.toLowerCase().trim());
                  game.select(null);
                },
                onSubmitted: (_) {
                  final results = game.search(_query);
                  if (game.selected == null && results.isNotEmpty) {
                    _controller.text = results.first.name;
                    game.select(results.first);
                  }
                },
              ),
            ),
            const SizedBox(width: 10),
            NeoButton(
              onPressed: game.finished || game.submitting ? null : _submit,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (game.submitting)
                    const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2.5),
                    )
                  else
                    Text(context.t('Game.guess')),
                  const SizedBox(width: 6),
                  const Icon(Icons.send_rounded, size: 18),
                ],
              ),
            ),
          ],
        ),
        if (showResults) ...[
          const SizedBox(height: 8),
          // Part of the field for focus purposes: touching the list must not
          // count as a tap outside the field and close the keyboard.
          TextFieldTapRegion(
            child: _Results(
              query: _query,
              onSelect: (language) {
                _controller.text = language.name;
                game.select(language);
                _focus.unfocus();
              },
            ),
          ),
        ],
      ],
    );
  }
}

class _Results extends StatelessWidget {
  const _Results({required this.query, required this.onSelect});

  final String query;
  final ValueChanged<Language> onSelect;

  @override
  Widget build(BuildContext context) {
    final results = context.watch<GameController>().search(query);

    return Container(
      constraints: const BoxConstraints(maxHeight: 220),
      decoration: Neo.box(shadow: false),
      clipBehavior: Clip.antiAlias,
      child: results.isEmpty
          ? Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                context.t('Game.langNotFound'),
                textAlign: TextAlign.center,
              ),
            )
          // Keeps the list's scroll notifications from reaching the page's
          // ListView, whose `onDrag` keyboard dismissal would unfocus the
          // field and close this list mid-scroll.
          : NotificationListener<ScrollNotification>(
              onNotification: (_) => true,
              child: ListView.builder(
                shrinkWrap: true,
                padding: EdgeInsets.zero,
                itemCount: results.length,
                itemBuilder: (context, index) {
                  final language = results[index];

                  return Material(
                    color: Colors.transparent,
                    child: InkWell(
                      splashColor: NeoColors.main,
                      highlightColor: NeoColors.main,
                      onTap: () => onSelect(language),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            LangFlag(language.id),
                            const SizedBox(width: 8),
                            Flexible(child: Text(language.label(context))),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
    );
  }
}
