import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

class AuthTextField extends StatefulWidget {
  final TextEditingController controller;
  final String labelText;
  final IconData prefixIcon;
  final bool isPassword;
  final bool showValidationCheck;
  final TextInputType keyboardType;
  final String? Function(String?)? validator;

  const AuthTextField({
    Key? key,
    required this.controller,
    required this.labelText,
    required this.prefixIcon,
    this.isPassword = false,
    this.showValidationCheck = false,
    this.keyboardType = TextInputType.text,
    this.validator,
  }) : super(key: key);

  @override
  State<AuthTextField> createState() => _AuthTextFieldState();
}

class _AuthTextFieldState extends State<AuthTextField> {
  bool _obscureText = true;
  bool _isValid = false;

  @override
  void initState() {
    super.initState();
    if (widget.isPassword) {
      _obscureText = true;
    }

    // Listen to text changes for validation
    if (widget.showValidationCheck) {
      widget.controller.addListener(_validateInput);
    }
  }

  @override
  void dispose() {
    if (widget.showValidationCheck) {
      widget.controller.removeListener(_validateInput);
    }
    super.dispose();
  }

  void _validateInput() {
    if (widget.validator != null) {
      setState(() {
        _isValid = widget.validator!(widget.controller.text) == null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: widget.controller,
      obscureText: widget.isPassword && _obscureText,
      keyboardType: widget.keyboardType,
      style: const TextStyle(
        fontSize: 15,
        color: AppColors.textDark,
        fontWeight: FontWeight.w600,
      ),
      decoration: InputDecoration(
        labelText: widget.labelText,
        labelStyle: const TextStyle(
          color: AppColors.textGray,
          fontSize: 13,
          fontWeight: FontWeight.w700,
        ),
        prefixIcon: Icon(
          widget.prefixIcon,
          color: AppColors.forestGreen,
          size: 18,
        ),
        suffixIcon: _buildSuffixIcon(),
        filled: true,
        fillColor: AppColors.inputFieldGray,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.borderSoft),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(
            color: AppColors.primaryGreen,
            width: 1.4,
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
      ),
    );
  }

  Widget? _buildSuffixIcon() {
    if (widget.isPassword) {
      return IconButton(
        icon: Icon(
          _obscureText
              ? Icons.visibility_outlined
              : Icons.visibility_off_outlined,
          color: AppColors.textGray,
          size: 20,
        ),
        onPressed: () {
          setState(() {
            _obscureText = !_obscureText;
          });
        },
      );
    } else if (widget.showValidationCheck && _isValid) {
      return const Icon(
        Icons.check_circle,
        color: AppColors.successGreen,
        size: 20,
      );
    }
    return null;
  }
}
