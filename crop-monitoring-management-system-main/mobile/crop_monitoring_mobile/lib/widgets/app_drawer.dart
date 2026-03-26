import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/sync_provider.dart';
import '../providers/ui_provider.dart';
import '../screens/observation_form_screen.dart';
import '../utils/app_colors.dart';
import '../utils/app_theme.dart';
import 'botanical_background.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final syncProvider = context.watch<SyncProvider>();
    final uiProvider = context.watch<UIProvider>();
    final size = MediaQuery.of(context).size;
    final currentRoute = ModalRoute.of(context)?.settings.name;
    final menuEntries = _visibleEntries(
      context: context,
      currentRoute: currentRoute,
      uiProvider: uiProvider,
    );
    final showLogoutButton = currentRoute != '/dashboard';

    return Drawer(
      width: size.width * 0.84,
      backgroundColor: Colors.transparent,
      elevation: 0,
      child: BotanicalBackground(
        textureOpacity: 0.06,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
            child: Column(
              children: [
                _DrawerHeader(
                  username: authProvider.user?['username'] ?? 'Guest User',
                  role: authProvider.userRole ?? 'Observer',
                  unsyncedCount: syncProvider.unsyncedCount,
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(14, 18, 14, 16),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.78),
                      borderRadius: BorderRadius.circular(34),
                      boxShadow: AppTheme.softShadow(),
                    ),
                    child: ListView(
                      children: [
                        for (final entry in menuEntries)
                          _DrawerTile(
                            icon: entry.icon,
                            title: entry.title,
                            subtitle: entry.subtitle,
                            onTap: entry.onTap,
                            isActive: entry.isActive,
                            accent: entry.accent,
                          ),
                        if (menuEntries.isNotEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12),
                            child: Divider(color: AppColors.borderSoft),
                          ),
                        _DrawerTile(
                          icon: Icons.delete_sweep_rounded,
                          title: 'Clear Local Data',
                          subtitle: 'Remove device-only records',
                          iconColor: AppColors.errorRed,
                          onTap: () async {
                            final confirm = await showDialog<bool>(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(24),
                                ),
                                title: const Text('Clear local data?'),
                                content: const Text(
                                  'This deletes unsynced records stored on the device. The action cannot be undone.',
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(ctx, false),
                                    child: const Text('Cancel'),
                                  ),
                                  ElevatedButton(
                                    onPressed: () => Navigator.pop(ctx, true),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.errorRed,
                                    ),
                                    child: const Text('Clear'),
                                  ),
                                ],
                              ),
                            );

                            if (confirm != true) return;

                            await syncProvider.clearLocalData();
                            if (!context.mounted) return;
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Local data cleared successfully',
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                if (showLogoutButton) ...[
                  const SizedBox(height: 14),
                  InkWell(
                    onTap: () async {
                      await authProvider.logout();
                      if (!context.mounted) return;
                      _closeDrawerAndReplace(context, '/login');
                    },
                    borderRadius: BorderRadius.circular(24),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppColors.peach.withValues(alpha: 0.95),
                            AppColors.butterYellow.withValues(alpha: 0.90),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: AppTheme.softShadow(AppColors.peach),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.logout_rounded,
                            color: AppColors.forestGreen,
                          ),
                          SizedBox(width: 10),
                          Text(
                            'Logout',
                            style: TextStyle(
                              color: AppColors.forestGreen,
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<_DrawerMenuEntry> _visibleEntries({
    required BuildContext context,
    required String? currentRoute,
    required UIProvider uiProvider,
  }) {
    final entries = <_DrawerMenuEntry>[
      _DrawerMenuEntry(
        id: 'home',
        icon: Icons.dashboard_rounded,
        title: 'Home',
        subtitle: 'Overview and quick actions',
        isActive: currentRoute == '/dashboard',
        isVisible: currentRoute != '/dashboard',
        onTap: () => _closeDrawerAndReplace(context, '/dashboard'),
      ),
      _DrawerMenuEntry(
        id: 'observations',
        icon: Icons.auto_stories_rounded,
        title: 'Observations',
        subtitle: 'Saved records',
        accent: AppColors.coolGradient,
        isActive: currentRoute == '/home',
        isVisible: currentRoute != '/home' && currentRoute != '/dashboard',
        onTap: () => _closeDrawerAndReplace(context, '/home'),
      ),
      _DrawerMenuEntry(
        id: 'add-observation',
        icon: Icons.add_circle_outline_rounded,
        title: 'Add Observation',
        subtitle: 'Capture a new record',
        accent: AppColors.warmGradient,
        isVisible: currentRoute != '/dashboard' && currentRoute != '/home',
        onTap: () =>
            _closeDrawerAndPushWidget(context, const ObservationFormScreen()),
      ),
      _DrawerMenuEntry(
        id: 'switch-layout',
        icon: uiProvider.isFieldMode
            ? Icons.view_agenda_rounded
            : Icons.grid_view_rounded,
        title: 'Switch layout',
        subtitle: uiProvider.isFieldMode
            ? 'Simple view is on'
            : 'Detailed view is on',
        isVisible: currentRoute != '/dashboard',
        onTap: () {
          Navigator.pop(context);
          uiProvider.toggleFieldMode();
        },
      ),
      _DrawerMenuEntry(
        id: 'about',
        icon: Icons.info_outline_rounded,
        title: 'About',
        subtitle: 'App info and support',
        isActive: currentRoute == '/about',
        isVisible: currentRoute != '/about',
        onTap: () => _closeDrawerAndPush(context, '/about'),
      ),
    ];

    final seenIds = <String>{};
    return [
      for (final entry in entries)
        if (entry.isVisible && seenIds.add(entry.id)) entry,
    ];
  }

  void _closeDrawerAndReplace(BuildContext context, String routeName) {
    final navigator = Navigator.of(context);
    navigator.pop();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      navigator.pushReplacementNamed(routeName);
    });
  }

  void _closeDrawerAndPush(BuildContext context, String routeName) {
    final navigator = Navigator.of(context);
    navigator.pop();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      navigator.pushNamed(routeName);
    });
  }

  void _closeDrawerAndPushWidget(BuildContext context, Widget screen) {
    final navigator = Navigator.of(context);
    navigator.pop();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      navigator.push(MaterialPageRoute(builder: (_) => screen));
    });
  }
}

class _DrawerMenuEntry {
  final String id;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool isActive;
  final bool isVisible;
  final List<Color>? accent;

  const _DrawerMenuEntry({
    required this.id,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.isActive = false,
    this.isVisible = true,
    this.accent,
  });
}

class _DrawerHeader extends StatelessWidget {
  final String username;
  final String role;
  final int unsyncedCount;

  const _DrawerHeader({
    required this.username,
    required this.role,
    required this.unsyncedCount,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 220,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(34),
        boxShadow: AppTheme.softShadow(AppColors.primaryGreen),
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
                  Colors.black.withValues(alpha: 0.08),
                  AppColors.forestGreen.withValues(alpha: 0.48),
                ],
              ),
            ),
          ),
          Positioned(
            top: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.86),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.cloud_sync_rounded,
                    size: 16,
                    color: AppColors.forestGreen,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    unsyncedCount == 0
                        ? 'All synced'
                        : '$unsyncedCount pending',
                    style: const TextStyle(
                      color: AppColors.forestGreen,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            left: 18,
            right: 18,
            bottom: 18,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white.withValues(alpha: 0.34)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 54,
                    height: 54,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.person_rounded,
                      color: AppColors.forestGreen,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          username,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          role.toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.1,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DrawerTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool isActive;
  final Color? iconColor;
  final List<Color>? accent;

  const _DrawerTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.isActive = false,
    this.iconColor,
    this.accent,
  });

  @override
  Widget build(BuildContext context) {
    final activeGradient =
        accent ??
        (isActive ? AppColors.primaryGradient : AppColors.coolGradient);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isActive ? Colors.white : AppColors.softCream,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: isActive ? AppColors.lightGreen : AppColors.borderSoft,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: activeGradient),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Icon(
                  icon,
                  color:
                      iconColor ??
                      (isActive ? Colors.white : AppColors.forestGreen),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: AppColors.textDark,
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: AppColors.textGray,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: isActive ? AppColors.forestGreen : AppColors.textGray,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
