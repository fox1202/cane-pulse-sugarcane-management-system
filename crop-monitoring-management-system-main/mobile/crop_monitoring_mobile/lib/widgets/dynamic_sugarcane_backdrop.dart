import 'dart:async';

import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

class DynamicSugarcaneBackdrop extends StatefulWidget {
  final BorderRadius borderRadius;
  final Gradient? overlayGradient;
  final bool showIndicators;
  final Alignment imageAlignment;

  const DynamicSugarcaneBackdrop({
    super.key,
    required this.borderRadius,
    this.overlayGradient,
    this.showIndicators = false,
    this.imageAlignment = Alignment.center,
  });

  static const List<String> _imagePaths = [
    'assets/images/sugarcane_modern.png',
    'assets/images/sugarcane_header.png',
    'assets/images/welcome_hero.png',
    'assets/images/about_hero.png',
  ];

  @override
  State<DynamicSugarcaneBackdrop> createState() =>
      _DynamicSugarcaneBackdropState();
}

class _DynamicSugarcaneBackdropState extends State<DynamicSugarcaneBackdrop> {
  Timer? _timer;
  int _activeIndex = 0;

  @override
  void initState() {
    super.initState();
    if (DynamicSugarcaneBackdrop._imagePaths.length > 1) {
      _timer = Timer.periodic(const Duration(seconds: 4), (_) {
        if (!mounted) return;
        setState(() {
          _activeIndex =
              (_activeIndex + 1) % DynamicSugarcaneBackdrop._imagePaths.length;
        });
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    for (final imagePath in DynamicSugarcaneBackdrop._imagePaths) {
      precacheImage(AssetImage(imagePath), context);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeImage = DynamicSugarcaneBackdrop._imagePaths[_activeIndex];

    return Stack(
      fit: StackFit.expand,
      children: [
        ClipRRect(
          borderRadius: widget.borderRadius,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 900),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInOut,
            transitionBuilder: (child, animation) {
              final fade = CurvedAnimation(
                parent: animation,
                curve: Curves.easeOut,
              );
              final scale = Tween<double>(begin: 1.06, end: 1).animate(fade);
              return FadeTransition(
                opacity: fade,
                child: ScaleTransition(scale: scale, child: child),
              );
            },
            child: Image.asset(
              activeImage,
              key: ValueKey(activeImage),
              fit: BoxFit.cover,
              alignment: widget.imageAlignment,
            ),
          ),
        ),
        if (widget.overlayGradient != null)
          DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: widget.borderRadius,
              gradient: widget.overlayGradient,
            ),
          ),
        if (widget.showIndicators &&
            DynamicSugarcaneBackdrop._imagePaths.length > 1)
          Positioned(
            left: 18,
            bottom: 18,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.76),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: Colors.white.withValues(alpha: 0.82)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: List.generate(
                  DynamicSugarcaneBackdrop._imagePaths.length,
                  (index) => AnimatedContainer(
                    duration: const Duration(milliseconds: 260),
                    curve: Curves.easeOut,
                    width: index == _activeIndex ? 22 : 8,
                    height: 8,
                    margin: EdgeInsets.only(
                      right:
                          index ==
                              DynamicSugarcaneBackdrop._imagePaths.length - 1
                          ? 0
                          : 6,
                    ),
                    decoration: BoxDecoration(
                      color: index == _activeIndex
                          ? AppColors.forestGreen
                          : AppColors.sageGreen,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
