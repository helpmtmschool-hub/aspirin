import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Topic, Subject } from '../types/lms';
import { MobileLmsApi } from '../services/api';
import { useAppTheme } from '../context/ThemeContext';
import { COMMON_COLORS } from '../theme/colors';
import {
  ArrowLeft,
  Sparkles,
  RotateCcw,
  RotateCw,
  Gauge,
  ListOrdered,
  FileText,
  CheckCircle2,
} from 'lucide-react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type PlayerScreenProps = NativeStackScreenProps<RootStackParamList, 'Player'>;

const PLAYBACK_SPEEDS = [1.0, 1.25, 1.5, 1.75, 2.0];

export const PlayerScreen: React.FC<PlayerScreenProps> = ({ route, navigation }) => {
  const { topic, subject, playlist = [] } = route.params;
  const { theme } = useAppTheme();
  const [currentSpeed, setCurrentSpeed] = useState<number>(1.0);
  const [activeTab, setActiveTab] = useState<'pearls' | 'notes' | 'playlist'>('pearls');

  const streamUrl = MobileLmsApi.getStreamUrl(topic);

  // Initialize expo-video player backed by AndroidX Media3
  const player = useVideoPlayer(streamUrl, (p: any) => {
    p.playbackRate = 1.0;
    p.play();
  });

  const handleSpeedChange = (speed: number) => {
    setCurrentSpeed(speed);
    if (player) {
      player.playbackRate = speed;
    }
  };

  const handleSeek = (deltaSeconds: number) => {
    if (player) {
      const newTime = Math.max(0, player.currentTime + deltaSeconds);
      player.currentTime = newTime;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.topInfo}>
          <Text style={styles.topSubject}>{subject.name}</Text>
          <Text style={styles.topTitle} numberOfLines={1}>
            {topic.title}
          </Text>
        </View>
      </View>

      {/* Video View */}
      <View style={styles.videoContainer}>
        {streamUrl ? (
          <VideoView
            style={styles.video}
            player={player}
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture
            startsPictureInPictureAutomatically
            nativeControls
          />
        ) : (
          <View style={styles.noStreamContainer}>
            <Text style={styles.noStreamText}>Video stream unavailable</Text>
          </View>
        )}
      </View>

      {/* Controls Bar: Speed & Quick Seek */}
      <View style={styles.controlsBar}>
        <View style={styles.seekGroup}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => handleSeek(-10)}
            activeOpacity={0.7}
          >
            <RotateCcw size={16} color={COMMON_COLORS.textSecondary} />
            <Text style={styles.controlButtonText}>-10s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => handleSeek(10)}
            activeOpacity={0.7}
          >
            <RotateCw size={16} color={COMMON_COLORS.textSecondary} />
            <Text style={styles.controlButtonText}>+10s</Text>
          </TouchableOpacity>
        </View>

        {/* Speed Selector */}
        <View style={styles.speedRow}>
          <Gauge size={14} color={theme.accent} style={{ marginRight: 4 }} />
          {PLAYBACK_SPEEDS.map((speed) => {
            const isSelected = currentSpeed === speed;
            return (
              <TouchableOpacity
                key={speed}
                style={[
                  styles.speedChip,
                  isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                onPress={() => handleSpeedChange(speed)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.speedChipText,
                    isSelected ? { color: '#FFFFFF' } : { color: COMMON_COLORS.textMuted },
                  ]}
                >
                  {speed}x
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Clinical Drawer Tabs */}
      <View style={styles.drawerTabs}>
        <TouchableOpacity
          style={[styles.drawerTab, activeTab === 'pearls' && styles.drawerTabActive]}
          onPress={() => setActiveTab('pearls')}
        >
          <Sparkles size={14} color={activeTab === 'pearls' ? theme.accent : COMMON_COLORS.textMuted} />
          <Text
            style={[
              styles.drawerTabText,
              activeTab === 'pearls' && { color: theme.accent, fontWeight: '700' },
            ]}
          >
            High-Yield Pearls
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.drawerTab, activeTab === 'playlist' && styles.drawerTabActive]}
          onPress={() => setActiveTab('playlist')}
        >
          <ListOrdered size={14} color={activeTab === 'playlist' ? theme.accent : COMMON_COLORS.textMuted} />
          <Text
            style={[
              styles.drawerTabText,
              activeTab === 'playlist' && { color: theme.accent, fontWeight: '700' },
            ]}
          >
            Playlist
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.drawerTab, activeTab === 'notes' && styles.drawerTabActive]}
          onPress={() => setActiveTab('notes')}
        >
          <FileText size={14} color={activeTab === 'notes' ? theme.accent : COMMON_COLORS.textMuted} />
          <Text
            style={[
              styles.drawerTabText,
              activeTab === 'notes' && { color: theme.accent, fontWeight: '700' },
            ]}
          >
            Slides
          </Text>
        </TouchableOpacity>
      </View>

      {/* Drawer Body Content */}
      <ScrollView contentContainerStyle={styles.drawerContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'pearls' && (
          <View>
            <View style={styles.pearlsHeader}>
              <Sparkles size={16} color={COMMON_COLORS.gold} />
              <Text style={styles.pearlsHeaderText}>Exam Recall & Diagnostic Criteria</Text>
            </View>

            {topic.pearls && topic.pearls.length > 0 ? (
              topic.pearls.map((pearl, index) => (
                <View key={index} style={[styles.pearlCard, { borderColor: theme.border }]}>
                  <View style={styles.pearlIndexBadge}>
                    <Text style={styles.pearlIndexText}>#{index + 1}</Text>
                  </View>
                  <Text style={styles.pearlText}>{pearl}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyDrawer}>
                <Text style={styles.emptyDrawerText}>
                  No high-yield pearls indexed for this lecture yet.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'playlist' && (
          <View>
            {playlist.map((item, idx) => {
              const isCurrent = item.id === topic.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.playlistItem,
                    isCurrent && { backgroundColor: theme.badgeBg, borderColor: theme.primary },
                  ]}
                  onPress={() => {
                    if (!isCurrent) {
                      navigation.replace('Player', { topic: item, subject, playlist });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.playlistItemNumber,
                      isCurrent && { color: theme.accent, fontWeight: '800' },
                    ]}
                  >
                    {idx + 1}.
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.playlistItemTitle,
                        isCurrent && { color: theme.accent, fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.playlistItemMeta}>{item.duration_formatted}</Text>
                  </View>
                  {isCurrent && <CheckCircle2 size={16} color={theme.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {activeTab === 'notes' && (
          <View style={styles.emptyDrawer}>
            <FileText size={32} color={COMMON_COLORS.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyDrawerTitle}>Companion Lecture Notes</Text>
            <Text style={styles.emptyDrawerText}>
              High-resolution clinical slide deck and handwritten faculty practical guide available for offline reading.
            </Text>
          </View>
        )}
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
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#000000',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  topInfo: {
    flex: 1,
  },
  topSubject: {
    fontSize: 11,
    color: COMMON_COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  topTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  videoContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  noStreamContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noStreamText: {
    color: COMMON_COLORS.textMuted,
    fontSize: 13,
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COMMON_COLORS.cardDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COMMON_COLORS.cardBorder,
  },
  seekGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  controlButtonText: {
    fontSize: 11,
    color: COMMON_COLORS.textSecondary,
    fontWeight: '600',
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  speedChip: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  speedChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  drawerTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COMMON_COLORS.cardBorder,
    backgroundColor: COMMON_COLORS.cardDark,
  },
  drawerTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  drawerTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFFFFF',
  },
  drawerTabText: {
    fontSize: 12,
    color: COMMON_COLORS.textMuted,
    fontWeight: '600',
  },
  drawerContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pearlsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  pearlsHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: COMMON_COLORS.textPrimary,
  },
  pearlCard: {
    backgroundColor: COMMON_COLORS.cardDark,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 10,
  },
  pearlIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pearlIndexText: {
    fontSize: 10,
    fontWeight: '800',
    color: COMMON_COLORS.textMuted,
  },
  pearlText: {
    flex: 1,
    fontSize: 13,
    color: COMMON_COLORS.textPrimary,
    lineHeight: 19,
    fontWeight: '500',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COMMON_COLORS.cardDark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COMMON_COLORS.cardBorder,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  playlistItemNumber: {
    fontSize: 13,
    color: COMMON_COLORS.textMuted,
    fontWeight: '600',
  },
  playlistItemTitle: {
    fontSize: 13,
    color: COMMON_COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  playlistItemMeta: {
    fontSize: 11,
    color: COMMON_COLORS.textMuted,
  },
  emptyDrawer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyDrawerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COMMON_COLORS.textPrimary,
    marginBottom: 6,
  },
  emptyDrawerText: {
    fontSize: 13,
    color: COMMON_COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
