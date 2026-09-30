import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MBBSProf } from '../types/lms';
import { useAppTheme } from '../context/ThemeContext';
import { COMMON_COLORS } from '../theme/colors';

export type FilterOption = 'All' | MBBSProf;

interface ProfFilterTabsProps {
  selected: FilterOption;
  onSelect: (filter: FilterOption) => void;
}

const FILTERS: FilterOption[] = [
  'All',
  '1st Prof',
  '2nd Prof',
  '3rd Prof Part 1',
  'Final Prof Part 2',
];

export const ProfFilterTabs: React.FC<ProfFilterTabsProps> = ({ selected, onSelect }) => {
  const { theme } = useAppTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTERS.map((filter) => {
        const isSelected = selected === filter;
        return (
          <TouchableOpacity
            key={filter}
            style={[
              styles.tab,
              isSelected
                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                : { backgroundColor: COMMON_COLORS.cardDark, borderColor: COMMON_COLORS.cardBorder },
            ]}
            onPress={() => onSelect(filter)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                isSelected ? styles.selectedTabText : styles.unselectedTabText,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedTabText: {
    color: '#FFFFFF',
  },
  unselectedTabText: {
    color: COMMON_COLORS.textSecondary,
  },
});
