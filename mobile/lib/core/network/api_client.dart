import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/env_config.dart';
import 'clerk_interceptor.dart';

class ApiClient {
  late final Dio dio;

  ApiClient({FlutterSecureStorage? secureStorage}) {
    final storage = secureStorage ?? const FlutterSecureStorage();

    dio = Dio(
      BaseOptions(
        baseUrl: EnvConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 12),
        receiveTimeout: const Duration(seconds: 20),
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AspirinLMS-Mobile/1.0.0 (Android)',
        },
      ),
    );

    dio.interceptors.add(ClerkAuthInterceptor(secureStorage: storage));
  }
}
