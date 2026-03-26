import 'package:flutter/material.dart';

import '../utils/app_colors.dart';
import '../utils/app_theme.dart';

class AuthShowcaseChipData {
  final IconData icon;
  final String label;

  const AuthShowcaseChipData({required this.icon, required this.label});
}

class AuthShowcaseScaffold extends StatelessWidget {
  final VoidCallback onBack;
  final bool showBackButton;
  final String heroImagePath;
  final String heroLabel;
  final String heroTitle;
  final String heroDescription;
  final String panelTitle;
  final String panelSubtitle;
  final List<AuthShowcaseChipData> heroChips;
  final List<AuthShowcaseChipData> panelChips;
  final List<Widget> formChildren;
  final Widget footer;

  const AuthShowcaseScaffold({
    super.key,
    required this.onBack,
    this.showBackButton = true,
    required this.heroImagePath,
    required this.heroLabel,
    required this.heroTitle,
    required this.heroDescription,
    required this.panelTitle,
    required this.panelSubtitle,
    required this.heroChips,
    required this.panelChips,
    required this.formChildren,
    required this.footer,
  });

  @override
  Widget build(BuildContext context) {
    final chips = [...heroChips, ...panelChips];

    return Scaffold(
      backgroundColor: AppColors.backgroundGray,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (showBackButton) ...[
                    _BackButton(onTap: onBack),
                    const SizedBox(height: 16),
                  ],
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: AppTheme.softShadow(),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _HeroBanner(
                          imagePath: heroImagePath,
                          heroLabel: heroLabel,
                          heroTitle: heroTitle,
                          heroDescription: heroDescription,
                        ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(22, 22, 22, 24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                panelTitle,
                                style: const TextStyle(
                                  fontSize: 30,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.textDark,
                                  letterSpacing: -1.0,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                panelSubtitle,
                                style: const TextStyle(
                                  color: AppColors.textGray,
                                  fontWeight: FontWeight.w600,
                                  height: 1.45,
                                ),
                              ),
                              if (chips.isNotEmpty) ...[
                                const SizedBox(height: 16),
                                Wrap(
                                  spacing: 10,
                                  runSpacing: 10,
                                  children: [
                                    for (final chip in chips)
                                      _InfoChip(data: chip),
                                  ],
                                ),
                              ],
                              const SizedBox(height: 22),
                              ...formChildren,
                              const SizedBox(height: 20),
                              footer,
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HeroBanner extends StatelessWidget {
  final String imagePath;
  final String heroLabel;
  final String heroTitle;
  final String heroDescription;

  const _HeroBanner({
    required this.imagePath,
    required this.heroLabel,
    required this.heroTitle,
    required this.heroDescription,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
      child: Stack(
        children: [
          SizedBox(
            height: 170,
            width: double.infinity,
            child: Image.asset(imagePath, fit: BoxFit.cover),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.08),
                    AppColors.forestGreen.withValues(alpha: 0.52),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            left: 20,
            right: 20,
            bottom: 18,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (heroLabel.trim().isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.28),
                      ),
                    ),
                    child: Text(
                      heroLabel,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                if (heroTitle.trim().isNotEmpty)
                  Text(
                    heroTitle,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1.0,
                    ),
                  ),
                if (heroDescription.trim().isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    heroDescription,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.92),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BackButton extends StatelessWidget {
  final VoidCallback onTap;

  const _BackButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          boxShadow: AppTheme.softShadow(AppColors.lightGreen),
        ),
        child: const Icon(
          Icons.arrow_back_ios_new_rounded,
          color: AppColors.textDark,
          size: 20,
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final AuthShowcaseChipData data;

  const _InfoChip({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: AppColors.inputFieldGray,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(data.icon, size: 15, color: AppColors.forestGreen),
          const SizedBox(width: 8),
          Text(
            data.label,
            style: const TextStyle(
              color: AppColors.forestGreen,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
