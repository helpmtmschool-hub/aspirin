import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CLAY_COLORS, CLAY_ROUNDED } from '../theme/clay';
import { Bookmark, Award, Clock, Play } from 'lucide-react-native';

export const BookmarksFeed: React.FC<{ onNavigateToPlayer?: () => void }> = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Bookmark size={18} color={CLAY_COLORS.brandPeach} />
          <Text style={styles.sectionTitle}>Saved & Watch Later</Text>
        </View>
        <Text style={styles.subtitle}>Your pinned lectures, clinical bookmarks, and recall flashcards</Text>
      </View>

      {/* Streak / Stats Card from DESIGN.md */}
      <View style={[styles.statsCard, { borderColor: CLAY_COLORS.surfaceDarkBorder }]}>
        <View style={styles.statsLeft}>
          <View style={styles.streakBadge}>
            <Award size={14} color={CLAY_COLORS.brandOchre} />
            <Text style={styles.streakText}>STUDY STREAK</Text>
          </View>
          <Text style={styles.streakCount}>14 Days Active</Text>
          <Text style={styles.streakSub}>82 hours of clinical lectures completed</Text>
        </View>

        <View style={styles.percentageCircle}>
          <Text style={styles.percentageText}>68%</Text>
          <Text style={styles.percentageLabel}>Target</Text>
        </View>
      </View>

      {/* Saved Lecture Card */}
      <View
        style={[
          styles.savedCard,
          {
            backgroundColor: CLAY_COLORS.surfaceDarkCard,
            borderColor: CLAY_COLORS.surfaceDarkBorder,
          },
        ]}
      >
        <View style={styles.savedTop}>
          <View style={[styles.tag, { backgroundColor: 'rgba(255, 77, 139, 0.15)' }]}>
            <Text style={[styles.tagText, { color: CLAY_COLORS.brandPink }]}>Anatomy</Text>
          </View>
          <View style={styles.timeTag}>
            <Clock size={11} color={CLAY_COLORS.mutedSoft} />
            <Text style={styles.timeText}>Resume at 14m 20s</Text>
          </View>
        </View>

        <Text style={styles.savedTitle}>
          01. Brainstem Internal Architecture & Cranial Nerves
        </Text>

        <View style={styles.resumeRow}>
          <TouchableOpacity style={styles.resumeBtn} activeOpacity={0.7}>
            <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.resumeBtnText}>Resume Playback</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 100,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: CLAY_COLORS.mutedSoft,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.surfaceDarkElevated,
    borderRadius: CLAY_ROUNDED.xl,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  statsLeft: {
    flex: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  streakText: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.brandOchre,
    letterSpacing: 0.5,
  },
  streakCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  streakSub: {
    fontSize: 12,
    color: CLAY_COLORS.mutedSoft,
  },
  percentageCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(232, 185, 74, 0.12)',
    borderWidth: 2,
    borderColor: CLAY_COLORS.brandOchre,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '800',
    color: CLAY_COLORS.brandOchre,
  },
  percentageLabel: {
    fontSize: 9,
    color: CLAY_COLORS.mutedSoft,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  savedCard: {
    borderRadius: CLAY_ROUNDED.xl,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  savedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_ROUNDED.pill,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: CLAY_COLORS.mutedSoft,
  },
  savedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 14,
  },
  resumeRow: {
    flexDirection: 'row',
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CLAY_COLORS.marrowTeal,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: CLAY_ROUNDED.pill,
  },
  resumeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
