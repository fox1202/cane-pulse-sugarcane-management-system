import 'package:flutter/material.dart';

import '../utils/app_animations.dart';
import '../utils/app_colors.dart';
import '../widgets/auth_showcase_scaffold.dart';
import '../widgets/gradient_button.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with SingleTickerProviderStateMixin {
  static const List<AuthShowcaseChipData> _heroChips = [];
  static const List<AuthShowcaseChipData> _panelChips = [];

  late final AnimationController _controller;
  late final Animation<double> _fadeAnimation;
  late final Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: AppAnimations.slow,
      vsync: this,
    );

    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0, 0.72, curve: Curves.easeOut),
    );

    _slideAnimation =
        Tween<Offset>(begin: const Offset(0, 0.05), end: Offset.zero).animate(
          CurvedAnimation(
            parent: _controller,
            curve: const Interval(0.16, 1, curve: Curves.easeOutCubic),
          ),
        );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: AuthShowcaseScaffold(
          onBack: () {},
          showBackButton: false,
          heroImagePath: 'assets/images/sugarcane_header.png',
          heroLabel: '',
          heroTitle: 'Cane Pulse',
          heroDescription: 'Field records and local weather',
          panelTitle: 'Welcome',
          panelSubtitle: 'Sign in or create an account to continue.',
          heroChips: _heroChips,
          panelChips: _panelChips,
          formChildren: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              decoration: BoxDecoration(
                color: AppColors.inputFieldGray,
                borderRadius: BorderRadius.circular(22),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Use the app to record field visits, check weather, and review saved observations.',
                    style: TextStyle(
                      color: AppColors.textGray,
                      fontWeight: FontWeight.w600,
                      height: 1.45,
                    ),
                  ),
                  SizedBox(height: 14),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      _WelcomeFeaturePill(
                        icon: Icons.agriculture_rounded,
                        label: 'Add observations',
                      ),
                      _WelcomeFeaturePill(
                        icon: Icons.wb_sunny_rounded,
                        label: 'Check weather',
                      ),
                      _WelcomeFeaturePill(
                        icon: Icons.inventory_2_rounded,
                        label: 'View records',
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            GradientButton(
              text: 'Sign In',
              onPressed: () => Navigator.pushNamed(context, '/login'),
              icon: Icons.login_rounded,
              height: 60,
              gradientColors: const [
                AppColors.primaryGreen,
                AppColors.primaryGreen,
              ],
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.pushNamed(context, '/register'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(60),
                  foregroundColor: AppColors.forestGreen,
                  side: const BorderSide(color: AppColors.borderSoft),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                  backgroundColor: AppColors.softCream,
                  textStyle: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                child: const Text('Create an account'),
              ),
            ),
          ],
          footer: const Center(
            child: Text(
              'Simple tools for day-to-day field work.',
              style: TextStyle(
                color: AppColors.textGray,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _WelcomeFeaturePill extends StatelessWidget {
  final IconData icon;
  final String label;

  const _WelcomeFeaturePill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.borderSoft),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppColors.forestGreen),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.forestGreen,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
