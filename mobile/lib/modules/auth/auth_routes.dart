/// The screens only a signed out user can open.
const signedOutPaths = {'/signin', '/signup', '/endgoogle'};

/// [path] carrying the permission token of an `/addpermission` link while
/// the user signs in or up first (the web's `?redtk=`).
String withRedirectToken(String path, String? redtk) =>
    redtk == null || redtk.isEmpty
    ? path
    : Uri(path: path, queryParameters: {'redtk': redtk}).toString();

/// The screen that claims a permission link.
String addPermissionPath(String token) =>
    Uri(path: '/addpermission', queryParameters: {'token': token}).toString();
