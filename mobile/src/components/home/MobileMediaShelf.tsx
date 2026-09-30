import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Play, Clock, Sparkles } from 'lucide-react-native';
import { Topic } from '../../types/lms';
import { CLAY_COLORS, CLAY_ROUNDED } from '../../theme/clay';
import { getSubjectClayTheme } from '../../services/api';

interface MobileMediaShelfProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  topics: Topic[];
  onSelectTopic: (topic: Topic) => void;
}

export const MobileMediaShelf: React.FC<MobileMediaShelfProps> = ({
  title,
  subtitle,
  icon,
  topics,
  onSelectTopic,
}) => {
  if (!topics || topics.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon}
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {/* Horizontal Scroll Shelf */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {topics.map((topic) => {
          const theme = getSubjectClayTheme(topic.subject_id || 'medicine');

          return (
            <TouchableOpacity
              key={topic.id}
              style={[
                styles.card,
                {
                  backgroundColor: CLAY_COLORS.surfaceDarkCard,
                  borderColor: CLAY_COLORS.surfaceDarkBorder,
                },
              ]}
              onPress={() => onSelectTopic(topic)}
              activeOpacity={0.82}
            >
              {/* 16:9 Thumbnail Area */}
              <View style={[styles.thumbnail, { backgroundColor: theme.bg }]}>
                {/* Dark gradient overlay */}
                <View style={styles.thumbnailOverlay}>
                  {/* Play Button Icon */}
                  <View style={styles.playIconCircle}>
                    <Play size={16} color="#0A0A0A" fill="#0A0A0A" />
                  </View>

                  {/* Duration Badge */}
                  <View style={styles.durationBadge}>
                    <Clock size={10} color="#FFFFFF" />
                    <Text style={styles.durationText}>{topic.duration_formatted}</Text>
                  </View>
                </View>

                {/* Subject Code Watermark in Corner */}
                <View style={[styles.watermarkTag, { backgroundColor: theme.badge }]}>
                  <Text style={[styles.watermarkText, { color: theme.text }]}>
                    {(topic.subject_id || 'MED').toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Card Meta Content */}
              <View style={styles.cardContent}>
                <Text style={styles.topicTitle} numberOfLines={2}>
                  {topic.title}
                </Text>

                <Text style={styles.moduleText} numberOfLines={1}>
                  {topic.module || 'Clinical Masterclass'}
                </Text>

                {topic.pearls && topic.pearls.length > 0 && (
                  <View style={styles.pearlsRow}>
                    <Sparkles size={11} color={CLAY_COLORS.brandOchre} />
                    <Text style={styles.pearlsText}>
                      {topic.pearls.length} High-Yield Pearls
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    color: CLAY_COLORS.mutedSoft,
  },
  scrollContent: {
    gap: 14,
    paddingRight: 10,
  },
  card: {
    width: 250,
    borderRadius: CLAY_ROUNDED.lg, // 16px
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: 125,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: CLAY_ROUNDED.xs,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  watermarkTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: CLAY_ROUNDED.xs,
  },
  watermarkText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardContent: {
    padding: 12,
  },
  topicTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 4,
  },
  moduleText: {
    fontSize: 11,
    color: CLAY_COLORS.mutedSoft,
    marginBottom: 8,
  },
  pearlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pearlsText: {
    fontSize: 10,
    fontWeight: '700',
    color: CLAY_COLORS.brandOchre,
  },
});
