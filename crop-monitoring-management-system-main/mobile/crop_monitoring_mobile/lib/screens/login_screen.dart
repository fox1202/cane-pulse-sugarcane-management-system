import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/sync_provider.dart';
import '../services/auth_preferences_service.dart';
import '../utils/app_colors.dart';
import '../widgets/auth_showcase_scaffold.dart';
import '../widgets/auth_text_field.dart';
import '../widgets/gradient_button.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  static const List<AuthShowcaseChipData> _heroChips = [];

  static const List<AuthShowcaseChipData> _panelChips = [];

  final AuthPreferencesService _authPreferences = AuthPreferencesService();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  late final AnimationController _animController;
  late final Animation<double> _fadeAnimation;
  late final Animation<Offset> _slideAnimation;

  bool _isLoading = false;
  bool _rememberMe = false;

  @override
  void initState() {
    super.initState();
    _loadRememberedLogin();

    _animController = AnimationController(
      duration: const Duration(milliseconds: 900),
      vsync: this,
    );
    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutCubic,
    );
    _slideAnimation =
        Tween<Offset>(begin: const Offset(0, 0.04), end: Offset.zero).animate(
          CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic),
        );
    _animController.forward();
  }

  Future<void> _loadRememberedLogin() async {
    final shouldRememberSession = await _authPreferences.shouldRestoreSession();
    final rememberedEmail = await _authPreferences.getRememberedEmail();

    if (!mounted) return;

    setState(() {
      _rememberMe = shouldRememberSession;
      if (shouldRememberSession && rememberedEmail != null) {
        emailController.text = rememberedEmail;
      }
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  bool _validateFields() {
    if (emailController.text.isEmpty || passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter both email and password'),
          backgroundColor: AppColors.errorRed,
        ),
      );
      return false;
    }
    return true;
  }

  Future<void> _login() async {
    if (!_validateFields()) return;

    setState(() => _isLoading = true);
    final authProvider = context.read<AuthProvider>();
    final syncProvider = context.read<SyncProvider>();

    final success = await authProvider.login(
      emailController.text.trim(),
      passwordController.text.trim(),
      rememberSession: _rememberMe,
    );

    if (!mounted) return;

    setState(() => _isLoading = false);

    if (success) {
      await syncProvider.checkUnsynced();
      await syncProvider.recheckConnectivity();
      if (syncProvider.canAttemptSync) {
        await syncProvider.startSync();
      } else if (syncProvider.connectionIssueMessage != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(syncProvider.connectionIssueMessage!),
            backgroundColor: Colors.orange,
          ),
        );
      }
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/dashboard');
      }
      return;
    }

    final errorMessage =
        authProvider.lastErrorMessage ??
        'Login failed. Please check your credentials.';
    final lowerErrorMessage = errorMessage.toLowerCase();
    final isConnectivityIssue =
        lowerErrorMessage.contains('offline') ||
        lowerErrorMessage.contains('connection') ||
        lowerErrorMessage.contains('server') ||
        lowerErrorMessage.contains('timed out') ||
        lowerErrorMessage.contains('too long');

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(errorMessage),
        backgroundColor: isConnectivityIssue
            ? Colors.orange
            : AppColors.errorRed,
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
            Navigator.pushReplacementNamed(context, '/welcome');
          },
          heroImagePath: 'assets/images/sugarcane_modern.png',
          heroLabel: '',
          heroTitle: 'Cane Pulse',
          heroDescription: 'Field records and local weather',
          panelTitle: 'Sign in',
          panelSubtitle: 'Enter your email and password.',
          heroChips: _heroChips,
          panelChips: _panelChips,
          formChildren: [
            AuthTextField(
              controller: emailController,
              labelText: 'Email address',
              prefixIcon: Icons.alternate_email_rounded,
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            AuthTextField(
              controller: passwordController,
              labelText: 'Password',
              prefixIcon: Icons.lock_outline_rounded,
              isPassword: true,
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(18),
                    onTap: () {
                      setState(() => _rememberMe = !_rememberMe);
                    },
                    child: Row(
                      children: [
                        Checkbox(
                          value: _rememberMe,
                          onChanged: (value) {
                            setState(() => _rememberMe = value ?? false);
                          },
                        ),
                        const Flexible(
                          child: Text(
                            'Keep me signed in',
                            style: TextStyle(
                              color: AppColors.textGray,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pushNamed(context, '/forgot-password');
                  },
                  child: const Text('Forgot password?'),
                ),
              ],
            ),
            const SizedBox(height: 18),
            GradientButton(
              text: 'Sign in',
              onPressed: _isLoading ? null : _login,
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
                  'Need an account? ',
                  style: TextStyle(
                    color: AppColors.textGray,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.pushNamed(context, '/register'),
                  child: const Text(
                    'Create one',
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
