import 'package:flutter/material.dart';
import '../utils/app_colors.dart';
import '../utils/app_animations.dart';
import '../utils/app_theme.dart';

class GradientButton extends StatefulWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final double height;
  final List<Color>? gradientColors;
  final IconData? icon;

  const GradientButton({
    Key? key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.height = 56,
    this.gradientColors,
    this.icon,
  }) : super(key: key);

  @override
  State<GradientButton> createState() => _GradientButtonState();
}

class _GradientButtonState extends State<GradientButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: AppAnimations.normal,
      vsync: this,
    );
    _scaleAnimation =
        Tween<double>(begin: 1.0, end: AppAnimations.buttonPressScale).animate(
          CurvedAnimation(parent: _controller, curve: AppAnimations.easeOut),
        );
    _glowAnimation = Tween<double>(
      begin: 0.3,
      end: 0.6,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = widget.gradientColors ?? AppColors.primaryGradient;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) => Transform.scale(
        scale: _scaleAnimation.value,
        child: Container(
          height: widget.height,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: colors,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              ...AppTheme.softShadow(colors.last),
              BoxShadow(
                color: colors.first.withValues(alpha: _glowAnimation.value),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(24),
              onHighlightChanged: (highlighted) {
                if (highlighted) {
                  _controller.forward();
                } else {
                  _controller.reverse();
                }
              },
              onTap: (widget.isLoading || widget.onPressed == null)
                  ? null
                  : () {
                      widget.onPressed!();
                    },
              child: Center(
                child: widget.isLoading
                    ? const SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2.5,
                        ),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (widget.icon != null) ...[
                            Icon(widget.icon, color: Colors.white, size: 20),
                            const SizedBox(width: 8),
                          ],
                          Text(
                            widget.text,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
