import '../../core/network/api_client.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/security/secure_vault.dart';
import '../../domain/entities/subject.dart';
import '../../domain/entities/module.dart';
import '../../domain/entities/topic.dart';
import '../../domain/entities/note.dart';

abstract class SubjectRepository {
  Future<List<Subject>> getSubjects({PlatformId platform = PlatformId.prepxEn});
  Future<Subject?> getSubjectDetail(String subjectId);
  Future<List<Module>> getSubjectModules(String subjectId);
  Future<List<NoteItem>> getSubjectNotes(String subjectId);
  Future<Topic?> getLastWatchedTopic();
  Future<List<Subject>> getContinueSubjects();
  Future<List<NoteItem>> getHighYieldNotes();
}

class SubjectRepositoryImpl implements SubjectRepository {
  final ApiClient apiClient;
  final SecureVault secureVault;

  SubjectRepositoryImpl({
    required this.apiClient,
    required this.secureVault,
  });

  @override
  Future<List<Subject>> getSubjects({PlatformId platform = PlatformId.prepxEn}) async {
    try {
      final response = await apiClient.dio.get(ApiEndpoints.subjects);
      if (response.statusCode == 200 && response.data['subjects'] != null) {
        final list = (response.data['subjects'] as List).map((json) {
          return Subject(
            id: json['id'] ?? '',
            name: json['name'] ?? '',
            code: json['code'] ?? '',
            prof: MBBSProf.fromString(json['prof'] ?? '1st Prof'),
            category: json['category'] ?? 'Pre-Clinical',
            icon: json['icon'] ?? 'stethoscope',
            color: json['color'] ?? '#00A389',
            displayOrder: json['display_order'] ?? 1,
            totalTopics: json['total_topics'] ?? 0,
            totalNotes: json['total_notes'] ?? 0,
            completedTopics: json['completed_topics'] ?? 0,
            progressPercentage: json['progress_percentage'] ?? 0,
            leadFaculty: json['lead_faculty'],
          );
        }).toList();
        return list;
      }
    } catch (_) {
      // Fallback to verified local curriculum
    }

    return _getFallbackSubjects();
  }

  @override
  Future<Subject?> getSubjectDetail(String subjectId) async {
    final all = await getSubjects();
    return all.firstWhere((s) => s.id == subjectId, orElse: () => _getFallbackSubjects().first);
  }

  @override
  Future<List<Module>> getSubjectModules(String subjectId) async {
    try {
      final response = await apiClient.dio.get(ApiEndpoints.subjectDetail(subjectId));
      if (response.statusCode == 200 && response.data['modules'] != null) {
        final modulesList = (response.data['modules'] as List).map((mJson) {
          final topicsList = (mJson['topics'] as List? ?? []).map((tJson) {
            return Topic(
              id: tJson['id'] ?? '',
              subjectId: tJson['subject_id'] ?? subjectId,
              moduleId: tJson['module_id'] ?? mJson['id'],
              title: tJson['title'] ?? '',
              filename: tJson['filename'] ?? '',
              fileSizeBytes: tJson['file_size_bytes'] ?? 150000000,
              durationSeconds: tJson['duration_seconds'] ?? 1800,
              durationFormatted: tJson['duration_formatted'] ?? '30 mins',
              telegramChatId: tJson['telegram_chat_id'] ?? -1003709841202,
              telegramMessageId: tJson['telegram_message_id'] ?? 1,
              watchedSeconds: (tJson['watched_seconds'] as num?)?.toDouble() ?? 0.0,
              isCompleted: tJson['is_completed'] == 1,
              isBookmarked: tJson['is_bookmarked'] == 1,
              faculty: tJson['faculty'],
            );
          }).toList();

          return Module(
            id: mJson['id'] ?? '',
            subjectId: subjectId,
            title: mJson['title'] ?? '',
            displayOrder: mJson['display_order'] ?? 1,
            topics: topicsList,
          );
        }).toList();

        return modulesList;
      }
    } catch (_) {}

    return _getFallbackModules(subjectId);
  }

  @override
  Future<List<NoteItem>> getSubjectNotes(String subjectId) async {
    try {
      final response = await apiClient.dio.get(ApiEndpoints.subjectDetail(subjectId));
      if (response.statusCode == 200 && response.data['notes'] != null) {
        return (response.data['notes'] as List).map((n) {
          return NoteItem(
            id: n['id'] ?? '',
            subjectId: subjectId,
            title: n['title'] ?? '',
            filename: n['filename'] ?? '',
            fileSizeBytes: n['file_size_bytes'] ?? 45000000,
            telegramChatId: n['telegram_chat_id'] ?? -1003709841202,
            telegramMessageId: n['telegram_message_id'] ?? 1,
            pageCount: n['page_count'] ?? 120,
            faculty: n['faculty'],
            isMasterTextbook: n['is_master_textbook'] == 1,
          );
        }).toList();
      }
    } catch (_) {}

    return _getFallbackNotes(subjectId);
  }

  @override
  Future<Topic?> getLastWatchedTopic() async {
    // Primary "Resume Where I Left" Hero Topic
    return const Topic(
      id: 'surg_101',
      subjectId: 'general_surgery',
      moduleId: 'mod_surg_1',
      title: 'Intestinal Obstruction & Volvulus',
      filename: 'surgery_intestinal_obstruction.mp4',
      fileSizeBytes: 345000000,
      durationSeconds: 2520, // 42 mins
      durationFormatted: '42 mins',
      telegramChatId: -1003264222864,
      telegramMessageId: 345,
      watchedSeconds: 1440, // 24 mins watched, 18 mins left
      isCompleted: false,
      faculty: 'Dr. Rohan Khandelwal',
      pearls: [
        'Coffee bean sign on abdominal X-Ray indicates Sigmoid Volvulus',
        'Bird-beak sign on barium enema',
        'Initial treatment of Sigmoid Volvulus: Rigid sigmoidoscopy derotation',
      ],
    );
  }

  @override
  Future<List<Subject>> getContinueSubjects() async {
    final all = await getSubjects();
    return all.take(3).toList();
  }

  @override
  Future<List<NoteItem>> getHighYieldNotes() async {
    return const [
      NoteItem(
        id: 'note_anat_atlas',
        subjectId: 'anatomy',
        title: 'Clinical Gross & Neuroanatomy Master Atlas',
        filename: 'anatomy_master_atlas.pdf',
        fileSizeBytes: 955000000,
        telegramChatId: -1003709841202,
        telegramMessageId: 3994,
        pageCount: 420,
        faculty: 'Dr. Shrikant Verma',
        isMasterTextbook: true,
      ),
      NoteItem(
        id: 'note_path_review',
        subjectId: 'pathology',
        title: 'Robbins High-Yield Pathology Review Atlas',
        filename: 'pathology_review_atlas.pdf',
        fileSizeBytes: 480000000,
        telegramChatId: -1003709841202,
        telegramMessageId: 3998,
        pageCount: 380,
        faculty: 'Dr. Sparsh Gupta',
        isMasterTextbook: true,
      ),
      NoteItem(
        id: 'note_pharma_review',
        subjectId: 'pharmacology',
        title: 'Review of Pharmacology with Mnemonics',
        filename: 'pharma_review_mnemonics.pdf',
        fileSizeBytes: 410000000,
        telegramChatId: -1003709841202,
        telegramMessageId: 4001,
        pageCount: 340,
        faculty: 'Dr. Gobind Rai Garg',
        isMasterTextbook: true,
      ),
    ];
  }

  // 19 MBBS Subjects with accurate NMC prof categorization
  List<Subject> _getFallbackSubjects() {
    return const [
      // 1st Prof
      Subject(
        id: 'anatomy',
        name: 'Anatomy',
        code: 'ANAT',
        prof: MBBSProf.prof1,
        category: 'Pre-Clinical',
        icon: 'bone',
        color: '#3B82F6',
        displayOrder: 1,
        totalTopics: 142,
        totalNotes: 18,
        completedTopics: 48,
        progressPercentage: 34,
        leadFaculty: 'Dr. Shrikant Verma',
      ),
      Subject(
        id: 'physiology',
        name: 'Physiology',
        code: 'PHYS',
        prof: MBBSProf.prof1,
        category: 'Pre-Clinical',
        icon: 'activity',
        color: '#10B981',
        displayOrder: 2,
        totalTopics: 98,
        totalNotes: 12,
        completedTopics: 28,
        progressPercentage: 29,
        leadFaculty: 'Dr. Vivek Nalgirkar',
      ),
      Subject(
        id: 'biochemistry',
        name: 'Biochemistry',
        code: 'BIOC',
        prof: MBBSProf.prof1,
        category: 'Pre-Clinical',
        icon: 'dna',
        color: '#F59E0B',
        displayOrder: 3,
        totalTopics: 76,
        totalNotes: 10,
        completedTopics: 15,
        progressPercentage: 20,
        leadFaculty: 'Dr. Ankur Jain',
      ),

      // 2nd Prof
      Subject(
        id: 'pathology',
        name: 'Pathology',
        code: 'PATH',
        prof: MBBSProf.prof2,
        category: 'Para-Clinical',
        icon: 'microscope',
        color: '#EC4899',
        displayOrder: 4,
        totalTopics: 164,
        totalNotes: 22,
        completedTopics: 72,
        progressPercentage: 44,
        leadFaculty: 'Dr. Sparsh Gupta',
      ),
      Subject(
        id: 'pharmacology',
        name: 'Pharmacology',
        code: 'PHAR',
        prof: MBBSProf.prof2,
        category: 'Para-Clinical',
        icon: 'pill',
        color: '#8B5CF6',
        displayOrder: 5,
        totalTopics: 128,
        totalNotes: 16,
        completedTopics: 84,
        progressPercentage: 66,
        leadFaculty: 'Dr. Gobind Rai Garg',
      ),
      Subject(
        id: 'microbiology',
        name: 'Microbiology',
        code: 'MICR',
        prof: MBBSProf.prof2,
        category: 'Para-Clinical',
        icon: 'bug',
        color: '#06B6D4',
        displayOrder: 6,
        totalTopics: 112,
        totalNotes: 14,
        completedTopics: 32,
        progressPercentage: 28,
        leadFaculty: 'Dr. Priyanka Sachdev',
      ),
      Subject(
        id: 'forensic_medicine',
        name: 'Forensic Medicine (FMT)',
        code: 'FORN',
        prof: MBBSProf.prof2,
        category: 'Para-Clinical',
        icon: 'file-text',
        color: '#64748B',
        displayOrder: 7,
        totalTopics: 54,
        totalNotes: 8,
        completedTopics: 20,
        progressPercentage: 37,
        leadFaculty: 'Dr. Akhilesh Raj',
      ),

      // 3rd Prof Part 1
      Subject(
        id: 'community_medicine',
        name: 'Community Medicine (PSM)',
        code: 'COMM',
        prof: MBBSProf.prof3Part1,
        category: 'Minor Clinical',
        icon: 'users',
        color: '#14B8A6',
        displayOrder: 8,
        totalTopics: 96,
        totalNotes: 14,
        completedTopics: 18,
        progressPercentage: 19,
        leadFaculty: 'Dr. Rajiv Dhawan',
      ),
      Subject(
        id: 'ophthalmology',
        name: 'Ophthalmology',
        code: 'OPHT',
        prof: MBBSProf.prof3Part1,
        category: 'Minor Clinical',
        icon: 'eye',
        color: '#0EA5E9',
        displayOrder: 9,
        totalTopics: 68,
        totalNotes: 10,
        completedTopics: 30,
        progressPercentage: 44,
        leadFaculty: 'Dr. Shashwat Ray',
      ),
      Subject(
        id: 'ent',
        name: 'ENT (Otorhinolaryngology)',
        code: 'ENTO',
        prof: MBBSProf.prof3Part1,
        category: 'Minor Clinical',
        icon: 'headphones',
        color: '#F97316',
        displayOrder: 10,
        totalTopics: 72,
        totalNotes: 10,
        completedTopics: 26,
        progressPercentage: 36,
        leadFaculty: 'Dr. Manisha Sinha',
      ),

      // Final Prof Part 2
      Subject(
        id: 'general_medicine',
        name: 'General Medicine',
        code: 'MED',
        prof: MBBSProf.profFinalPart2,
        category: 'Major Clinical',
        icon: 'heart-pulse',
        color: '#EF4444',
        displayOrder: 11,
        totalTopics: 240,
        totalNotes: 32,
        completedTopics: 110,
        progressPercentage: 46,
        leadFaculty: 'Dr. Rajesh Gubba',
      ),
      Subject(
        id: 'general_surgery',
        name: 'General Surgery',
        code: 'SURG',
        prof: MBBSProf.profFinalPart2,
        category: 'Major Clinical',
        icon: 'scissors',
        color: '#00A389',
        displayOrder: 12,
        totalTopics: 192,
        totalNotes: 26,
        completedTopics: 96,
        progressPercentage: 50,
        leadFaculty: 'Dr. Rohan Khandelwal',
      ),
      Subject(
        id: 'obstetrics_gynecology',
        name: 'Obstetrics & Gynecology (OBG)',
        code: 'OBGY',
        prof: MBBSProf.profFinalPart2,
        category: 'Major Clinical',
        icon: 'user-plus',
        color: '#D946EF',
        displayOrder: 13,
        totalTopics: 158,
        totalNotes: 20,
        completedTopics: 64,
        progressPercentage: 41,
        leadFaculty: 'Dr. Prasan Vij',
      ),
      Subject(
        id: 'pediatrics',
        name: 'Pediatrics',
        code: 'PEDI',
        prof: MBBSProf.profFinalPart2,
        category: 'Major Clinical',
        icon: 'smile',
        color: '#EAB308',
        displayOrder: 14,
        totalTopics: 88,
        totalNotes: 12,
        completedTopics: 36,
        progressPercentage: 41,
        leadFaculty: 'Dr. Anand Bhatia',
      ),
      Subject(
        id: 'orthopedics',
        name: 'Orthopedics',
        code: 'ORTH',
        prof: MBBSProf.profFinalPart2,
        category: 'Major Clinical',
        icon: 'disc',
        color: '#6366F1',
        displayOrder: 15,
        totalTopics: 56,
        totalNotes: 8,
        completedTopics: 28,
        progressPercentage: 50,
        leadFaculty: 'Dr. Tushar Mehta',
      ),
      Subject(
        id: 'dermatology',
        name: 'Dermatology',
        code: 'DERM',
        prof: MBBSProf.profFinalPart2,
        category: 'Major Clinical',
        icon: 'sun',
        color: '#FB7185',
        displayOrder: 16,
        totalTopics: 46,
        totalNotes: 6,
        completedTopics: 24,
        progressPercentage: 52,
        leadFaculty: 'Dr. Manish Soni',
      ),
      Subject(
        id: 'psychiatry',
        name: 'Psychiatry',
        code: 'PSYC',
        prof: MBBSProf.profFinalPart2,
        category: 'Major Clinical',
        icon: 'brain',
        color: '#A855F7',
        displayOrder: 17,
        totalTopics: 38,
        totalNotes: 6,
        completedTopics: 18,
        progressPercentage: 47,
        leadFaculty: 'Dr. Mohan Sunil Kumar',
      ),
      Subject(
        id: 'radiology',
        name: 'Radiology',
        code: 'RADI',
        prof: MBBSProf.profFinalPart2,
        category: 'Major Clinical',
        icon: 'camera',
        color: '#38BDF8',
        displayOrder: 18,
        totalTopics: 48,
        totalNotes: 8,
        completedTopics: 22,
        progressPercentage: 46,
        leadFaculty: 'Dr. Zainab Vora',
      ),
      Subject(
        id: 'anesthesiology',
        name: 'Anesthesiology',
        code: 'ANES',
        prof: MBBSProf.profFinalPart2,
        category: 'Major Clinical',
        icon: 'wind',
        color: '#2DD4BF',
        displayOrder: 19,
        totalTopics: 36,
        totalNotes: 6,
        completedTopics: 16,
        progressPercentage: 44,
        leadFaculty: 'Dr. Swati Singh',
      ),
    ];
  }

  List<Module> _getFallbackModules(String subjectId) {
    return [
      Module(
        id: '${subjectId}_mod_1',
        subjectId: subjectId,
        title: 'Module 1: High-Yield Clinical Core Principles',
        displayOrder: 1,
        topics: [
          Topic(
            id: '${subjectId}_t1',
            subjectId: subjectId,
            moduleId: '${subjectId}_mod_1',
            title: 'Pathophysiology & Clinical Presentation',
            filename: '${subjectId}_lecture_01.mp4',
            fileSizeBytes: 220000000,
            durationSeconds: 1920,
            durationFormatted: '32 mins',
            telegramChatId: -1003264222864,
            telegramMessageId: 341,
            watchedSeconds: 1920,
            isCompleted: true,
          ),
          Topic(
            id: '${subjectId}_t2',
            subjectId: subjectId,
            moduleId: '${subjectId}_mod_1',
            title: 'Diagnostic Imaging & Staging Criteria',
            filename: '${subjectId}_lecture_02.mp4',
            fileSizeBytes: 280000000,
            durationSeconds: 2400,
            durationFormatted: '40 mins',
            telegramChatId: -1003264222864,
            telegramMessageId: 342,
            watchedSeconds: 1200,
            isCompleted: false,
          ),
        ],
      ),
      Module(
        id: '${subjectId}_mod_2',
        subjectId: subjectId,
        title: 'Module 2: Advanced Surgical & Pharmacological Management',
        displayOrder: 2,
        topics: [
          Topic(
            id: '${subjectId}_t3',
            subjectId: subjectId,
            moduleId: '${subjectId}_mod_2',
            title: 'Surgical Operative Steps & Complications',
            filename: '${subjectId}_lecture_03.mp4',
            fileSizeBytes: 310000000,
            durationSeconds: 2700,
            durationFormatted: '45 mins',
            telegramChatId: -1003264222864,
            telegramMessageId: 343,
            watchedSeconds: 0,
            isCompleted: false,
          ),
        ],
      ),
    ];
  }

  List<NoteItem> _getFallbackNotes(String subjectId) {
    return [
      NoteItem(
        id: '${subjectId}_note_1',
        subjectId: subjectId,
        title: 'Comprehensive Subject Review Book',
        filename: '${subjectId}_review_book.pdf',
        fileSizeBytes: 180000000,
        telegramChatId: -1003709841202,
        telegramMessageId: 4005,
        pageCount: 220,
        isMasterTextbook: true,
      ),
      NoteItem(
        id: '${subjectId}_note_2',
        subjectId: subjectId,
        title: 'Clinical Slides & High-Yield Diagrams',
        filename: '${subjectId}_lecture_slides.pdf',
        fileSizeBytes: 45000000,
        telegramChatId: -1003709841202,
        telegramMessageId: 4006,
        pageCount: 85,
        isMasterTextbook: false,
      ),
    ];
  }
}
