enum MBBSProf {
  prof1('1st Prof', 'Pre-Clinical'),
  prof2('2nd Prof', 'Para-Clinical'),
  prof3Part1('3rd Prof Part 1', 'Minor Clinical'),
  profFinalPart2('Final Prof Part 2', 'Major Clinical');

  static const MBBSProf prof3Part2 = MBBSProf.profFinalPart2;

  final String label;
  final String category;
  const MBBSProf(this.label, this.category);

  static MBBSProf fromString(String val) {
    switch (val) {
      case '1st Prof':
        return MBBSProf.prof1;
      case '2nd Prof':
        return MBBSProf.prof2;
      case '3rd Prof Part 1':
        return MBBSProf.prof3Part1;
      case 'Final Prof Part 2':
      default:
        return MBBSProf.profFinalPart2;
    }
  }
}

enum PlatformId {
  prepxEn('prepx_en', 'PrepLadder (EN)', '🇬🇧'),
  prepxHi('prepx_hi', 'PrepLadder (HI)', '🇮🇳'),
  marrow('marrow', 'Marrow E6', '🩺'),
  cerebellum('cerebellum', 'Cerebellum', '🎓');

  static const PlatformId marrowE6 = PlatformId.marrow;

  final String code;
  final String label;
  final String icon;
  const PlatformId(this.code, this.label, this.icon);

  static PlatformId fromCode(String code) {
    switch (code) {
      case 'prepx_hi':
        return PlatformId.prepxHi;
      case 'marrow':
        return PlatformId.marrow;
      case 'cerebellum':
        return PlatformId.cerebellum;
      case 'prepx_en':
      default:
        return PlatformId.prepxEn;
    }
  }
}

class Subject {
  final String id;
  final String name;
  final String code;
  final MBBSProf prof;
  final String category;
  final String icon;
  final String color;
  final int displayOrder;
  final int totalTopics;
  final int totalNotes;
  final int completedTopics;
  final int progressPercentage;
  final List<PlatformId> availablePlatforms;
  final String? leadFaculty;

  const Subject({
    required this.id,
    required this.name,
    required this.code,
    required this.prof,
    required this.category,
    required this.icon,
    required this.color,
    required this.displayOrder,
    this.totalTopics = 0,
    this.totalNotes = 0,
    this.completedTopics = 0,
    this.progressPercentage = 0,
    this.availablePlatforms = const [
      PlatformId.prepxEn,
      PlatformId.prepxHi,
      PlatformId.marrow,
      PlatformId.cerebellum,
    ],
    this.leadFaculty,
  });

  double get progressRatio =>
      totalTopics > 0 ? (completedTopics / totalTopics).clamp(0.0, 1.0) : 0.0;
}
