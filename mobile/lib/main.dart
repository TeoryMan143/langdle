import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/api/api_client.dart';
import 'core/i18n/translations.dart';
import 'core/theme/app_theme.dart';
import 'modules/lang_data/lang_repository.dart';
import 'modules/lang_guess/guess_repository.dart';
import 'router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final locale = LocaleController();
  await locale.load();

  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.dark);

  runApp(LangdleApp(locale: locale));
}

class LangdleApp extends StatefulWidget {
  const LangdleApp({super.key, required this.locale});

  final LocaleController locale;

  @override
  State<LangdleApp> createState() => _LangdleAppState();
}

class _LangdleAppState extends State<LangdleApp> {
  final ApiClient _api = ApiClient();
  final GoRouter _router = buildRouter();

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: widget.locale),
        Provider.value(value: _api),
        Provider(create: (_) => LangRepository(_api)),
        Provider(create: (_) => GuessRepository(_api)),
        Provider(create: (_) => DailySaveStore()),
      ],
      child: Consumer<LocaleController>(
        builder: (context, locale, _) => MaterialApp.router(
          title: 'Langdle',
          debugShowCheckedModeBanner: false,
          theme: buildAppTheme(),
          locale: locale.locale,
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          supportedLocales: [
            for (final code in LocaleController.supported) Locale(code),
          ],
          routerConfig: _router,
        ),
      ),
    );
  }
}
