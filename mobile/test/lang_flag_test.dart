import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:langdle_app/core/ui/lang_flag.dart';

bool _isAsset(Widget widget, String name) =>
    widget is Image &&
    widget.image is AssetImage &&
    (widget.image as AssetImage).assetName == name;

bool _isNetwork(Widget widget, String url) =>
    widget is Image &&
    widget.image is NetworkImage &&
    (widget.image as NetworkImage).url == url;

void main() {
  testWidgets('a shipped flag comes from the assets', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: LangFlag('es', flagsBaseUrl: 'https://flags.test'),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.byWidgetPredicate((w) => _isAsset(w, 'assets/flags/es.webp')),
      findsOneWidget,
    );
    expect(
      find.byWidgetPredicate((w) => w is Image && w.image is NetworkImage),
      findsNothing,
    );
  });

  testWidgets('a flag missing from the assets is read from the bucket', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: LangFlag('zz', flagsBaseUrl: 'https://flags.test'),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(
      find.byWidgetPredicate(
        (w) => _isNetwork(w, 'https://flags.test/flags/zz.webp'),
      ),
      findsOneWidget,
    );
  });

  testWidgets('without a bucket the unknown flag is shown', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: LangFlag('zz')));
    await tester.pumpAndSettle();

    expect(
      find.byWidgetPredicate((w) => _isAsset(w, 'assets/flags/unknown.webp')),
      findsOneWidget,
    );
  });
}
