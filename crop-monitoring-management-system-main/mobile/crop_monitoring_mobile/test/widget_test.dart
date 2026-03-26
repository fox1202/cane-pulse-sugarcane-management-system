import 'package:flutter_test/flutter_test.dart';

import 'package:crop_monitoring_mobile/main.dart';

void main() {
  testWidgets('shows the CanePulse welcome experience', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const MyApp());
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Cane Pulse'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
    expect(find.text('Create an account'), findsOneWidget);
  });
}
