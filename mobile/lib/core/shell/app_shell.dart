import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../i18n/translations.dart';
import '../theme/tokens.dart';
import '../ui/neo_button.dart';

const _tabs = [
  (icon: Icons.calendar_month_rounded, label: 'Mobile.daily'),
  (icon: Icons.shuffle_rounded, label: 'Mobile.random'),
  (icon: Icons.public_rounded, label: 'Mobile.atlas'),
  (icon: Icons.help_outline_rounded, label: 'Mobile.help'),
];

/// The app frame: the blue `LANGDLE` header of the web and a bottom bar
/// with one tab per screen.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          const _Header(),
          Expanded(child: shell),
        ],
      ),
      bottomNavigationBar: _BottomBar(
        index: shell.currentIndex,
        onTap: (index) =>
            shell.goBranch(index, initialLocation: index == shell.currentIndex),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        MediaQuery.paddingOf(context).top + 4,
        12,
        4,
      ),
      decoration: const BoxDecoration(
        color: NeoColors.main,
        border: Border(
          bottom: BorderSide(color: NeoColors.border, width: Neo.borderWidth),
        ),
      ),
      child: Row(
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'LANGDLE',
              style: NeoText.display(60, color: Colors.white),
            ),
          ),
          const Spacer(),
          const _LocaleButton(),
        ],
      ),
    );
  }
}

class _LocaleButton extends StatelessWidget {
  const _LocaleButton();

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleController>();

    return NeoButton(
      variant: NeoButtonVariant.noShadow,
      semanticLabel: context.t('Mobile.language'),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      onPressed: () => _pick(context, locale),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.translate_rounded, size: 18),
          const SizedBox(width: 6),
          Text(locale.code.toUpperCase()),
        ],
      ),
    );
  }

  void _pick(BuildContext context, LocaleController locale) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      barrierColor: NeoColors.overlay,
      builder: (context) => SafeArea(
        child: Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(20),
          decoration: Neo.box(color: NeoColors.background),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(context.t('Mobile.language'), style: NeoText.heading(20)),
              const SizedBox(height: 16),
              for (final code in LocaleController.supported) ...[
                NeoButton(
                  variant: code == locale.code
                      ? NeoButtonVariant.main
                      : NeoButtonVariant.neutral,
                  onPressed: () {
                    locale.setLocale(code);
                    Navigator.of(context).pop();
                  },
                  child: Text(
                    LocaleController.names[code]!,
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({required this.index, required this.onTap});

  final int index;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: NeoColors.secondaryBackground,
        border: Border(
          top: BorderSide(color: NeoColors.border, width: Neo.borderWidth),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            children: [
              for (final (i, tab) in _tabs.indexed)
                Expanded(
                  child: Semantics(
                    selected: i == index,
                    button: true,
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => onTap(i),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        decoration: BoxDecoration(
                          color: i == index ? NeoColors.main : null,
                          borderRadius: Neo.borderRadius,
                          border: Border.all(
                            color: i == index
                                ? NeoColors.border
                                : Colors.transparent,
                            width: Neo.borderWidth,
                          ),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(tab.icon, color: NeoColors.foreground),
                            const SizedBox(height: 2),
                            Text(
                              context.t(tab.label),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: i == index
                                    ? FontWeight.w700
                                    : FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
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
