import 'package:flutter/material.dart';

class UIProvider with ChangeNotifier {
  bool _isFieldMode = true;

  bool get isFieldMode => _isFieldMode;

  void toggleFieldMode() {
    _isFieldMode = !_isFieldMode;
    notifyListeners();
  }
}
