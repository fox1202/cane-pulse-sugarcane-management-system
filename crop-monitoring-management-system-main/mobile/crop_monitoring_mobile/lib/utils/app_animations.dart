import 'package:flutter/material.dart';

class AppAnimations {
  // Animation Durations
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 300);
  static const Duration slow = Duration(milliseconds: 500);
  
  // Animation Curves
  static const Curve easeOut = Curves.easeOut;
  static const Curve easeInOut = Curves.easeInOut;
  static const Curve bounce = Curves.elasticOut;
  static const Curve smooth = Curves.easeInOutCubic;
  
  // Stagger Delays
  static const Duration staggerShort = Duration(milliseconds: 50);
  static const Duration staggerMedium = Duration(milliseconds: 100);
  static const Duration staggerLong = Duration(milliseconds: 150);
  
  // Scale Values
  static const double buttonPressScale = 0.95;
  static const double hoverScale = 1.02;
  
  // Fade Values
  static const double fadeStart = 0.0;
  static const double fadeEnd = 1.0;
  
  // Slide Offsets
  static const Offset slideFromRight = Offset(1.0, 0.0);
  static const Offset slideFromLeft = Offset(-1.0, 0.0);
  static const Offset slideFromBottom = Offset(0.0, 0.3);
}
