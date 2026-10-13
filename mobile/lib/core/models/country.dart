/// An entry of `GET /api/meta/countries`: the countries users pick from.
class Country {
  const Country({required this.code, required this.name});

  factory Country.fromJson(Map<String, dynamic> json) =>
      Country(code: json['value'] as String, name: json['title'] as String);

  /// ISO 3166-1 alpha-2 code, what the API stores (`ES`).
  final String code;

  /// English name, the label the web shows too.
  final String name;
}
