import 'package:flutter/material.dart';

import '../utils/app_colors.dart';
import '../utils/app_theme.dart';
import '../widgets/app_drawer.dart';
import '../widgets/botanical_background.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      body: BotanicalBackground(
        showLeafTexture: false,
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
            children: [
              Row(
                children: [
                  _CircleAction(
                    icon: Icons.arrow_back_ios_new_rounded,
                    onTap: () => Navigator.pop(context),
                  ),
                  const Spacer(),
                  Builder(
                    builder: (drawerContext) => _CircleAction(
                      icon: Icons.menu_rounded,
                      onTap: () => Scaffold.of(drawerContext).openDrawer(),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              const _AboutCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'About CanePulse',
                      style: TextStyle(
                        color: AppColors.textDark,
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.8,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'CanePulse helps field teams record observations, check weather, and review saved records in one place.',
                      style: TextStyle(
                        color: AppColors.textGray,
                        fontWeight: FontWeight.w700,
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              const _AboutSection(
                title: 'What You Can Do',
                items: [
                  _AboutItem(
                    icon: Icons.add_circle_outline_rounded,
                    title: 'Add observations',
                    description:
                        'Save field notes for each visit with the key details in one form.',
                  ),
                  _AboutItem(
                    icon: Icons.cloud_sync_rounded,
                    title: 'Work offline',
                    description:
                        'Keep collecting records even when the network is weak and sync later.',
                  ),
                  _AboutItem(
                    icon: Icons.wb_cloudy_rounded,
                    title: 'Check weather',
                    description:
                        'View local weather conditions before or during field work.',
                  ),
                  _AboutItem(
                    icon: Icons.inventory_2_rounded,
                    title: 'Review saved records',
                    description:
                        'Open recent observations quickly and check the details later.',
                  ),
                ],
              ),
              const SizedBox(height: 18),
              const _AboutCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Version',
                      style: TextStyle(
                        color: AppColors.textDark,
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    SizedBox(height: 12),
                    Text(
                      'CanePulse v2.4.0',
                      style: TextStyle(
                        color: AppColors.forestGreen,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Build 2026.02.01',
                      style: TextStyle(
                        color: AppColors.textGray,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              const _AboutCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Support',
                      style: TextStyle(
                        color: AppColors.textDark,
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    SizedBox(height: 10),
                    Text(
                      'If you need help, contact the support team:\n'
                      'silentabrahamganda02@gmail.com\n'
                      'pmafuratidze@science.uz.ac.zw',
                      style: TextStyle(
                        color: AppColors.textGray,
                        fontWeight: FontWeight.w700,
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AboutSection extends StatelessWidget {
  final String title;
  final List<_AboutItem> items;

  const _AboutSection({required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    return _AboutCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: AppColors.textDark,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 16),
          for (int index = 0; index < items.length; index++) ...[
            if (index > 0) const SizedBox(height: 12),
            _AboutFeatureRow(item: items[index]),
          ],
        ],
      ),
    );
  }
}

class _AboutCard extends StatelessWidget {
  final Widget child;

  const _AboutCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white),
        boxShadow: AppTheme.softShadow(AppColors.lightGreen),
      ),
      child: child,
    );
  }
}

class _AboutFeatureRow extends StatelessWidget {
  final _AboutItem item;

  const _AboutFeatureRow({required this.item});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: AppColors.coolGradient),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Icon(item.icon, color: AppColors.forestGreen),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.title,
                style: const TextStyle(
                  color: AppColors.textDark,
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                item.description,
                style: const TextStyle(
                  color: AppColors.textGray,
                  fontWeight: FontWeight.w700,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CircleAction extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _CircleAction({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        width: 50,
        height: 50,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.86),
          shape: BoxShape.circle,
          boxShadow: AppTheme.softShadow(AppColors.lightGreen),
        ),
        child: Icon(icon, color: AppColors.forestGreen),
      ),
    );
  }
}

class _AboutItem {
  final IconData icon;
  final String title;
  final String description;

  const _AboutItem({
    required this.icon,
    required this.title,
    required this.description,
  });
}
