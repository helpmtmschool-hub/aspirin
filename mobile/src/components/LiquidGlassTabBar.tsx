import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BookOpen, Flame, FileText, Bookmark } from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';
import { CLAY_COLORS } from '../theme/clay';

export type MainTabType = 'curriculum' | 'highYield' | 'notes' | 'bookmarks';

interface LiquidGlassTabBarProps {
  currentTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
}

const TABS: { id: MainTabType; label: string; icon: any }[] = [
  { id: 'curriculum', label: 'Subjects', icon: BookOpen },
  { id: 'highYield', label: 'High-Yield', icon: Flame },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'bookmarks', label: 'Saved', icon: Bookmark },
];

export const LiquidGlassTabBar: React.FC<LiquidGlassTabBarProps> = ({
  currentTab,
  onTabChange,
}) => {
  const { mode, theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = useState<number>(0);

  const activeIndex = TABS.findIndex((t) => t.id === currentTab);
  const indicatorTranslateX = useSharedValue(0);

  const tabWidth = rowWidth > 0 ? (rowWidth - 16) / TABS.length : 0;

  useEffect(() => {
    if (tabWidth > 0 && activeIndex >= 0) {
      indicatorTranslateX.value = withSpring(8 + activeIndex * tabWidth, {
        stiffness: 280,
        damping: 26,
        mass: 0.8,
      });
    }
  }, [activeIndex, tabWidth]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorTranslateX.value }],
  }));

  const handlePress = (tab: MainTabType, idx: number) => {
    if (tab !== currentTab) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Haptics fallback on unsupported web/simulators
      }
      onTabChange(tab);
    }
  };

  const onRowLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== rowWidth) {
      setRowWidth(width);
      const initialTabWidth = (width - 16) / TABS.length;
      indicatorTranslateX.value = 8 + activeIndex * initialTabWidth;
    }
  };

  // Safe area bottom offset
  const bottomOffset = Math.max(16, insets.bottom + 6);

  // iOS native glass tint
  const blurTint = Platform.select({
    ios: 'systemChromeMaterialDark',
    default: 'dark',
  }) as any;

  return (
    <View style={[styles.floatingWrapper, { bottom: bottomOffset }]} pointerEvents="box-none">
      <View style={styles.outerShadow}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 82 : 88}
          tint={blurTint}
          blurMethod="dimezisBlurView"
          style={styles.blurContainer}
        >
          {/* Top specular refraction glare edge simulating physical liquid glass */}
          <View style={styles.specularGlare} />

          {/* Liquid Sliding Bubble Indicator */}
          {tabWidth > 0 && (
            <Animated.View
              style={[
                styles.liquidBubble,
                {
                  width: tabWidth,
                  backgroundColor:
                    mode === 'marrow'
                      ? 'rgba(0, 163, 137, 0.22)'
                      : 'rgba(99, 102, 241, 0.22)',
                  borderColor:
                    mode === 'marrow'
                      ? 'rgba(0, 163, 137, 0.45)'
                      : 'rgba(99, 102, 241, 0.45)',
                  shadowColor: theme.primary,
                },
                animatedIndicatorStyle,
              ]}
            >
              {/* Inner bubble specular catch */}
              <View style={styles.bubbleGloss} />
            </Animated.View>
          )}

          <View style={styles.tabsRow} onLayout={onRowLayout}>
            {TABS.map((tab, idx) => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={styles.tabButton}
                  onPress={() => handlePress(tab.id, idx)}
                  activeOpacity={0.8}
                >
                  <View style={styles.iconContainer}>
                    <Icon
                      size={20}
                      color={isActive ? theme.accent : CLAY_COLORS.mutedSoft}
                      strokeWidth={isActive ? 2.5 : 1.9}
                    />
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
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  outerShadow: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 36,
    // Native iOS Liquid Glass shadow depth
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 20,
    backgroundColor: Platform.select({
      ios: 'transparent',
      android: 'rgba(10, 15, 24, 0.90)',
    }),
  },
  blurContainer: {
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: Platform.select({
      ios: 'rgba(15, 23, 42, 0.55)',
      android: 'rgba(15, 23, 42, 0.85)',
    }),
  },
  specularGlare: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
    borderRadius: 1,
    zIndex: 10,
  },
  liquidBubble: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 28,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 1,
    overflow: 'hidden',
  },
  bubbleGloss: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 8,
    zIndex: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minHeight: 48,
  },
  iconContainer: {
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: CLAY_COLORS.mutedSoft,
  },
});
