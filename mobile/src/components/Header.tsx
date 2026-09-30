import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, Layers } from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';
import { COMMON_COLORS } from '../theme/colors';

interface HeaderProps {
  onSearchPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchPress }) => {
  const { mode, theme, toggleTheme } = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={[styles.logoIcon, { backgroundColor: theme.primary }]}>
          <Sparkles color="#FFFFFF" size={18} />
        </View>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.brandTitle}>aspirin</Text>
            <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
              <Text style={[styles.badgeText, { color: theme.badgeText }]}>
                {mode === 'marrow' ? 'MARROW' : 'PREPLADDER'}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Medical LMS & Streaming</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.themeToggle, { borderColor: theme.border }]}
        onPress={toggleTheme}
        activeOpacity={0.7}
      >
        <Layers size={16} color={theme.accent} />
        <Text style={[styles.themeToggleText, { color: theme.accent }]}>
          {mode === 'marrow' ? 'Indigo' : 'Teal'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: COMMON_COLORS.bgDark,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COMMON_COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: COMMON_COLORS.textMuted,
    fontWeight: '500',
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: COMMON_COLORS.cardDark,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
