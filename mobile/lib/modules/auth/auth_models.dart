/// The signed in user: the API's `UserDTO` (never the password).
class AuthUser {
  const AuthUser({
    required this.id,
    required this.nickname,
    required this.email,
    required this.country,
    this.admin = false,
    this.googleId,
    this.appleId,
    this.nativeLanguage,
    this.fluent,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
    id: json['id'] as String,
    nickname: json['nickname'] as String,
    email: json['email'] as String,
    country: json['country'] as String,
    admin: json['admin'] == true,
    googleId: json['googleId'] as String?,
    appleId: json['appleId'] as String?,
    nativeLanguage: json['nativeLanguage'] as String?,
    fluent: json['fluent'] as String?,
  );

  final String id;
  final String nickname;
  final String email;

  /// ISO 3166-1 alpha-2 code.
  final String country;
  final bool admin;
  final String? googleId;
  final String? appleId;

  /// Language id.
  final String? nativeLanguage;

  /// Language ids, comma separated, as the API stores them.
  final String? fluent;

  Map<String, dynamic> toJson() => {
    'id': id,
    'nickname': nickname,
    'email': email,
    'country': country,
    'admin': admin,
    'googleId': googleId,
    'appleId': appleId,
    'nativeLanguage': nativeLanguage,
    'fluent': fluent,
  };
}

/// An open session: the `{ user, token, expiresAt }` every endpoint that
/// signs someone in answers with.
class AuthSession {
  const AuthSession({
    required this.token,
    required this.expiresAt,
    required this.user,
  });

  factory AuthSession.fromJson(Map<String, dynamic> json) => AuthSession(
    token: json['token'] as String,
    expiresAt: DateTime.parse(json['expiresAt'] as String),
    user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
  );

  final String token;
  final DateTime expiresAt;
  final AuthUser user;

  bool isExpired([DateTime? now]) => !expiresAt.isAfter(now ?? DateTime.now());

  AuthSession copyWith({DateTime? expiresAt, AuthUser? user}) => AuthSession(
    token: token,
    expiresAt: expiresAt ?? this.expiresAt,
    user: user ?? this.user,
  );

  Map<String, dynamic> toJson() => {
    'token': token,
    'expiresAt': expiresAt.toUtc().toIso8601String(),
    'user': user.toJson(),
  };
}

enum OAuthProvider { google, apple }

/// An unfinished Google / Apple sign up: the encrypted [dataToken] the API
/// issued with the provider's claims, and the [nickname] and [email] that
/// prefill the form finishing it.
class OAuthSignupData {
  const OAuthSignupData({
    required this.dataToken,
    required this.nickname,
    required this.email,
  });

  factory OAuthSignupData.fromJson(Map<String, dynamic> json) =>
      OAuthSignupData(
        dataToken: json['dataToken'] as String,
        nickname: json['nickname'] as String? ?? '',
        email: json['email'] as String? ?? '',
      );

  final String dataToken;
  final String nickname;
  final String email;
}

/// Answer of `POST /auth/{google,apple}/token`: a session for a known
/// account, the data to finish the sign up otherwise.
sealed class OAuthResult {
  const OAuthResult();

  factory OAuthResult.fromJson(Map<String, dynamic> json) =>
      json['status'] == 'needsSignup'
      ? OAuthNeedsSignup(OAuthSignupData.fromJson(json))
      : OAuthSignedIn(AuthSession.fromJson(json));
}

class OAuthSignedIn extends OAuthResult {
  const OAuthSignedIn(this.session);

  final AuthSession session;
}

class OAuthNeedsSignup extends OAuthResult {
  const OAuthNeedsSignup(this.data);

  final OAuthSignupData data;
}
