import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ClerkAuthInterceptor extends Interceptor {
  final FlutterSecureStorage secureStorage;

  ClerkAuthInterceptor({required this.secureStorage});

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    try {
      // Read active Clerk JWT token from KeyStore
      final jwtToken = await secureStorage.read(key: 'clerk_session_jwt');
      if (jwtToken != null && jwtToken.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $jwtToken';
      }
    } catch (_) {
      // Continue without token (guest mode fallback)
    }

    return handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Session expired or revoked
    }
    return handler.next(err);
  }
}
