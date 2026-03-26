import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../utils/app_colors.dart';
import '../utils/app_theme.dart';
import '../widgets/auth_text_field.dart';
import '../widgets/botanical_background.dart';
import '../widgets/glass_card.dart';
import '../widgets/gradient_button.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String email;

  const ResetPasswordScreen({super.key, required this.email});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController tokenController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController confirmPasswordController =
      TextEditingController();
  bool _isLoading = false;
  late AnimationController _animController;
  late List<Animation<double>> _fadeAnimations;
  late List<Animation<Offset>> _slideAnimations;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );

    _fadeAnimations = List.generate(5, (index) {
      final start = (index * 0.1).clamp(0.0, 1.0);
      final end = (0.55 + (index * 0.1)).clamp(0.0, 1.0);
      return Tween<double>(begin: 0, end: 1).animate(
        CurvedAnimation(
          parent: _animController,
          curve: Interval(start, end, curve: Curves.easeOut),
        ),
      );
    });

    _slideAnimations = List.generate(
      5,
      (index) =>
          Tween<Offset>(begin: const Offset(0, 0.08), end: Offset.zero).animate(
            CurvedAnimation(
              parent: _animController,
              curve: Interval(index * 0.1, 0.8, curve: Curves.easeOutCubic),
            ),
          ),
    );

    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    tokenController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _resetPassword() async {
    if (tokenController.text.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the 6-digit code')),
      );
      return;
    }

    if (passwordController.text.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password must be at least 8 characters')),
      );
      return;
    }

    if (passwordController.text != confirmPasswordController.text) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Passwords do not match')));
      return;
    }

    setState(() => _isLoading = true);
    try {
      await Supabase.instance.client.auth.verifyOTP(
        email: widget.email,
        token: tokenController.text,
        type: OtpType.recovery,
      );

      await Supabase.instance.client.auth.updateUser(
        UserAttributes(password: passwordController.text),
      );

      await Supabase.instance.client.auth.signOut();

      if (!mounted) return;

      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password reset successfully. Please login.'),
          backgroundColor: AppColors.successGreen,
        ),
      );
      Navigator.popUntil(context, ModalRoute.withName('/login'));
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
                        icon: Icons.lock_reset_rounded,
                        label: 'Reset password',
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
                          'Set a new password',
                          style: TextStyle(
                            fontSize: 31,
                            fontWeight: FontWeight.w900,
                            color: AppColors.textDark,
                            letterSpacing: -1.2,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Enter the code from your email, then choose a new password.',
                          style: TextStyle(
                            color: AppColors.textGray,
                            height: 1.45,
                          ),
                        ),
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.inputFieldGray,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.mail_outline_rounded,
                                size: 16,
                                color: AppColors.forestGreen,
                              ),
                              const SizedBox(width: 8),
                              Flexible(
                                child: Text(
                                  widget.email,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: AppColors.forestGreen,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        AuthTextField(
                          controller: tokenController,
                          labelText: 'Code from email',
                          prefixIcon: Icons.pin_rounded,
                          keyboardType: TextInputType.number,
                        ),
                        const SizedBox(height: 16),
                        AuthTextField(
                          controller: passwordController,
                          labelText: 'New password',
                          prefixIcon: Icons.lock_outline_rounded,
                          isPassword: true,
                        ),
                        const SizedBox(height: 16),
                        AuthTextField(
                          controller: confirmPasswordController,
                          labelText: 'Confirm password',
                          prefixIcon: Icons.lock_person_outlined,
                          isPassword: true,
                        ),
                        const SizedBox(height: 18),
                        GradientButton(
                          text: 'Update password',
                          onPressed: _isLoading ? null : _resetPassword,
                          isLoading: _isLoading,
                          icon: Icons.check_rounded,
                          height: 60,
                          gradientColors: AppColors.warmGradient,
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
        boxShadow: AppTheme.softShadow(AppColors.peach),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(34),
            child: const Image(
              image: AssetImage('assets/images/sugarcane_modern.png'),
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
                  Colors.black.withValues(alpha: 0.06),
                  AppColors.forestGreen.withValues(alpha: 0.34),
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
                'Use the email code to finish resetting your password',
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
