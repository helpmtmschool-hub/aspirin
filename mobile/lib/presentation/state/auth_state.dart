import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/network/api_client.dart';
import 'subjects_state.dart';

class UserProfile {
  final String id;
  final String email;
  final String fullName;
  final String? avatarUrl;
  final String college;
  final String targetExam; // NEET PG / INI-CET / NExT

  const UserProfile({
    required this.id,
    required this.email,
    required this.fullName,
    this.avatarUrl,
    this.college = 'All India Institute of Medical Sciences',
    this.targetExam = 'NEET-PG 2027',
  });
}

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final UserProfile? user;
  final String? sessionToken;
  final String? errorMessage;

  const AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.user,
    this.sessionToken,
    this.errorMessage,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    UserProfile? user,
    String? sessionToken,
    String? errorMessage,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      sessionToken: sessionToken ?? this.sessionToken,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final FlutterSecureStorage _storage;
  final ApiClient _apiClient;

  AuthNotifier({
    required FlutterSecureStorage storage,
    required ApiClient apiClient,
  })  : _storage = storage,
        _apiClient = apiClient,
        super(const AuthState(isLoading: true)) {
    _checkInitialAuth();
  }

  ApiClient get apiClient => _apiClient;

  Future<void> _checkInitialAuth() async {
    try {
      final token = await _storage.read(key: 'clerk_session_token');
      if (token != null && token.isNotEmpty) {
        // Authenticated user session found
        state = AuthState(
          isAuthenticated: true,
          sessionToken: token,
          user: const UserProfile(
            id: 'med_user_01',
            email: 'resident.doctor@aspirin.lms',
            fullName: 'Dr. Siddharth Rao',
            college: 'AIIMS New Delhi',
            targetExam: 'NEET-PG 2027',
          ),
        );
      } else {
        // Provide demo resident session for seamless offline development
        state = const AuthState(
          isAuthenticated: true,
          sessionToken: 'demo_dev_token',
          user: UserProfile(
            id: 'med_user_demo',
            email: 'resident.doctor@aspirin.lms',
            fullName: 'Dr. Siddharth Rao',
            college: 'AIIMS New Delhi',
            targetExam: 'NEET-PG 2027',
          ),
        );
      }
    } catch (e) {
      state = AuthState(errorMessage: e.toString());
    }
  }

  Future<void> signInWithEmailOtp({
    required String email,
    required String otp,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      // In production, verifies OTP with Clerk Backend via API
      final mockToken = 'clerk_jwt_token_${DateTime.now().millisecondsSinceEpoch}';
      await _storage.write(key: 'clerk_session_token', value: mockToken);

      state = AuthState(
        isAuthenticated: true,
        sessionToken: mockToken,
        user: UserProfile(
          id: 'usr_${email.hashCode.abs()}',
          email: email,
          fullName: 'Dr. Aspirant',
        ),
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Invalid OTP or network timeout. Please verify and try again.',
      );
    }
  }

  Future<void> signOut() async {
    await _storage.delete(key: 'clerk_session_token');
    state = const AuthState(
      isAuthenticated: false,
      user: null,
      sessionToken: null,
    );
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final client = ref.watch(apiClientProvider);
  return AuthNotifier(
    storage: const FlutterSecureStorage(),
    apiClient: client,
  );
});
