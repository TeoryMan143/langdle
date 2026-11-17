import 'package:flutter/widgets.dart';

import '../i18n/translations.dart';

List<String> _strings(Object? value) =>
    value is List ? value.whereType<String>().toList() : const [];

/// A language as the pickers search it (`GET /api/lang/names`): its names,
/// without features. A full [Language] is one too.
class LanguageName {
  const LanguageName({
    required this.id,
    required this.name,
    this.exonym,
    this.searchParams = const [],
  });

  factory LanguageName.fromJson(Map<String, dynamic> json) => LanguageName(
    id: json['id'] as String,
    name: json['name'] as String,
    exonym: json['exonym'] as String?,
    searchParams: _strings(json['searchParams']),
  );

  final String id;
  final String name;
  final String? exonym;

  /// Other names the search matches against.
  final List<String> searchParams;

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'exonym': ?exonym,
    'searchParams': searchParams,
  };

  /// `Name (Exonym)`, the exonym translated into the current locale when the
  /// `Exonyms` messages have it. Only for `build` methods.
  String label(BuildContext context) {
    final exo = context.t('Exonyms.$id');
    final translated = exo == 'Exonyms.$id' ? exonym : exo;

    return translated == null || translated == name
        ? name
        : '$name ($translated)';
  }
}

/// A language of the catalogue, as `GET /api/lang` answers it.
class Language extends LanguageName {
  const Language({
    required super.id,
    required super.name,
    super.exonym,
    this.features = const [],
    this.partial = const [],
    super.searchParams,
    this.active = true,
  });

  factory Language.fromJson(Map<String, dynamic> json) => Language(
    id: json['id'] as String,
    name: json['name'] as String,
    exonym: json['exonym'] as String?,
    features: _strings(json['features']),
    partial: _strings(json['partial']),
    searchParams: _strings(json['searchParams']),
    active: json['active'] as bool? ?? true,
  );

  /// Features present in the language.
  final List<String> features;

  /// Features only partially present.
  final List<String> partial;
  final bool active;

  @override
  Map<String, dynamic> toJson() => {
    ...super.toJson(),
    'features': features,
    'partial': partial,
    'active': active,
  };
}
