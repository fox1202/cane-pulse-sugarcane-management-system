import 'package:flutter/material.dart';
import '../utils/app_colors.dart';
import '../utils/app_animations.dart';

class ModernTextField extends StatefulWidget {
  final TextEditingController controller;
  final String labelText;
  final IconData prefixIcon;
  final bool isPassword;
  final bool showValidationCheck;
  final TextInputType keyboardType;
  final String? Function(String?)? validator;

  const ModernTextField({
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
  State<ModernTextField> createState() => _ModernTextFieldState();
}

class _ModernTextFieldState extends State<ModernTextField>
    with SingleTickerProviderStateMixin {
  bool _obscureText = true;
  bool _isValid = false;
  bool _isFocused = false;
  late AnimationController _controller;
  late Animation<double> _labelAnimation;
  late Animation<Color?> _borderColorAnimation;

  @override
  void initState() {
    super.initState();
    if (widget.isPassword) {
      _obscureText = true;
    }

    _controller = AnimationController(
      duration: AppAnimations.normal,
      vsync: this,
    );

    _labelAnimation = Tween<double>(begin: 1.0, end: 0.85).animate(
      CurvedAnimation(parent: _controller, curve: AppAnimations.smooth),
    );

    _borderColorAnimation = ColorTween(
      begin: Colors.transparent,
      end: AppColors.primaryGreen,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));

    // Listen to text changes for validation
    if (widget.showValidationCheck) {
      widget.controller.addListener(_validateInput);
    }

    widget.controller.addListener(_updateLabelPosition);
  }

  @override
  void dispose() {
    if (widget.showValidationCheck) {
      widget.controller.removeListener(_validateInput);
    }
    widget.controller.removeListener(_updateLabelPosition);
    _controller.dispose();
    super.dispose();
  }

  void _validateInput() {
    if (widget.validator != null) {
      setState(() {
        _isValid = widget.validator!(widget.controller.text) == null;
      });
    }
  }

  void _updateLabelPosition() {
    if (widget.controller.text.isNotEmpty && !_controller.isAnimating) {
      if (_controller.status != AnimationStatus.completed) {
        _controller.forward();
      }
    } else if (widget.controller.text.isEmpty && !_isFocused) {
      if (_controller.status != AnimationStatus.dismissed) {
        _controller.reverse();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      onFocusChange: (focused) {
        setState(() => _isFocused = focused);
        if (focused) {
          _controller.forward();
        } else if (widget.controller.text.isEmpty) {
          _controller.reverse();
        }
      },
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) => Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            boxShadow: _isFocused
                ? [
                    BoxShadow(
                      color: AppColors.primaryGreen.withValues(alpha: 0.2),
                      blurRadius: 15,
                      offset: const Offset(0, 5),
                    ),
                  ]
                : [],
          ),
          child: TextField(
            controller: widget.controller,
            obscureText: widget.isPassword && _obscureText,
            keyboardType: widget.keyboardType,
            style: const TextStyle(
              fontSize: 16,
              color: AppColors.textDark,
              fontWeight: FontWeight.w500,
            ),
            decoration: InputDecoration(
              labelText: widget.labelText,
              labelStyle: TextStyle(
                color: _isFocused ? AppColors.primaryGreen : AppColors.textGray,
                fontSize: 16 * _labelAnimation.value,
                fontWeight: FontWeight.w500,
              ),
              floatingLabelBehavior: FloatingLabelBehavior.auto,
              prefixIcon: Icon(
                widget.prefixIcon,
                color: _isFocused ? AppColors.primaryGreen : AppColors.textGray,
                size: 22,
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
                borderSide: BorderSide(
                  color: _borderColorAnimation.value ?? Colors.transparent,
                  width: 0,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(
                  color: AppColors.primaryGreen,
                  width: 2,
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 20,
                vertical: 18,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget? _buildSuffixIcon() {
    if (widget.isPassword) {
      return IconButton(
        icon: AnimatedRotation(
          turns: _obscureText ? 0 : 0.5,
          duration: AppAnimations.fast,
          child: Icon(
            _obscureText
                ? Icons.visibility_outlined
                : Icons.visibility_off_outlined,
            color: _isFocused ? AppColors.primaryGreen : AppColors.textGray,
            size: 22,
          ),
        ),
        onPressed: () {
          setState(() {
            _obscureText = !_obscureText;
          });
        },
      );
    } else if (widget.showValidationCheck && _isValid) {
      return TweenAnimationBuilder<double>(
        tween: Tween(begin: 0.0, end: 1.0),
        duration: AppAnimations.normal,
        curve: AppAnimations.bounce,
        builder: (context, value, child) => Transform.scale(
          scale: value,
          child: const Icon(
            Icons.check_circle,
            color: AppColors.successGreen,
            size: 22,
          ),
        ),
      );
    }
    return null;
  }
}
