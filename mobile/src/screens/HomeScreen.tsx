import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Header } from '../components/Header';
import { ProfFilterTabs, FilterOption } from '../components/ProfFilterTabs';
import { SubjectCard } from '../components/SubjectCard';
import { MobileLmsApi } from '../services/api';
import { Subject } from '../types/lms';
import { COMMON_COLORS } from '../theme/colors';
import { useAppTheme } from '../context/ThemeContext';
import { Search, Flame, Award } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme } = useAppTheme();
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

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* High-Yield Study Banner */}
      <View style={[styles.studyBanner, { borderColor: theme.border }]}>
        <View style={styles.bannerLeft}>
          <View style={styles.bannerTagRow}>
            <Flame size={14} color={COMMON_COLORS.gold} />
            <Text style={styles.bannerTagText}>NEET-PG & INI-CET CURRICULUM</Text>
          </View>
          <Text style={styles.bannerTitle}>19 MBBS Subjects</Text>
          <Text style={styles.bannerSubtitle}>High-Yield Lectures & Clinical Notes</Text>
        </View>
        <View style={[styles.bannerIconCircle, { backgroundColor: theme.badgeBg }]}>
          <Award size={24} color={theme.accent} />
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Search size={16} color={COMMON_COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search subjects, codes (e.g. ANAT, MED)..."
          placeholderTextColor={COMMON_COLORS.textMuted}
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
      <StatusBar barStyle="light-content" backgroundColor={COMMON_COLORS.bgDark} />
      <Header />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading 19 Subjects Catalog...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSubjects}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SubjectCard
              subject={item}
              onPress={() => navigation.navigate('SubjectDetail', { subject: item })}
            />
          )}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No subjects matched your search.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COMMON_COLORS.bgDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COMMON_COLORS.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerContent: {
    marginBottom: 16,
  },
  studyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COMMON_COLORS.cardDark,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  bannerLeft: {
    flex: 1,
  },
  bannerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  bannerTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COMMON_COLORS.gold,
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COMMON_COLORS.textPrimary,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: COMMON_COLORS.textMuted,
    fontWeight: '500',
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COMMON_COLORS.cardDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COMMON_COLORS.cardBorder,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: COMMON_COLORS.textPrimary,
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COMMON_COLORS.textMuted,
  },
});
