import 'dart:ui';
import 'package:flutter/material.dart';

import '../utils/app_colors.dart';
import '../utils/app_theme.dart';

class GlassCard extends StatefulWidget {
  final Widget child;
  final double borderRadius;
  final EdgeInsetsGeometry padding;
  final bool enableHoverEffect;

  const GlassCard({
    Key? key,
    required this.child,
    this.borderRadius = 24,
    this.padding = const EdgeInsets.all(32),
    this.enableHoverEffect = false,
  }) : super(key: key);

  @override
  State<GlassCard> createState() => _GlassCardState();
}

class _GlassCardState extends State<GlassCard>
    with SingleTickerProviderStateMixin {
  bool _isHovered = false;
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 1.01,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) {
        if (widget.enableHoverEffect) {
          setState(() => _isHovered = true);
          _controller.forward();
        }
      },
      onExit: (_) {
        if (widget.enableHoverEffect) {
          setState(() => _isHovered = false);
          _controller.reverse();
        }
      },
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) =>
            Transform.scale(scale: _scaleAnimation.value, child: child),
        child: Container(
          padding: widget.padding,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withValues(alpha: 0.92),
                AppColors.softCream.withValues(alpha: 0.82),
              ],
            ),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.75),
              width: 1.5,
            ),
            boxShadow: [
              ...AppTheme.softShadow(),
              if (_isHovered)
                BoxShadow(
                  color: AppColors.butterYellow.withValues(alpha: 0.18),
                  blurRadius: 36,
                  offset: const Offset(0, 18),
                ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(widget.borderRadius - 2),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
              child: widget.child,
            ),
          ),
        ),
      ),
    );
  }
}
