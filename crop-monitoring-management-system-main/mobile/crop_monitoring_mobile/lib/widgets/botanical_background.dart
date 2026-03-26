import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

class BotanicalBackground extends StatelessWidget {
  final Widget child;
  final bool showLeafTexture;
  final double textureOpacity;
  final Alignment textureAlignment;
  final List<Color>? gradientColors;

  const BotanicalBackground({
    super.key,
    required this.child,
    this.showLeafTexture = true,
    this.textureOpacity = 0.08,
    this.textureAlignment = Alignment.topCenter,
    this.gradientColors,
  });

  @override
  Widget build(BuildContext context) {
    final colors = gradientColors ?? AppColors.heroGradient;

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colors,
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned(
            top: -80,
            right: -40,
            child: _GlowOrb(
              size: 220,
              colors: [
                AppColors.butterYellow.withValues(alpha: 0.65),
                AppColors.peach.withValues(alpha: 0.0),
              ],
            ),
          ),
          Positioned(
            top: 120,
            left: -80,
            child: _GlowOrb(
              size: 180,
              colors: [
                AppColors.petalPink.withValues(alpha: 0.45),
                AppColors.petalPink.withValues(alpha: 0.0),
              ],
            ),
          ),
          Positioned(
            bottom: -100,
            right: -60,
            child: _GlowOrb(
              size: 240,
              colors: [
                AppColors.lightGreen.withValues(alpha: 0.42),
                AppColors.lightGreen.withValues(alpha: 0.0),
              ],
            ),
          ),
          if (showLeafTexture)
            Positioned.fill(
              child: IgnorePointer(
                child: Opacity(
                  opacity: textureOpacity,
                  child: Align(
                    alignment: textureAlignment,
                    child: const Image(
                      image: AssetImage('assets/images/sugarcane_header.png'),
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
              ),
            ),
          child,
        ],
      ),
    );
  }
}

class _GlowOrb extends StatelessWidget {
  final double size;
  final List<Color> colors;

  const _GlowOrb({required this.size, required this.colors});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: colors),
        ),
      ),
    );
  }
}
