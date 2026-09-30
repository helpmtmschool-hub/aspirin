import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Header } from '../components/Header';
import { ProfFilterTabs, FilterOption } from '../components/ProfFilterTabs';
import { ClaySubjectCard } from '../components/ClaySubjectCard';
import { LiquidGlassTabBar, MainTabType } from '../components/LiquidGlassTabBar';
import { HighYieldFeed } from '../components/HighYieldFeed';
import { NotesAtlasFeed } from '../components/NotesAtlasFeed';
import { BookmarksFeed } from '../components/BookmarksFeed';
import { MobileLmsApi } from '../services/api';
import { Subject } from '../types/lms';
import { CLAY_COLORS, CLAY_ROUNDED } from '../theme/clay';
import { useAppTheme } from '../context/ThemeContext';
import { Search, Flame, Award, Sparkles } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme } = useAppTheme();
  const [currentTab, setCurrentTab] = useState<MainTabType>('curriculum');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const data = await MobileLmsApi.getSubjects();
      setSubjects(data);
    } catch {
      setSubjects(MobileLmsApi.getFallbackSubjects());
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const matchesFilter =
        selectedFilter === 'All' || subject.prof === selectedFilter;
      const matchesSearch =
        searchQuery.trim() === '' ||
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [subjects, selectedFilter, searchQuery]);

  const renderCurriculumHeader = () => (
    <View style={styles.headerContent}>
      {/* Clay Hero Feature Band from DESIGN.md */}
      <View
        style={[
          styles.heroFeatureBand,
          {
            backgroundColor: CLAY_COLORS.surfaceDarkElevated,
            borderColor: CLAY_COLORS.surfaceDarkBorder,
          },
        ]}
      >
        <View style={styles.heroLeft}>
          <View style={styles.tagBadge}>
            <Sparkles size={12} color={CLAY_COLORS.brandPink} />
            <Text style={styles.tagBadgeText}>NEET-PG & INI-CET CLINICAL</Text>
          </View>
          <Text style={styles.heroTitle}>19 MBBS Subjects</Text>
          <Text style={styles.heroSubtitle}>
            High-Yield Video Lectures & Digital Atlas
          </Text>
        </View>

        <View style={[styles.heroIconBadge, { backgroundColor: 'rgba(255, 77, 139, 0.15)' }]}>
          <Award size={26} color={CLAY_COLORS.brandPink} />
        </View>
      </View>

      {/* Clay Search Input Bar */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: CLAY_COLORS.surfaceDarkCard,
            borderColor: CLAY_COLORS.surfaceDarkBorder,
          },
        ]}
      >
        <Search size={16} color={CLAY_COLORS.mutedSoft} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search subjects, codes (e.g. ANAT, MED)..."
          placeholderTextColor={CLAY_COLORS.mutedSoft}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Professional Phase Filter Tabs */}
      <ProfFilterTabs selected={selectedFilter} onSelect={setSelectedFilter} />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={CLAY_COLORS.surfaceDark} />
      <Header />

      {/* Main Body per Active Tab */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading 19 Subjects...</Text>
        </View>
      ) : (
        <View style={styles.tabBody}>
          {currentTab === 'curriculum' && (
            <FlatList
              data={filteredSubjects}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <ClaySubjectCard
                  subject={item}
                  index={index}
                  onPress={() => navigation.navigate('SubjectDetail', { subject: item })}
                />
              )}
              ListHeaderComponent={renderCurriculumHeader}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No subjects matched your filter.</Text>
                </View>
              }
            />
          )}

          {currentTab === 'highYield' && (
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              <HighYieldFeed />
            </ScrollView>
          )}

          {currentTab === 'notes' && (
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              <NotesAtlasFeed />
            </ScrollView>
          )}

          {currentTab === 'bookmarks' && (
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              <BookmarksFeed />
            </ScrollView>
          )}
        </View>
      )}

      {/* Liquid Glass Floating Bottom Navigation Bar */}
      <LiquidGlassTabBar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CLAY_COLORS.surfaceDark,
  },
  tabBody: {
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
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110, // Extra padding so floating glass bar doesn't obscure content
  },
  headerContent: {
    marginBottom: 16,
  },
  heroFeatureBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: CLAY_ROUNDED.xl, // 24px from DESIGN.md
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  heroLeft: {
    flex: 1,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.brandPink,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: CLAY_COLORS.mutedSoft,
    fontWeight: '500',
  },
  heroIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: CLAY_ROUNDED.pill,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: CLAY_COLORS.mutedSoft,
  },
});
