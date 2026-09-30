import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Subject } from '../types/lms';
import { useAppTheme } from '../context/ThemeContext';
import { COMMON_COLORS } from '../theme/colors';
import { BookOpen, FileText, ChevronRight } from 'lucide-react-native';

interface SubjectCardProps {
  subject: Subject;
  onPress: () => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onPress }) => {
  const { theme } = useAppTheme();
  const progress = subject.progress_percentage || 0;

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: COMMON_COLORS.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <View style={[styles.codeBadge, { backgroundColor: `${subject.color || theme.primary}20` }]}>
          <Text style={[styles.codeText, { color: subject.color || theme.primary }]}>
            {subject.code}
          </Text>
        </View>
        <View style={styles.profBadge}>
          <Text style={styles.profText}>{subject.prof}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {subject.name}
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <BookOpen size={13} color={COMMON_COLORS.textMuted} />
          <Text style={styles.statText}>{subject.total_topics} topics</Text>
        </View>
        <View style={styles.statItem}>
          <FileText size={13} color={COMMON_COLORS.textMuted} />
          <Text style={styles.statText}>{subject.total_notes} notes</Text>
        </View>
      </View>

      {/* Progress Track */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Completion</Text>
          <Text style={[styles.progressVal, { color: theme.accent }]}>{progress}%</Text>
        </View>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progress}%`, backgroundColor: theme.primary },
            ]}
          />
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.categoryText}>{subject.category}</Text>
        <ChevronRight size={14} color={theme.accent} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COMMON_COLORS.cardDark,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  profText: {
    fontSize: 11,
    color: COMMON_COLORS.textMuted,
    fontWeight: '500',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COMMON_COLORS.textPrimary,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 12,
    color: COMMON_COLORS.textSecondary,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  progressLabel: {
    fontSize: 11,
    color: COMMON_COLORS.textMuted,
    fontWeight: '500',
  },
  progressVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  categoryText: {
    fontSize: 11,
    color: COMMON_COLORS.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
