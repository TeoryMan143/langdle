import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config.dart';

/// Every failure of the REST API: the `{ key, message }` body the API answers
/// with, or `key == 'network'` when the server could not be reached.
class ApiException implements Exception {
  const ApiException({
    required this.status,
    required this.key,
    required this.message,
  });

  const ApiException.network()
    : status = 0,
      key = 'network',
      message = 'The server could not be reached';

  final int status;
  final String key;
  final String message;

  bool get isNetwork => key == 'network';

  @override
  String toString() => 'ApiException($status, $key): $message';
}

/// The one place the app talks to the Langdle REST API (`/api/*`), the same
/// endpoints the web app calls.
class ApiClient {
  ApiClient({http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  /// Generous: the first hit of an API route in `next dev` compiles it.
  static const _timeout = Duration(seconds: 30);

  final http.Client _client;
  final String baseUrl;

  Future<dynamic> get(String path, {Map<String, Object>? query}) =>
      _send('GET', path, query: query);

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, Object>? query,
    Object? body,
  }) async {
    final uri = Uri.parse('$baseUrl/api$path').replace(
      queryParameters: query?.map(
        (key, value) => MapEntry(
          key,
          value is Iterable ? value.map((v) => '$v') : '$value',
        ),
      ),
    );

    final request = http.Request(method, uri)
      ..headers['Accept'] = 'application/json';

    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }

    final http.Response response;

    try {
      response = await http.Response.fromStream(
        await _client.send(request).timeout(_timeout),
      );
    } on Exception catch (e) {
      debugPrint('API $method $uri failed: $e');
      throw const ApiException.network();
    }

    final decoded = _decode(response.body);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    final error = decoded is Map<String, dynamic> ? decoded : const {};

    throw ApiException(
      status: response.statusCode,
      key: error['key'] is String ? error['key'] as String : 'unknown',
      message: error['message'] is String
          ? error['message'] as String
          : 'Request failed (${response.statusCode})',
    );
  }

  static dynamic _decode(String body) {
    if (body.isEmpty) {
      return null;
    }

    try {
      return jsonDecode(body);
    } on FormatException {
      return null;
    }
  }
}
