import 'package:flutter/material.dart';

import '../../../core/i18n/translations.dart';
import '../../../core/theme/tokens.dart';

/// A field of the auth forms: the kit input, the API's validation message
/// under it, and a show / hide toggle for passwords.
class AuthTextField extends StatefulWidget {
  const AuthTextField({
    super.key,
    required this.controller,
    required this.hint,
    this.errors,
    this.password = false,
    this.keyboardType,
    this.autofillHints,
    this.textInputAction = TextInputAction.next,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String hint;

  /// The field's messages from an `invalidData` answer.
  final List<String>? errors;
  final bool password;
  final TextInputType? keyboardType;
  final Iterable<String>? autofillHints;
  final TextInputAction textInputAction;
  final ValueChanged<String>? onSubmitted;

  @override
  State<AuthTextField> createState() => _AuthTextFieldState();
}

class _AuthTextFieldState extends State<AuthTextField> {
  bool _obscured = true;

  @override
  Widget build(BuildContext context) {
    final errors = widget.errors;

    return TextField(
      controller: widget.controller,
      obscureText: widget.password && _obscured,
      keyboardType: widget.keyboardType,
      autofillHints: widget.autofillHints,
      autocorrect: false,
      enableSuggestions: !widget.password,
      textInputAction: widget.textInputAction,
      onSubmitted: widget.onSubmitted,
      decoration: InputDecoration(
        hintText: widget.hint,
        errorText: errors == null || errors.isEmpty ? null : errors.join(', '),
        suffixIcon: widget.password
            ? IconButton(
                tooltip: context.t(
                  _obscured ? 'Mobile.showPassword' : 'Mobile.hidePassword',
                ),
                style: IconButton.styleFrom(overlayColor: Colors.transparent),
                color: NeoColors.foreground,
                icon: Icon(
                  _obscured
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                ),
                onPressed: () => setState(() => _obscured = !_obscured),
              )
            : null,
      ),
    );
  }
}
