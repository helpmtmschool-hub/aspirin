class EnvConfig {
  /// Clerk Authentication Publishable Key
  static const String clerkPublishableKey = String.fromEnvironment(
    'CLERK_PUBLISHABLE_KEY',
    defaultValue: 'pk_test_Y2VudHJhbC1mb3gtMjExNy5jbGVyay5hY2NvdW50cy5kZXYk',
  );

  /// Edge API Base URL (Cloudflare Workers API)
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://aspirin-lms.pages.dev/api',
  );

  /// Clerk Accounts Domain
  static const String clerkDomain = 'central-fox-2117.clerk.accounts.dev';

  /// Streaming & Content Encryption Magic Header
  static const String cipherMagicHeader = 'ASPR';

  /// App Info
  static const String appName = 'Aspirin LMS';
  static const String appVersion = '1.0.0';
}
