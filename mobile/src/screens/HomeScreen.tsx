import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Header } from '../components/Header';
import { HeroContinueWatching } from '../components/home/HeroContinueWatching';
import { MobileMediaShelf } from '../components/home/MobileMediaShelf';
import { ClaySubjectCard } from '../components/ClaySubjectCard';
import { ProfFilterTabs, FilterOption } from '../components/ProfFilterTabs';
import { MobilePlatformClassroom } from '../components/classroom/MobilePlatformClassroom';
import { LiquidGlassTabBar, MainTabType } from '../components/LiquidGlassTabBar';
import { HighYieldFeed } from '../components/HighYieldFeed';
import { BookmarksFeed } from '../components/BookmarksFeed';
import { MobileLmsApi } from '../services/api';
import { Subject, Topic, NoteItem } from '../types/lms';
import { CLAY_COLORS, CLAY_ROUNDED } from '../theme/clay';
import { useAppTheme } from '../context/ThemeContext';
import { Film, Award, BookOpen, Sparkles } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState<MainTabType>('curriculum');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [curatedFeed, setCuratedFeed] = useState<{
    highYieldLectures: Topic[];
    firstProfPicks: Topic[];
    clinicalPicks: Topic[];
    masterBooks: NoteItem[];
  }>({
    highYieldLectures: [],
    firstProfPicks: [],
    clinicalPicks: [],
    masterBooks: [],
  });

  const [selectedProf, setSelectedProf] = useState<FilterOption>('All');
  const [selectedClassroomSubject, setSelectedClassroomSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [subs, feed] = await Promise.all([
        MobileLmsApi.getSubjects(),
        MobileLmsApi.getCuratedFeed(),
      ]);
      setSubjects(subs);
      setCuratedFeed(feed);
    } catch {
      setSubjects(MobileLmsApi.getFallbackSubjects());
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTopic = (topic: Topic, playlist?: Topic[]) => {
    const parentSubject =
      subjects.find((s) => s.id === topic.subject_id) || subjects[0];
    navigation.navigate('Player', {
      topic,
      subject: parentSubject,
      playlist: playlist && playlist.length > 0 ? playlist : [topic],
    });
  };

  const filteredSubjects = subjects.filter((s) => {
    if (selectedProf === 'All') return true;
    return s.prof === selectedProf;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={CLAY_COLORS.surfaceDark} />

      {/* Main Top Brand Header */}
      {!selectedClassroomSubject && <Header />}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading Aspirin Clinical Catalog...</Text>
        </View>
      ) : selectedClassroomSubject ? (
        /* If a subject is selected, render the full PlatformClassroom */
        <MobilePlatformClassroom
          subject={selectedClassroomSubject}
          onBack={() => setSelectedClassroomSubject(null)}
          onPlayTopic={handlePlayTopic}
        />
      ) : (
        <View style={styles.bodyWrapper}>
          {/* TAB 1: CURRICULUM (HOME FEED MATCHING WEB APP APP.TSX) */}
          {activeTab === 'curriculum' && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* 1. Signature Clay 7-5 Hero Band */}
              <HeroContinueWatching
                inProgressTopic={curatedFeed.highYieldLectures[0] || null}
                onPlay={(t) => handlePlayTopic(t, curatedFeed.highYieldLectures)}
                onExplore={() => setActiveTab('highYield')}
              />

              {/* 2. Shelf: High-Yield Grand Rounds (tested in NEET-PG & INI-CET) */}
              <MobileMediaShelf
                title="High-Yield Clinical Grand Rounds"
                subtitle="Core topics tested repeatedly in NEET-PG and INI-CET"
                icon={<Award size={18} color={CLAY_COLORS.brandOchre} />}
                topics={curatedFeed.highYieldLectures}
                onSelectTopic={(t) => handlePlayTopic(t, curatedFeed.highYieldLectures)}
              />

              {/* 3. Shelf: Final Prof Clinical Specialties */}
              <MobileMediaShelf
                title="Final Prof: Clinical Specialties"
                subtitle="General Medicine, General Surgery, OBG & Pediatrics"
                icon={<BookOpen size={18} color={CLAY_COLORS.marrowTeal} />}
                topics={curatedFeed.clinicalPicks}
                onSelectTopic={(t) => handlePlayTopic(t, curatedFeed.clinicalPicks)}
              />

              {/* 4. Shelf: 1st Prof Pre-Clinical Essentials */}
              <MobileMediaShelf
                title="1st Prof: Pre-Clinical Essentials"
                subtitle="Anatomy, Physiology & Biochemistry Foundations"
                icon={<BookOpen size={18} color={CLAY_COLORS.brandPeach} />}
                topics={curatedFeed.firstProfPicks}
                onSelectTopic={(t) => handlePlayTopic(t, curatedFeed.firstProfPicks)}
              />
            </ScrollView>
          )}

          {/* TAB 2: 19 MBBS SUBJECTS GRID (MATCHING WEB SUBJECTGRID.TSX) */}
          {activeTab === 'highYield' && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.subjectsHeader}>
                <View style={styles.subjectsTitleRow}>
                  <BookOpen size={20} color="#FFFFFF" />
                  <Text style={styles.subjectsTitle}>19 MBBS Subjects Curriculum</Text>
                </View>
                <Text style={styles.subjectsSubtitle}>
                  Choose between PrepLadder Edition X, Cerebellum Academy, and Marrow Edition 6 clinical tracks.
                </Text>

                {/* Professional Phase Filter Pills */}
                <ProfFilterTabs selected={selectedProf} onSelect={setSelectedProf} />
              </View>

              {/* 19 Subjects Clay Cards Grid */}
              {filteredSubjects.map((sub, idx) => (
                <ClaySubjectCard
                  key={sub.id}
                  subject={sub}
                  index={idx}
                  onPress={() => setSelectedClassroomSubject(sub)}
                />
              ))}
            </ScrollView>
          )}

          {/* TAB 3: CLINICAL NOTES */}
          {activeTab === 'notes' && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <HighYieldFeed />
            </ScrollView>
          )}

          {/* TAB 4: SAVED & BOOKMARKS */}
          {activeTab === 'bookmarks' && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <BookmarksFeed />
            </ScrollView>
          )}
        </View>
      )}

      {/* Liquid Glass Floating Bottom Navigation Bar (Hidden if inside player) */}
      {!selectedClassroomSubject && (
        <LiquidGlassTabBar
          currentTab={activeTab}
          onTabChange={(tab) => {
            setSelectedClassroomSubject(null);
            setActiveTab(tab);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CLAY_COLORS.surfaceDark,
  },
  bodyWrapper: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: CLAY_COLORS.mutedSoft,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110, // Generous padding so floating liquid glass bar hovers above content
  },
  subjectsHeader: {
    marginBottom: 16,
  },
  subjectsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  subjectsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subjectsSubtitle: {
    fontSize: 12,
    color: CLAY_COLORS.mutedSoft,
    lineHeight: 18,
    marginBottom: 14,
  },
});
