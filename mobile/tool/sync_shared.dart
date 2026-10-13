// Copies what the app shares with the web from the repository root into the
// app's assets: the translations (`messages/*.json`) and the language flags
// (`public/flags`). Run it from `mobile/` after either changes:
//
//   dart run tool/sync_shared.dart
import 'dart:io';

void main() {
  final root = Directory('..');

  _copyDir(
    Directory('${root.path}/messages'),
    Directory('assets/i18n'),
    (name) => name.endsWith('.json'),
  );
  _copyDir(
    Directory('${root.path}/public/flags'),
    Directory('assets/flags'),
    (name) => name.endsWith('.webp'),
  );
}

void _copyDir(Directory from, Directory to, bool Function(String) include) {
  if (!from.existsSync()) {
    stderr.writeln('Missing ${from.path}, run this from mobile/');
    exit(1);
  }

  to.createSync(recursive: true);
  var count = 0;

  for (final entity in from.listSync().whereType<File>()) {
    final name = entity.uri.pathSegments.last;
    if (!include(name)) continue;
    entity.copySync('${to.path}/$name');
    count++;
  }

  stdout.writeln('Copied $count files to ${to.path}');
}
