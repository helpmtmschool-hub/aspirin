import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Subject, Module, Topic } from '../types/lms';
import { useAppTheme } from '../context/ThemeContext';
import { COMMON_COLORS } from '../theme/colors';
import {
  ArrowLeft,
  Play,
  Clock,
  HardDrive,
  Sparkles,
  BookOpen,
  CheckCircle,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type SubjectDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'SubjectDetail'>;

export const SubjectDetailScreen: React.FC<SubjectDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { subject } = route.params;
  const { theme } = useAppTheme();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('prepladder');

  // Use modules from subject or default mock module for preview
  const modules: Module[] =
    subject.modules && subject.modules.length > 0
      ? subject.modules
      : [
          {
            id: `mod_${subject.id}_foundations`,
            name: `${subject.name} - Core High-Yield Masterclass`,
            topics: [
              {
                id: `${subject.id}_top_1`,
                subject_id: subject.id,
                title: `01. High-Yield ${subject.name} Fundamentals & Clinical Exam Points`,
                filename: `01_${subject.id}_fundamentals.mp4`,
                file_size_bytes: 145000000,
                file_size_mb: 138.2,
                duration_seconds: 2450,
                duration_formatted: '40m 50s',
                stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                pearls: [
                  `Key diagnostic criteria and exam gold standard in ${subject.name}`,
                  'NEET-PG high-probability recurring concept from previous years',
                  'Clinical management algorithm and first-line drug of choice'
                ]
              },
              {
                id: `${subject.id}_top_2`,
                subject_id: subject.id,
                title: `02. Clinical Case Vignettes & Image-Based MCQs`,
                filename: `02_${subject.id}_clinical_cases.mp4`,
                file_size_bytes: 128000000,
                file_size_mb: 122.0,
                duration_seconds: 1980,
                duration_formatted: '33m 00s',
                stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                pearls: [
                  'Characteristic histopathology / imaging sign (Pathognomonic finding)',
                  'Differential diagnosis triad to remember during clinical viva'
                ]
              }
            ]
          }
        ];

  const handleTopicPress = (topic: Topic) => {
    navigation.navigate('Player', {
      topic,
      subject,
      playlist: modules.flatMap((m) => m.topics),
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={COMMON_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {subject.name}
        </Text>
        <View style={[styles.codeBadge, { backgroundColor: `${subject.color || theme.primary}20` }]}>
          <Text style={[styles.codeText, { color: subject.color || theme.primary }]}>
            {subject.code}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Subject Header Banner */}
        <View style={[styles.heroCard, { borderColor: COMMON_COLORS.cardBorder }]}>
          <Text style={styles.profPhaseText}>{subject.prof} • {subject.category}</Text>
          <Text style={styles.heroTitle}>{subject.name}</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <BookOpen size={14} color={theme.accent} />
              <Text style={styles.heroStatText}>{subject.total_topics} Video Lectures</Text>
            </View>
            <View style={styles.heroStatItem}>
              <Sparkles size={14} color={COMMON_COLORS.gold} />
              <Text style={styles.heroStatText}>{subject.total_notes} Clinical Notes</Text>
            </View>
          </View>
        </View>

        {/* Platform Selector Tabs */}
        <View style={styles.platformSelectorRow}>
          {['PrepLadder X', 'Marrow E6', 'Cerebellum'].map((platform) => {
            const isSelected = selectedPlatform.toLowerCase() === platform.toLowerCase().split(' ')[0];
            return (
              <TouchableOpacity
                key={platform}
                style={[
                  styles.platformTab,
                  isSelected
                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                    : { backgroundColor: COMMON_COLORS.cardDark, borderColor: COMMON_COLORS.cardBorder }
                ]}
                onPress={() => setSelectedPlatform(platform.toLowerCase().split(' ')[0])}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.platformTabText,
                    isSelected ? { color: '#FFFFFF' } : { color: COMMON_COLORS.textSecondary }
                  ]}
                >
                  {platform}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Modules & Lectures List */}
        <Text style={styles.sectionHeader}>Course Modules</Text>
        {modules.map((module) => (
          <View key={module.id} style={styles.moduleSection}>
            <View style={styles.moduleHeaderRow}>
              <View style={[styles.moduleDot, { backgroundColor: theme.primary }]} />
              <Text style={styles.moduleName}>{module.name}</Text>
              <Text style={styles.moduleCount}>{module.topics.length} lectures</Text>
            </View>

            {module.topics.map((topic, index) => (
              <TouchableOpacity
                key={topic.id}
                style={[styles.topicCard, { borderColor: COMMON_COLORS.cardBorder }]}
                onPress={() => handleTopicPress(topic)}
                activeOpacity={0.7}
              >
                <View style={[styles.playButtonCircle, { backgroundColor: theme.badgeBg }]}>
                  <Play size={16} color={theme.accent} fill={theme.accent} />
                </View>

                <View style={styles.topicInfo}>
                  <Text style={styles.topicTitle} numberOfLines={2}>
                    {topic.title}
                  </Text>

                  <View style={styles.topicMetaRow}>
                    <View style={styles.metaItem}>
                      <Clock size={12} color={COMMON_COLORS.textMuted} />
                      <Text style={styles.metaText}>{topic.duration_formatted}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <HardDrive size={12} color={COMMON_COLORS.textMuted} />
                      <Text style={styles.metaText}>{topic.file_size_mb} MB</Text>
                    </View>
                    {topic.pearls && topic.pearls.length > 0 && (
                      <View style={[styles.pearlsBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                        <Sparkles size={10} color={COMMON_COLORS.gold} />
                        <Text style={styles.pearlsBadgeText}>{topic.pearls.length} Pearls</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COMMON_COLORS.bgDark,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: COMMON_COLORS.bgDark,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COMMON_COLORS.textPrimary,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: COMMON_COLORS.cardDark,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  profPhaseText: {
    fontSize: 11,
    fontWeight: '700',
    color: COMMON_COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COMMON_COLORS.textPrimary,
    marginBottom: 12,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  heroStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatText: {
    fontSize: 12,
    color: COMMON_COLORS.textSecondary,
    fontWeight: '500',
  },
  platformSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  platformTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  platformTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: COMMON_COLORS.textPrimary,
    marginBottom: 12,
  },
  moduleSection: {
    marginBottom: 20,
  },
  moduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  moduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moduleName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COMMON_COLORS.textPrimary,
  },
  moduleCount: {
    fontSize: 11,
    color: COMMON_COLORS.textMuted,
    fontWeight: '500',
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COMMON_COLORS.cardDark,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  playButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COMMON_COLORS.textPrimary,
    marginBottom: 6,
    lineHeight: 18,
  },
  topicMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: COMMON_COLORS.textMuted,
  },
  pearlsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pearlsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COMMON_COLORS.gold,
  },
});
