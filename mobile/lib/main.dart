import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/api/api_client.dart';
import 'core/i18n/translations.dart';
import 'core/theme/app_theme.dart';
import 'modules/auth/auth_controller.dart';
import 'modules/auth/auth_repository.dart';
import 'modules/lang_data/lang_repository.dart';
import 'modules/lang_guess/guess_repository.dart';
import 'modules/meta/meta_repository.dart';
import 'modules/user_profile/profile_repository.dart';
import 'router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final api = ApiClient();
  final auth = AuthController(
    api: api,
    repository: AuthRepository(api),
    store: SessionStore(),
  );
  final locale = LocaleController();
  await Future.wait([locale.load(), auth.restore()]);

  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.dark);

  runApp(LangdleApp(api: api, locale: locale, auth: auth));
}

class LangdleApp extends StatefulWidget {
  const LangdleApp({
    super.key,
    required this.api,
    required this.locale,
    required this.auth,
  });

  final ApiClient api;
  final LocaleController locale;
  final AuthController auth;

  @override
  State<LangdleApp> createState() => _LangdleAppState();
}

class _LangdleAppState extends State<LangdleApp> {
  late final GoRouter _router = buildRouter(widget.auth);

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final api = widget.api;

    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: widget.locale),
        ChangeNotifierProvider.value(value: widget.auth),
        Provider.value(value: api),
        Provider(create: (_) => LangRepository(api)),
        Provider(create: (_) => GuessRepository(api)),
        Provider(create: (_) => MetaRepository(api)),
        Provider(create: (_) => ProfileRepository(api)),
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
