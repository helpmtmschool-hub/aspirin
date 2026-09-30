import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {
  ArrowLeft,
  Play,
  Clock,
  HardDrive,
  Sparkles,
  BookOpen,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { Subject, Module, Topic, PlatformId } from '../../types/lms';
import { CLAY_COLORS, CLAY_ROUNDED } from '../../theme/clay';
import { getSubjectClayTheme } from '../../services/api';

interface MobilePlatformClassroomProps {
  subject: Subject;
  onBack: () => void;
  onPlayTopic: (topic: Topic, playlist?: Topic[]) => void;
}

const PLATFORMS: { id: PlatformId; label: string }[] = [
  { id: 'prepx_en', label: 'PrepLadder EN' },
  { id: 'prepx_hi', label: 'PrepLadder HI' },
  { id: 'cerebellum', label: 'Cerebellum' },
  { id: 'marrow', label: 'Marrow E6' },
];

export const MobilePlatformClassroom: React.FC<MobilePlatformClassroomProps> = ({
  subject,
  onBack,
  onPlayTopic,
}) => {
  const [currentPlatform, setCurrentPlatform] = useState<PlatformId>('prepx_en');
  const [activeTab, setActiveTab] = useState<'lectures' | 'notes'>('lectures');
  const [searchFilter, setSearchFilter] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  const clayTheme = getSubjectClayTheme(subject.id);

  // Default modules from subject or rich fallback
  const modules: Module[] = useMemo(() => {
    return (subject.modules && subject.modules.length > 0)
      ? subject.modules
      : [
          {
            id: `mod_${subject.id}_core`,
            name: `${subject.name} - Core Clinical Masterclass`,
            topics: [
              {
                id: `${subject.id}_top_1`,
                subject_id: subject.id,
                module: `${subject.name} - Core Clinical Masterclass`,
                title: `01. High-Yield ${subject.name} Fundamentals & Exam Recall`,
                filename: `01_${subject.id}_fundamentals.mp4`,
                file_size_bytes: 145000000,
                file_size_mb: 138.2,
                duration_seconds: 2450,
                duration_formatted: '40m 50s',
                stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                pearls: [
                  'Pathognomonic hallmark diagnostic sign frequently tested in NEET-PG',
                  'Management algorithm and first-line drug of choice in clinical scenarios',
                  'Differential diagnosis triad to remember during viva examination'
                ]
              },
              {
                id: `${subject.id}_top_2`,
                subject_id: subject.id,
                module: `${subject.name} - Core Clinical Masterclass`,
                title: `02. Image-Based Clinical Case Vignettes & Radiology Correlation`,
                filename: `02_${subject.id}_cases.mp4`,
                file_size_bytes: 128000000,
                file_size_mb: 122.0,
                duration_seconds: 1980,
                duration_formatted: '33m 00s',
                stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                pearls: [
                  'Characteristic histopathology / radiological finding',
                  'Classic exam trap question from previous year INI-CET recalls'
                ]
              }
            ]
          }
        ];
  }, [subject]);

  const toggleModuleCollapse = (moduleId: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const filteredModules = useMemo(() => {
    if (!searchFilter.trim()) return modules;
    return modules
      .map((mod) => ({
        ...mod,
        topics: mod.topics.filter(
          (t) =>
            t.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
            (t.module && t.module.toLowerCase().includes(searchFilter.toLowerCase()))
        ),
      }))
      .filter((mod) => mod.topics.length > 0);
  }, [modules, searchFilter]);

  const allTopicsInView = useMemo(() => {
    return filteredModules.flatMap((m) => m.topics);
  }, [filteredModules]);

  return (
    <View style={styles.container}>
      {/* Top Bar with Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {subject.name}
        </Text>
        <View style={[styles.codeBadge, { backgroundColor: clayTheme.badge }]}>
          <Text style={[styles.codeText, { color: clayTheme.text }]}>
            {subject.code}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Subject Hero Header Banner */}
        <View style={[styles.heroCard, { backgroundColor: clayTheme.bg }]}>
          <View style={styles.heroTop}>
            <View style={[styles.profPill, { backgroundColor: clayTheme.badge }]}>
              <Text style={[styles.profPillText, { color: clayTheme.text }]}>
                {subject.prof} • {subject.category}
              </Text>
            </View>
          </View>

          <Text style={[styles.heroTitle, { color: clayTheme.text }]}>
            {subject.name}
          </Text>

          <View style={styles.heroStats}>
            <View style={styles.statItem}>
              <BookOpen size={13} color={clayTheme.text} />
              <Text style={[styles.statText, { color: clayTheme.text }]}>
                {subject.total_topics} Video Lectures
              </Text>
            </View>
            <View style={styles.statItem}>
              <FileText size={13} color={clayTheme.text} />
              <Text style={[styles.statText, { color: clayTheme.text }]}>
                {subject.total_notes} Review Notes
              </Text>
            </View>
          </View>
        </View>

        {/* Platform Selector Tabs */}
        <View style={styles.platformRow}>
          {PLATFORMS.map((platform) => {
            const isSelected = currentPlatform === platform.id;
            return (
              <TouchableOpacity
                key={platform.id}
                style={[
                  styles.platformPill,
                  isSelected
                    ? styles.platformPillActive
                    : styles.platformPillInactive,
                ]}
                onPress={() => setCurrentPlatform(platform.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.platformPillText,
                    isSelected ? styles.platformPillTextActive : styles.platformPillTextInactive,
                  ]}
                >
                  {platform.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sub-Tabs: Lectures vs Notes */}
        <View style={styles.subTabsRow}>
          <TouchableOpacity
            style={[
              styles.subTab,
              activeTab === 'lectures' && styles.subTabActive,
            ]}
            onPress={() => setActiveTab('lectures')}
          >
            <Play size={14} color={activeTab === 'lectures' ? '#FFFFFF' : CLAY_COLORS.mutedSoft} />
            <Text
              style={[
                styles.subTabText,
                activeTab === 'lectures' && styles.subTabTextActive,
              ]}
            >
              Video Lectures ({subject.total_topics})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subTab,
              activeTab === 'notes' && styles.subTabActive,
            ]}
            onPress={() => setActiveTab('notes')}
          >
            <FileText size={14} color={activeTab === 'notes' ? '#FFFFFF' : CLAY_COLORS.mutedSoft} />
            <Text
              style={[
                styles.subTabText,
                activeTab === 'notes' && styles.subTabTextActive,
              ]}
            >
              Clinical Notes ({subject.total_notes})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Lecture Filter */}
        {activeTab === 'lectures' && (
          <View style={styles.searchBar}>
            <Search size={15} color={CLAY_COLORS.mutedSoft} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Filter ${subject.name} lectures...`}
              placeholderTextColor={CLAY_COLORS.mutedSoft}
              value={searchFilter}
              onChangeText={setSearchFilter}
            />
          </View>
        )}

        {/* Modules & Topics Accordion List */}
        {activeTab === 'lectures' && (
          <View style={styles.modulesContainer}>
            {filteredModules.map((module) => {
              const isCollapsed = collapsedModules[module.id];

              return (
                <View
                  key={module.id}
                  style={[
                    styles.moduleCard,
                    {
                      backgroundColor: CLAY_COLORS.surfaceDarkCard,
                      borderColor: CLAY_COLORS.surfaceDarkBorder,
                    },
                  ]}
                >
                  {/* Module Header Accordion Trigger */}
                  <TouchableOpacity
                    style={styles.moduleHeader}
                    onPress={() => toggleModuleCollapse(module.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.moduleHeaderLeft}>
                      <View style={styles.moduleDot} />
                      <Text style={styles.moduleName}>{module.name}</Text>
                    </View>

                    <View style={styles.moduleHeaderRight}>
                      <Text style={styles.moduleLectureCount}>
                        {module.topics.length} lectures
                      </Text>
                      {isCollapsed ? (
                        <ChevronDown size={16} color={CLAY_COLORS.mutedSoft} />
                      ) : (
                        <ChevronUp size={16} color={CLAY_COLORS.mutedSoft} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Module Topics List */}
                  {!isCollapsed && (
                    <View style={styles.topicsList}>
                      {module.topics.map((topic, index) => (
                        <TouchableOpacity
                          key={topic.id}
                          style={styles.topicItem}
                          onPress={() => onPlayTopic(topic, allTopicsInView)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.playIconBox}>
                            <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                          </View>

                          <View style={styles.topicInfo}>
                            <Text style={styles.topicTitle} numberOfLines={2}>
                              {topic.title}
                            </Text>

                            <View style={styles.topicMeta}>
                              <View style={styles.metaRow}>
                                <Clock size={11} color={CLAY_COLORS.mutedSoft} />
                                <Text style={styles.metaText}>{topic.duration_formatted}</Text>
                              </View>
                              <View style={styles.metaRow}>
                                <HardDrive size={11} color={CLAY_COLORS.mutedSoft} />
                                <Text style={styles.metaText}>{topic.file_size_mb} MB</Text>
                              </View>
                              {topic.pearls && topic.pearls.length > 0 && (
                                <View style={styles.pearlsBadge}>
                                  <Sparkles size={10} color={CLAY_COLORS.brandOchre} />
                                  <Text style={styles.pearlsBadgeText}>
                                    {topic.pearls.length} Pearls
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Clinical Notes Tab */}
        {activeTab === 'notes' && (
          <View style={styles.notesContainer}>
            {(subject.notes && subject.notes.length > 0 ? subject.notes : [
              {
                id: 'note_sub_1',
                title: `${subject.name} High-Yield Exam Review & Case Pearls`,
                subject_id: subject.id,
                file_size_mb: 28.5,
                pages_count: 54,
              }
            ]).map((note) => (
              <View
                key={note.id}
                style={[
                  styles.noteItemCard,
                  {
                    backgroundColor: CLAY_COLORS.surfaceDarkCard,
                    borderColor: CLAY_COLORS.surfaceDarkBorder,
                  },
                ]}
              >
                <View style={styles.noteTop}>
                  <Text style={styles.noteTitle}>{note.title}</Text>
                  <Text style={styles.notePages}>{note.pages_count || 48} pages</Text>
                </View>

                <TouchableOpacity style={styles.readNoteBtn} activeOpacity={0.7}>
                  <BookOpen size={14} color="#0A0A0A" />
                  <Text style={styles.readNoteBtnText}>Open Slides</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CLAY_COLORS.surfaceDark,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    padding: 8,
    marginRight: 6,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_ROUNDED.pill,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  heroCard: {
    borderRadius: CLAY_ROUNDED.xl, // 24px
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTop: {
    marginBottom: 8,
  },
  profPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_ROUNDED.pill,
    alignSelf: 'flex-start',
  },
  profPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  platformRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  platformPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: CLAY_ROUNDED.pill,
    alignItems: 'center',
    borderWidth: 1,
  },
  platformPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  platformPillInactive: {
    backgroundColor: CLAY_COLORS.surfaceDarkCard,
    borderColor: CLAY_COLORS.surfaceDarkBorder,
  },
  platformPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  platformPillTextActive: {
    color: '#0A0A0A',
  },
  platformPillTextInactive: {
    color: CLAY_COLORS.mutedSoft,
  },
  subTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 10,
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_ROUNDED.pill,
  },
  subTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: CLAY_COLORS.mutedSoft,
  },
  subTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.surfaceDarkCard,
    borderRadius: CLAY_ROUNDED.pill,
    borderWidth: 1,
    borderColor: CLAY_COLORS.surfaceDarkBorder,
    paddingHorizontal: 16,
    height: 44,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  modulesContainer: {
    gap: 14,
  },
  moduleCard: {
    borderRadius: CLAY_ROUNDED.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  moduleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  moduleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CLAY_COLORS.brandPink,
  },
  moduleName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  moduleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleLectureCount: {
    fontSize: 11,
    color: CLAY_COLORS.mutedSoft,
  },
  topicsList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: CLAY_ROUNDED.md,
    padding: 12,
    gap: 12,
  },
  playIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 4,
  },
  topicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: CLAY_COLORS.mutedSoft,
  },
  pearlsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(232, 185, 74, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: CLAY_ROUNDED.xs,
  },
  pearlsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: CLAY_COLORS.brandOchre,
  },
  notesContainer: {
    gap: 12,
  },
  noteItemCard: {
    borderRadius: CLAY_ROUNDED.lg,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  noteTop: {
    gap: 4,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notePages: {
    fontSize: 12,
    color: CLAY_COLORS.mutedSoft,
  },
  readNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_ROUNDED.pill,
  },
  readNoteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A0A0A',
  },
});
