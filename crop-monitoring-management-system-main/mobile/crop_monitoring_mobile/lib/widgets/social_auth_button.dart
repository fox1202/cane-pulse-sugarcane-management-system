import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

enum SocialAuthProvider { facebook, google, apple }

class SocialAuthButton extends StatelessWidget {
  final SocialAuthProvider provider;
  final VoidCallback onPressed;

  const SocialAuthButton({
    Key? key,
    required this.provider,
    required this.onPressed,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 50,
      height: 50,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(
          color: Colors.grey.shade300,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: IconButton(
        onPressed: onPressed,
        icon: Icon(
          _getIcon(),
          color: _getColor(),
          size: 24,
        ),
        padding: EdgeInsets.zero,
      ),
    );
  }

  IconData _getIcon() {
    switch (provider) {
      case SocialAuthProvider.facebook:
        return Icons.facebook;
      case SocialAuthProvider.google:
        return Icons.g_mobiledata;
      case SocialAuthProvider.apple:
        return Icons.apple;
    }
  }

  Color _getColor() {
    switch (provider) {
      case SocialAuthProvider.facebook:
        return AppColors.facebookBlue;
      case SocialAuthProvider.google:
        return AppColors.googleRed;
      case SocialAuthProvider.apple:
        return AppColors.appleBlack;
    }
  }
}
