import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/security/secure_vault.dart';
import '../../data/repositories/subject_repository.dart';
import '../../domain/entities/module.dart';
import '../../domain/entities/topic.dart';
import '../../domain/entities/note.dart';
import 'platform_state.dart';

// Repositories
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});

final secureVaultProvider = Provider<SecureVault>((ref) {
  return SecureVault();
});

final subjectRepositoryProvider = Provider<SubjectRepository>((ref) {
  final client = ref.watch(apiClientProvider);
  final vault = ref.watch(secureVaultProvider);
  return SubjectRepositoryImpl(apiClient: client, secureVault: vault);
});

// Active Prof filter (null means All)
final selectedProfFilterProvider = StateProvider<MBBSProf?>((ref) => null);

// Search Query
final searchQueryProvider = StateProvider<String>((ref) => '');

// All subjects for current platform
final allSubjectsProvider = FutureProvider<List<Subject>>((ref) async {
  final platform = ref.watch(selectedPlatformProvider);
  final repository = ref.watch(subjectRepositoryProvider);
  return repository.getSubjects(platform: platform);
});

// Filtered subjects based on selected Prof and search query
final filteredSubjectsProvider = Provider<AsyncValue<List<Subject>>>((ref) {
  final subjectsAsync = ref.watch(allSubjectsProvider);
  final selectedProf = ref.watch(selectedProfFilterProvider);
  final query = ref.watch(searchQueryProvider).toLowerCase().trim();

  return subjectsAsync.whenData((subjects) {
    return subjects.where((s) {
      final matchesProf = selectedProf == null || s.prof == selectedProf;
      final matchesQuery = query.isEmpty ||
          s.name.toLowerCase().contains(query) ||
          s.code.toLowerCase().contains(query) ||
          (s.leadFaculty != null && s.leadFaculty!.toLowerCase().contains(query));
      return matchesProf && matchesQuery;
    }).toList();
  });
});

// Subject Detail Provider
final subjectDetailProvider =
    FutureProvider.family<Subject?, String>((ref, subjectId) async {
  final repository = ref.watch(subjectRepositoryProvider);
  return repository.getSubjectDetail(subjectId);
});

// Subject Modules Hierarchy
final subjectModulesProvider =
    FutureProvider.family<List<Module>, String>((ref, subjectId) async {
  final repository = ref.watch(subjectRepositoryProvider);
  return repository.getSubjectModules(subjectId);
});

// Subject Notes List
final subjectNotesProvider =
    FutureProvider.family<List<NoteItem>, String>((ref, subjectId) async {
  final repository = ref.watch(subjectRepositoryProvider);
  return repository.getSubjectNotes(subjectId);
});

// Last Watched Topic for "Resume Where I Left" Hero Card
final lastWatchedTopicProvider = FutureProvider<Topic?>((ref) async {
  final repository = ref.watch(subjectRepositoryProvider);
  return repository.getLastWatchedTopic();
});

// Continue Subjects Carousel
final continueSubjectsProvider = FutureProvider<List<Subject>>((ref) async {
  final repository = ref.watch(subjectRepositoryProvider);
  return repository.getContinueSubjects();
});

// High Yield Notes for Home Screen Carousel
final highYieldNotesProvider = FutureProvider<List<NoteItem>>((ref) async {
  final repository = ref.watch(subjectRepositoryProvider);
  return repository.getHighYieldNotes();
});
