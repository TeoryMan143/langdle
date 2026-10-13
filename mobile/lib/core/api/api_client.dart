import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config.dart';

/// Every failure of the REST API: the `{ key, message, errors? }` body the API
/// answers with, or `key == 'network'` when the server could not be reached.
class ApiException implements Exception {
  const ApiException({
    required this.status,
    required this.key,
    required this.message,
    this.errors,
  });

  const ApiException.network()
    : status = 0,
      key = 'network',
      message = 'The server could not be reached',
      errors = null;

  final int status;
  final String key;
  final String message;

  /// The flattened zod error of an `invalidData` answer.
  final Object? errors;

  bool get isNetwork => key == 'network';

  /// The messages of each invalid body field (`errors.fieldErrors`), empty
  /// when the failure is not a validation one.
  Map<String, List<String>> get fieldErrors {
    final errors = this.errors;
    final fields = errors is Map ? errors['fieldErrors'] : null;

    if (fields is! Map) {
      return const {};
    }

    return {
      for (final MapEntry(:key, :value) in fields.entries)
        if (key is String && value is List)
          key: value.whereType<String>().toList(),
    };
  }

  @override
  String toString() => 'ApiException($status, $key): $message';
}

/// The signed in session as the [ApiClient] sees it. Implemented by the auth
/// module, which owns the token and its storage.
abstract interface class ApiSession {
  /// The session token sent as `Authorization: Bearer`, `null` signed out.
  String? get token;

  /// The API renewed the session sent with a request (`X-Session-Expires-At`).
  void renewed(String token, DateTime expiresAt);

  /// The API answered `notSignedIn` to a request that carried [token]: the
  /// session expired or was revoked.
  void rejected(String token);
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

  /// Signs every request while a session is open.
  ApiSession? session;

  Future<dynamic> get(String path, {Map<String, Object>? query}) =>
      _send('GET', path, query: query);

  Future<dynamic> post(String path, {Object? body}) =>
      _send('POST', path, body: body);

  Future<dynamic> put(String path, {Object? body}) =>
      _send('PUT', path, body: body);

  Future<dynamic> delete(String path) => _send('DELETE', path);

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

    final token = session?.token;

    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }

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
      final expiresAt = DateTime.tryParse(
        response.headers['x-session-expires-at'] ?? '',
      );

      if (token != null && expiresAt != null) {
        session?.renewed(token, expiresAt);
      }

      return decoded;
    }

    final error = decoded is Map<String, dynamic> ? decoded : const {};
    final exception = ApiException(
      status: response.statusCode,
      key: error['key'] is String ? error['key'] as String : 'unknown',
      message: error['message'] is String
          ? error['message'] as String
          : 'Request failed (${response.statusCode})',
      errors: error['errors'],
    );

    if (token != null && exception.key == 'notSignedIn') {
      session?.rejected(token);
    }

    throw exception;
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
