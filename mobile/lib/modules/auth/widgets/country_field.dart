import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/i18n/translations.dart';
import '../../../core/models/country.dart';
import '../../../core/theme/tokens.dart';
import '../../meta/meta_repository.dart';

/// The device's region (`ES` for `es_ES`), the country a form starts with.
String? deviceCountryCode() => PlatformDispatcher.instance.locale.countryCode;

/// The flag emoji of an ISO 3166-1 alpha-2 code, empty for anything else.
String countryFlag(String code) {
  if (!RegExp(r'^[A-Za-z]{2}$').hasMatch(code)) return '';

  return String.fromCharCodes(
    code.toUpperCase().codeUnits.map((unit) => unit - 0x41 + 0x1F1E6),
  );
}

/// The web `CountrySelector`: a field that opens a searchable list of the
/// countries of `GET /api/meta/countries`.
class CountryField extends StatefulWidget {
  const CountryField({
    super.key,
    required this.value,
    required this.onChanged,
    this.errors,
  });

  /// The selected country code, `null` before one is picked.
  final String? value;
  final ValueChanged<String> onChanged;

  /// The field's messages from an `invalidData` answer.
  final List<String>? errors;

  @override
  State<CountryField> createState() => _CountryFieldState();
}

class _CountryFieldState extends State<CountryField> {
  late Future<List<Country>> _countries;

  @override
  void initState() {
    super.initState();
    _countries = _load();
  }

  Future<List<Country>> _load() => context.read<MetaRepository>().countries();

  Future<void> _pick() async {
    final messenger = ScaffoldMessenger.of(context);
    final t = context.read<LocaleController>().t;
    final List<Country> countries;

    try {
      countries = await _countries;
    } catch (_) {
      if (!mounted) return;
      setState(() => _countries = _load());
      messenger.showSnackBar(
        SnackBar(content: Text(t('Mobile.connectionError'))),
      );
      return;
    }

    if (!mounted) return;

    final picked = await showModalBottomSheet<Country>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: NeoColors.overlay,
      builder: (_) =>
          _CountrySheet(countries: countries, selected: widget.value),
    );

    if (picked != null) {
      widget.onChanged(picked.code);
    }
  }

  @override
  Widget build(BuildContext context) {
    final code = widget.value;
    final errors = widget.errors;

    return FutureBuilder(
      future: _countries,
      builder: (context, snapshot) {
        final name = snapshot.data
            ?.where((country) => country.code == code)
            .firstOrNull
            ?.name;

        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: _pick,
          child: Semantics(
            button: true,
            label: context.t('AuthPage.country'),
            child: InputDecorator(
              isEmpty: code == null,
              decoration: InputDecoration(
                hintText: context.t('AuthPage.country'),
                errorText: errors == null || errors.isEmpty
                    ? null
                    : errors.join(', '),
                suffixIcon: const Icon(
                  Icons.expand_more_rounded,
                  color: NeoColors.foreground,
                ),
              ),
              child: code == null
                  ? null
                  : Text(
                      '${countryFlag(code)}  ${name ?? code}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
            ),
          ),
        );
      },
    );
  }
}

class _CountrySheet extends StatefulWidget {
  const _CountrySheet({required this.countries, required this.selected});

  final List<Country> countries;
  final String? selected;

  @override
  State<_CountrySheet> createState() => _CountrySheetState();
}

class _CountrySheetState extends State<_CountrySheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final query = _query.toLowerCase();
    final matches = [
      for (final country in widget.countries)
        if (country.name.toLowerCase().contains(query) ||
            country.code.toLowerCase() == query)
          country,
    ];

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
              Text(context.t('AuthPage.country'), style: NeoText.heading(20)),
              const SizedBox(height: 12),
              TextField(
                autocorrect: false,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: context.t('AuthPage.searchCountry'),
                  prefixIcon: const Icon(
                    Icons.search_rounded,
                    color: NeoColors.foreground,
                  ),
                ),
                onChanged: (value) => setState(() => _query = value.trim()),
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
                      final country = matches[index];
                      final selected = country.code == widget.selected;

                      return Semantics(
                        button: true,
                        selected: selected,
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () => Navigator.of(context).pop(country),
                          child: Container(
                            color: selected ? NeoColors.main : null,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 12,
                            ),
                            child: Text(
                              '${countryFlag(country.code)}  ${country.name}',
                              style: TextStyle(
                                fontWeight: selected
                                    ? FontWeight.w700
                                    : FontWeight.w400,
                              ),
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
