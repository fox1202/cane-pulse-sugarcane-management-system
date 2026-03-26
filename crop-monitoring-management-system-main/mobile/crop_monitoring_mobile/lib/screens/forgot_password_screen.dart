import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../utils/app_colors.dart';
import '../utils/app_theme.dart';
import '../widgets/auth_text_field.dart';
import '../widgets/botanical_background.dart';
import '../widgets/glass_card.dart';
import '../widgets/gradient_button.dart';
import 'reset_password_screen.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController emailController = TextEditingController();
  bool _isLoading = false;
  late AnimationController _animController;
  late List<Animation<double>> _fadeAnimations;
  late List<Animation<Offset>> _slideAnimations;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );

    _fadeAnimations = List.generate(4, (index) {
      final start = (index * 0.12).clamp(0.0, 1.0);
      final end = (0.6 + (index * 0.1)).clamp(0.0, 1.0);
      return Tween<double>(begin: 0, end: 1).animate(
        CurvedAnimation(
          parent: _animController,
          curve: Interval(start, end, curve: Curves.easeOut),
        ),
      );
    });

    _slideAnimations = List.generate(
      4,
      (index) =>
          Tween<Offset>(begin: const Offset(0, 0.08), end: Offset.zero).animate(
            CurvedAnimation(
              parent: _animController,
              curve: Interval(index * 0.1, 0.7, curve: Curves.easeOutCubic),
            ),
          ),
    );

    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    emailController.dispose();
    super.dispose();
  }

  Future<void> _requestReset() async {
    if (emailController.text.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please enter your email')));
      return;
    }

    setState(() => _isLoading = true);
    try {
      await Supabase.instance.client.auth.resetPasswordForEmail(
        emailController.text,
      );
      if (!mounted) return;

      setState(() => _isLoading = false);
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) =>
              ResetPasswordScreen(email: emailController.text),
        ),
      );

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password reset email sent. Please check your inbox.'),
          backgroundColor: AppColors.successGreen,
        ),
      );
    } catch (e) {
      if (!mounted) return;

      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: AppColors.errorRed,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BotanicalBackground(
        textureOpacity: 0.12,
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 18, 24, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildAnimatedWidget(
                  0,
                  Row(
                    children: [
                      _RoundIconButton(
                        icon: Icons.arrow_back_ios_new_rounded,
                        onTap: () => Navigator.pop(context),
                      ),
                      const Spacer(),
                      const _MiniBadge(
                        icon: Icons.mail_outline_rounded,
                        label: 'Password help',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                _buildAnimatedWidget(0, _buildHeroCard()),
                const SizedBox(height: 24),
                _buildAnimatedWidget(
                  1,
                  GlassCard(
                    borderRadius: 34,
                    padding: const EdgeInsets.fromLTRB(24, 24, 24, 26),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Reset password',
                          style: TextStyle(
                            fontSize: 31,
                            fontWeight: FontWeight.w900,
                            color: AppColors.textDark,
                            letterSpacing: -1.2,
                            height: 1.05,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Enter your email address and we will send password reset instructions.',
                          style: TextStyle(
                            color: AppColors.textGray,
                            height: 1.45,
                          ),
                        ),
                        const SizedBox(height: 20),
                        AuthTextField(
                          controller: emailController,
                          labelText: 'Email address',
                          prefixIcon: Icons.alternate_email_rounded,
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 18),
                        GradientButton(
                          text: 'Send reset email',
                          onPressed: _isLoading ? null : _requestReset,
                          isLoading: _isLoading,
                          icon: Icons.arrow_forward_rounded,
                          height: 60,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeroCard() {
    return Container(
      height: 190,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(34),
        boxShadow: AppTheme.softShadow(AppColors.lightGreen),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(34),
            child: const Image(
              image: AssetImage('assets/images/sugarcane_header.png'),
              fit: BoxFit.cover,
            ),
          ),
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(34),
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.04),
                  AppColors.forestGreen.withValues(alpha: 0.38),
                ],
              ),
            ),
          ),
          Positioned(
            left: 18,
            bottom: 18,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.88),
                borderRadius: BorderRadius.circular(22),
              ),
              child: const Text(
                'We will send a reset link to your email',
                style: TextStyle(
                  color: AppColors.forestGreen,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnimatedWidget(int index, Widget child) {
    return SlideTransition(
      position: _slideAnimations[index],
      child: FadeTransition(opacity: _fadeAnimations[index], child: child),
    );
  }
}

class _RoundIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _RoundIconButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.8),
          shape: BoxShape.circle,
          boxShadow: AppTheme.softShadow(AppColors.lightGreen),
        ),
        child: Icon(icon, size: 18, color: AppColors.forestGreen),
      ),
    );
  }
}

class _MiniBadge extends StatelessWidget {
  final IconData icon;
  final String label;

  const _MiniBadge({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.74),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.9)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.forestGreen),
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
