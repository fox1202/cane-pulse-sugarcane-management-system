import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../utils/app_colors.dart';
import '../widgets/auth_showcase_scaffold.dart';
import '../widgets/auth_text_field.dart';
import '../widgets/gradient_button.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen>
    with SingleTickerProviderStateMixin {
  static const List<AuthShowcaseChipData> _heroChips = [];

  static const List<AuthShowcaseChipData> _panelChips = [];

  final TextEditingController fullNameController = TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  late final AnimationController _animController;
  late final Animation<double> _fadeAnimation;
  late final Animation<Offset> _slideAnimation;

  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 950),
      vsync: this,
    );
    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutCubic,
    );
    _slideAnimation =
        Tween<Offset>(begin: const Offset(0, 0.05), end: Offset.zero).animate(
          CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic),
        );
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    fullNameController.dispose();
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  String? _validateEmail(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email is required';
    }

    final emailRegex = RegExp(r'^[\w\-.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!emailRegex.hasMatch(value)) {
      return 'Invalid email';
    }

    return null;
  }

  Future<void> _register() async {
    if (fullNameController.text.isEmpty ||
        emailController.text.isEmpty ||
        passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please fill in all fields'),
          backgroundColor: AppColors.errorRed,
        ),
      );
      return;
    }

    if (_validateEmail(emailController.text) != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid email'),
          backgroundColor: AppColors.errorRed,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    final fullNameParts = fullNameController.text
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    final firstName = fullNameParts.isEmpty ? '' : fullNameParts.first;
    final lastName = fullNameParts.length > 1
        ? fullNameParts.sublist(1).join(' ')
        : '';

    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.register({
      'email': emailController.text.trim(),
      'password': passwordController.text.trim(),
      'first_name': firstName,
      'last_name': lastName,
    });

    if (!mounted) return;

    setState(() => _isLoading = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Account created successfully. Please sign in.'),
          backgroundColor: AppColors.successGreen,
        ),
      );
      Navigator.pushReplacementNamed(context, '/login');
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Registration failed. Email might already be taken.'),
        backgroundColor: AppColors.errorRed,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: AuthShowcaseScaffold(
          onBack: () {
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
              return;
            }
            Navigator.pushReplacementNamed(context, '/login');
          },
          heroImagePath: 'assets/images/sugarcane_header.png',
          heroLabel: '',
          heroTitle: 'Cane Pulse',
          heroDescription: 'Field records and local weather',
          panelTitle: 'Create account',
          panelSubtitle: 'Enter your details to create an account.',
          heroChips: _heroChips,
          panelChips: _panelChips,
          formChildren: [
            AuthTextField(
              controller: fullNameController,
              labelText: 'Full name',
              prefixIcon: Icons.person_outline_rounded,
            ),
            const SizedBox(height: 16),
            AuthTextField(
              controller: emailController,
              labelText: 'Email address',
              prefixIcon: Icons.alternate_email_rounded,
              keyboardType: TextInputType.emailAddress,
              showValidationCheck: true,
              validator: _validateEmail,
            ),
            const SizedBox(height: 16),
            AuthTextField(
              controller: passwordController,
              labelText: 'Password',
              prefixIcon: Icons.lock_outline_rounded,
              isPassword: true,
            ),
            const SizedBox(height: 18),
            GradientButton(
              text: 'Create account',
              onPressed: _isLoading ? null : _register,
              isLoading: _isLoading,
              height: 60,
              gradientColors: const [
                AppColors.primaryGreen,
                AppColors.primaryGreen,
              ],
            ),
          ],
          footer: Center(
            child: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                const Text(
                  'Already have an account? ',
                  style: TextStyle(
                    color: AppColors.textGray,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                GestureDetector(
                  onTap: () =>
                      Navigator.pushReplacementNamed(context, '/login'),
                  child: const Text(
                    'Go to sign in',
                    style: TextStyle(
                      color: AppColors.forestGreen,
                      fontWeight: FontWeight.w900,
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
}
