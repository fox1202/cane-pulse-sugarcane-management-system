import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/local_db.dart';
import '../providers/sync_provider.dart';
import '../widgets/app_drawer.dart';

class StorageManagementScreen extends StatefulWidget {
  const StorageManagementScreen({Key? key}) : super(key: key);

  @override
  State<StorageManagementScreen> createState() => _StorageManagementScreenState();
}

class _StorageManagementScreenState extends State<StorageManagementScreen> {
  final LocalDB _localDb = LocalDB();
  List<File> _images = [];
  bool _isLoading = true;
  double _totalSizeMB = 0.0;
  final Set<String> _selectedImages = {};

  @override
  void initState() {
    super.initState();
    _loadImages();
  }

  Future<void> _loadImages() async {
    setState(() => _isLoading = true);
    final allImages = await _localDb.getLocalImages();
    
    // Filter out empty/corrupt files
    List<File> validImages = [];
    double size = 0.0;
    
    for (var img in allImages) {
      if (await img.exists() && await img.length() > 0) {
        validImages.add(img);
        size += await img.length();
      }
    }
    
    if (mounted) {
      setState(() {
        _images = validImages;
        _totalSizeMB = size / (1024 * 1024);
        _isLoading = false;
        _selectedImages.clear();
      });
    }
  }

  Future<void> _deleteSelected() async {
    final count = _selectedImages.length;
    if (count == 0) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Images?'),
        content: Text('Are you sure you want to delete $count selected image(s)? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true), 
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      for (var path in _selectedImages) {
        await _localDb.deleteImage(path);
      }
      
      // Refresh list
      await _loadImages();
      
      // Update app state storage calculation
      if (mounted) {
        context.read<SyncProvider>().checkUnsynced();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Deleted $count images')),
        );
      }
    }
  }

  Future<void> _resetAppData() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reset All Data?'),
        content: const Text(
          'WARNING: This will delete ALL offline data, drafts, and unsynced records. \n\n'
          'Use this to clear old incompatible drafts. This action cannot be undone.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true), 
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('RESET EVERYTHING', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _localDb.clearAllData();
      await _loadImages(); // Will likely be empty now
      
      if (mounted) {
         context.read<SyncProvider>().checkUnsynced();
         ScaffoldMessenger.of(context).showSnackBar(
           const SnackBar(
             content: Text('App data reset successfully!'),
             backgroundColor: Colors.red,
           ),
         );
      }
    }
  }

  void _toggleSelection(String path) {
    setState(() {
      if (_selectedImages.contains(path)) {
        _selectedImages.remove(path);
      } else {
        _selectedImages.add(path);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isSelectionMode = _selectedImages.isNotEmpty;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(isSelectionMode ? '${_selectedImages.length} Selected' : 'Storage Management',
          style: TextStyle(color: isSelectionMode ? Colors.black : const Color(0xFF1B5E20), fontWeight: FontWeight.bold, letterSpacing: -0.5)
        ),
        backgroundColor: isSelectionMode ? Colors.grey.shade200 : Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: isSelectionMode ? Colors.black : const Color(0xFF1B5E20)),
        leading: isSelectionMode 
          ? IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => setState(() => _selectedImages.clear()),
            )
          : null, // Let Scaffold handle the drawer menu icon
        actions: [
          if (isSelectionMode)
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              onPressed: _deleteSelected,
            )
          else
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
               onPressed: _loadImages,
            ),
        ],
      ),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          // Storage Summary
          if (!isSelectionMode)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Colors.grey.shade100)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'LOCAL STORAGE USED',
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.2),
                ),
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _totalSizeMB.toStringAsFixed(1),
                      style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20), letterSpacing: -1),
                    ),
                    const Padding(
                      padding: EdgeInsets.only(bottom: 12, left: 6),
                      child: Text('MB', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF2E7D32))),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F8E9),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${_images.length} Photos',
                        style: const TextStyle(color: Color(0xFF2E7D32), fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: LinearProgressIndicator(
                    value: _totalSizeMB > 100 ? 1.0 : _totalSizeMB / 100,
                    backgroundColor: const Color(0xFFF1F8E9),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2E7D32)),
                    minHeight: 10,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: _resetAppData,
                      icon: const Icon(Icons.delete_forever_rounded, size: 16),
                      label: const Text('Clear All Offline Data', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.red.shade700,
                        backgroundColor: Colors.red.shade50,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF2E7D32)))
              : _images.isEmpty 
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.photo_library_outlined, size: 64, color: Colors.grey.shade300),
                        ),
                        const SizedBox(height: 24),
                        Text('No Local Images', style: TextStyle(color: Colors.grey.shade600, fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Text('Captured photos will appear here.', style: TextStyle(color: Colors.grey.shade400)),
                      ],
                    ),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.all(20),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: _images.length,
                    itemBuilder: (context, index) {
                      final file = _images[index];
                      final isSelected = _selectedImages.contains(file.path);
                      
                      return GestureDetector(
                        onTap: () {
                          if (isSelectionMode) {
                            _toggleSelection(file.path);
                          } else {
                            _toggleSelection(file.path);
                          }
                        },
                        onLongPress: () => _toggleSelection(file.path),
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.05),
                                blurRadius: 8,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              Image.file(
                                file, 
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) {
                                  return Container(
                                    color: Colors.grey[200],
                                    child: const Icon(Icons.broken_image, color: Colors.grey),
                                  );
                                },
                              ),
                              if (isSelected)
                                Container(
                                  color: const Color(0xFF2E7D32).withValues(alpha: 0.1),
                                  child: const Center(
                                    child: Icon(Icons.check_circle_rounded, color: Colors.white, size: 36),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
