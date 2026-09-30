import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Subject } from '../types/lms';
import { CLAY_COLORS, CLAY_ROUNDED } from '../theme/clay';
import { useAppTheme } from '../context/ThemeContext';
import { BookOpen, FileText, ChevronRight, Sparkles } from 'lucide-react-native';

interface ClaySubjectCardProps {
  subject: Subject;
  index: number;
  onPress: () => void;
}

// Saturated Clay single-color accents directly from DESIGN.md
const CLAY_ACCENT_PALETTE = [
  { bg: 'rgba(255, 77, 139, 0.12)', border: 'rgba(255, 77, 139, 0.28)', text: CLAY_COLORS.brandPink },
  { bg: 'rgba(0, 163, 137, 0.12)', border: 'rgba(0, 163, 137, 0.28)', text: CLAY_COLORS.marrowTeal },
  { bg: 'rgba(184, 164, 237, 0.12)', border: 'rgba(184, 164, 237, 0.28)', text: CLAY_COLORS.brandLavender },
  { bg: 'rgba(255, 176, 132, 0.12)', border: 'rgba(255, 176, 132, 0.28)', text: CLAY_COLORS.brandPeach },
  { bg: 'rgba(232, 185, 74, 0.12)', border: 'rgba(232, 185, 74, 0.28)', text: CLAY_COLORS.brandOchre },
  { bg: 'rgba(164, 212, 197, 0.12)', border: 'rgba(164, 212, 197, 0.28)', text: CLAY_COLORS.brandMint },
  { bg: 'rgba(255, 107, 90, 0.12)', border: 'rgba(255, 107, 90, 0.28)', text: CLAY_COLORS.brandCoral },
];

export const ClaySubjectCard: React.FC<ClaySubjectCardProps> = ({
  subject,
  index,
  onPress,
}) => {
  const { theme } = useAppTheme();
  const accent = CLAY_ACCENT_PALETTE[index % CLAY_ACCENT_PALETTE.length];
  const progress = subject.progress_percentage || 0;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: CLAY_COLORS.surfaceDarkCard,
          borderColor: CLAY_COLORS.surfaceDarkBorder,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Top Header Row with Code Pill & Prof Badge */}
      <View style={styles.topRow}>
        <View style={[styles.codePill, { backgroundColor: accent.bg, borderColor: accent.border }]}>
          <Text style={[styles.codeText, { color: accent.text }]}>
            {subject.code}
          </Text>
        </View>

        <View style={styles.profBadge}>
          <Text style={styles.profText}>{subject.prof}</Text>
        </View>
      </View>

      {/* Subject Title */}
      <Text style={styles.title} numberOfLines={1}>
        {subject.name}
      </Text>

      {/* Meta Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <BookOpen size={12} color={CLAY_COLORS.mutedSoft} />
          <Text style={styles.statText}>{subject.total_topics} lectures</Text>
        </View>
        <View style={styles.statChip}>
          <FileText size={12} color={CLAY_COLORS.mutedSoft} />
          <Text style={styles.statText}>{subject.total_notes} notes</Text>
        </View>
      </View>

      {/* Clay Tactile Progress Track */}
      <View style={styles.progressSection}>
        <View style={styles.progressMeta}>
          <Text style={styles.progressLabel}>Mastery</Text>
          <Text style={[styles.progressValue, { color: accent.text }]}>{progress}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.max(6, progress)}%`,
                backgroundColor: accent.text,
              },
            ]}
          />
        </View>
      </View>

      {/* Footer Row with Category and Arrow */}
      <View style={styles.footerRow}>
        <View style={styles.categoryPill}>
          <Sparkles size={11} color={CLAY_COLORS.mutedSoft} style={{ marginRight: 4 }} />
          <Text style={styles.categoryText}>{subject.category}</Text>
        </View>

        <View style={[styles.chevronCircle, { backgroundColor: accent.bg }]}>
          <ChevronRight size={14} color={accent.text} strokeWidth={2.5} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: CLAY_ROUNDED.xl, // 24px from DESIGN.md
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    // Subtle tactile clay shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_ROUNDED.pill,
    borderWidth: 1,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: CLAY_ROUNDED.pill,
  },
  profText: {
    fontSize: 11,
    color: CLAY_COLORS.mutedSoft,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_ROUNDED.sm,
  },
  statText: {
    fontSize: 12,
    color: CLAY_COLORS.mutedSoft,
    fontWeight: '500',
  },
  progressSection: {
    marginBottom: 14,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: CLAY_COLORS.mutedSoft,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: CLAY_COLORS.mutedSoft,
    letterSpacing: 0.3,
  },
  chevronCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
