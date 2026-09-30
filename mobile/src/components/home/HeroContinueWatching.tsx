import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Play, BookOpen, Sparkles, Award } from 'lucide-react-native';
import { Topic } from '../../types/lms';
import { CLAY_COLORS, CLAY_ROUNDED } from '../../theme/clay';

interface HeroContinueWatchingProps {
  inProgressTopic?: Topic | null;
  onPlay: (topic: Topic) => void;
  onExplore: () => void;
}

export const HeroContinueWatching: React.FC<HeroContinueWatchingProps> = ({
  inProgressTopic,
  onPlay,
  onExplore,
}) => {
  return (
    <View style={styles.container}>
      {/* Signature Clay 7-5 Band Container */}
      <View style={styles.cardContainer}>
        {/* Editorial Content */}
        <View style={styles.editorialSection}>
          <View style={styles.badgePill}>
            <View style={styles.pinkDot} />
            <Text style={styles.badgePillText}>Complete Medical Curriculum</Text>
          </View>

          <Text style={styles.displayHeading}>
            Master 19 MBBS Subjects with High-Yield Faculty.
          </Text>

          <Text style={styles.description}>
            PrepLadder Edition X, Cerebellum Academy, and Marrow Edition 6 clinical lectures and review textbooks, structured for NEET-PG, INI-CET, and university professional phases.
          </Text>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={inProgressTopic ? () => onPlay(inProgressTopic) : onExplore}
            activeOpacity={0.8}
          >
            <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.primaryBtnText}>
              {inProgressTopic ? 'Resume Last Lecture' : 'Explore 19 Subjects'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Saturated Clay Teal Feature Card (from web app) */}
        <View style={styles.featureCard}>
          <View style={styles.featureStamp}>
            <BookOpen size={12} color={CLAY_COLORS.brandPeach} />
            <Text style={styles.featureStampText}>Featured Curriculum</Text>
          </View>

          <Text style={styles.featureTitle}>Clinical Grand Rounds</Text>
          <Text style={styles.featureSubtitle}>
            Dr. Deepak Marwah • Dr. Rohan Khandelwal • Dr. Gobind Rai Garg
          </Text>

          <View style={styles.featureFooter}>
            <View style={styles.topicsTag}>
              <Award size={12} color={CLAY_COLORS.brandOchre} />
              <Text style={styles.topicsTagText}>370+ High-Yield Lectures</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  cardContainer: {
    backgroundColor: CLAY_COLORS.surfaceDarkElevated,
    borderRadius: CLAY_ROUNDED.xl, // 24px from DESIGN.md
    borderWidth: 1,
    borderColor: CLAY_COLORS.surfaceDarkBorder,
    padding: 20,
    gap: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  editorialSection: {
    gap: 12,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_ROUNDED.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pinkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CLAY_COLORS.brandPink,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  displayHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    lineHeight: 28,
  },
  description: {
    fontSize: 13,
    color: CLAY_COLORS.mutedSoft,
    lineHeight: 19,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: CLAY_ROUNDED.md, // 12px
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A0A0A',
    letterSpacing: -0.2,
  },
  featureCard: {
    backgroundColor: CLAY_COLORS.brandTeal, // #1a3a3a from DESIGN.md
    borderRadius: CLAY_ROUNDED.lg,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  featureStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_ROUNDED.pill,
  },
  featureStampText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  featureSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 17,
  },
  featureFooter: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  topicsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topicsTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.brandOchre,
  },
});
