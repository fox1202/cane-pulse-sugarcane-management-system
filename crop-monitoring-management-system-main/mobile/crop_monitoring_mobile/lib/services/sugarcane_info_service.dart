import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

class SugarcaneArticle {
  final String title;
  final String summary;
  final String articleUrl;
  final String? imageUrl;
  final bool isLive;

  const SugarcaneArticle({
    required this.title,
    required this.summary,
    required this.articleUrl,
    this.imageUrl,
    required this.isLive,
  });

  String get sourceLabel => isLive ? 'Live online brief' : 'Offline brief';

  static const fallback = SugarcaneArticle(
    title: 'Sugarcane',
    summary:
        'Sugarcane is a tall tropical grass grown for sugar and bio-based products. Healthy cane production depends on strong sunlight, reliable moisture, nutrient balance, ratoon management, and close scouting for pests, disease, lodging, and harvest timing.',
    articleUrl: 'https://en.wikipedia.org/wiki/Sugarcane',
    imageUrl: null,
    isLive: false,
  );
}

class SugarcaneInfoService {
  static final Uri _summaryUri = Uri.https(
    'en.wikipedia.org',
    '/api/rest_v1/page/summary/Sugarcane',
  );

  Future<SugarcaneArticle> fetchOverview() async {
    try {
      final response = await http
          .get(_summaryUri, headers: const {'accept': 'application/json'})
          .timeout(const Duration(seconds: 8));

      if (response.statusCode != 200) {
        return SugarcaneArticle.fallback;
      }

      final json = jsonDecode(response.body);
      if (json is! Map<String, dynamic>) {
        return SugarcaneArticle.fallback;
      }

      final title = (json['title'] as String?)?.trim();
      final summary = (json['extract'] as String?)?.trim();
      final articleUrl = _extractArticleUrl(json);
      final imageUrl = _extractImageUrl(json);

      return SugarcaneArticle(
        title: (title == null || title.isEmpty)
            ? SugarcaneArticle.fallback.title
            : title,
        summary: (summary == null || summary.isEmpty)
            ? SugarcaneArticle.fallback.summary
            : summary,
        articleUrl: articleUrl ?? SugarcaneArticle.fallback.articleUrl,
        imageUrl: imageUrl,
        isLive: true,
      );
    } catch (_) {
      return SugarcaneArticle.fallback;
    }
  }

  String? _extractArticleUrl(Map<String, dynamic> json) {
    final contentUrls = json['content_urls'];
    if (contentUrls is! Map<String, dynamic>) {
      return null;
    }

    final desktop = contentUrls['desktop'];
    if (desktop is! Map<String, dynamic>) {
      return null;
    }

    final pageUrl = desktop['page'];
    return pageUrl is String && pageUrl.isNotEmpty ? pageUrl : null;
  }

  String? _extractImageUrl(Map<String, dynamic> json) {
    final thumbnail = json['thumbnail'];
    if (thumbnail is! Map<String, dynamic>) {
      return null;
    }

    final source = thumbnail['source'];
    return source is String && source.isNotEmpty ? source : null;
  }
}
