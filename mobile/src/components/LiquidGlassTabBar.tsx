import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { BookOpen, Flame, FileText, Bookmark } from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';
import { CLAY_COLORS } from '../theme/clay';

export type MainTabType = 'curriculum' | 'highYield' | 'notes' | 'bookmarks';

interface LiquidGlassTabBarProps {
  currentTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
}

export const LiquidGlassTabBar: React.FC<LiquidGlassTabBarProps> = ({
  currentTab,
  onTabChange,
}) => {
  const { mode, theme } = useAppTheme();

  const tabs: { id: MainTabType; label: string; icon: any }[] = [
    { id: 'curriculum', label: 'Subjects', icon: BookOpen },
    { id: 'highYield', label: 'High-Yield', icon: Flame },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'bookmarks', label: 'Saved', icon: Bookmark },
  ];

  return (
    <View style={styles.floatingWrapper} pointerEvents="box-none">
      <View style={styles.outerShadow}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 70 : 85}
          tint="dark"
          style={styles.blurContainer}
        >
          {/* Top specular highlight edge representing liquid glass refraction */}
          <View style={styles.specularGlare} />

          <View style={styles.tabsRow}>
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={styles.tabButton}
                  onPress={() => onTabChange(tab.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconWrapper,
                      isActive && {
                        backgroundColor:
                          mode === 'marrow'
                            ? 'rgba(0, 163, 137, 0.28)'
                            : 'rgba(99, 102, 241, 0.28)',
                        borderColor:
                          mode === 'marrow'
                            ? 'rgba(0, 163, 137, 0.5)'
                            : 'rgba(99, 102, 241, 0.5)',
                      },
                    ]}
                  >
                    <Icon
                      size={20}
                      color={
                        isActive
                          ? theme.accent
                          : CLAY_COLORS.mutedSoft
                      }
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />
                    {isActive && (
                      <View
                        style={[
                          styles.activeDot,
                          { backgroundColor: theme.primary },
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.tabLabel,
                      isActive
                        ? [styles.tabLabelActive, { color: theme.accent }]
                        : styles.tabLabelInactive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  outerShadow: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 36,
    // iOS Liquid Glass shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    // Android elevation
    elevation: 24,
    backgroundColor: 'rgba(11, 15, 23, 0.85)',
  },
  blurContainer: {
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: Platform.select({
      ios: 'rgba(15, 23, 42, 0.65)',
      android: 'rgba(15, 23, 42, 0.88)',
    }),
  },
  specularGlare: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrapper: {
    width: 44,
    height: 34,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 3,
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: CLAY_COLORS.mutedSoft,
  },
});
