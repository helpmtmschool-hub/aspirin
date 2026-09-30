export type ThemeMode = 'marrow' | 'prepladder';

export interface ThemeConfig {
  name: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  gradient: readonly [string, string];
  surface: string;
  surfaceElevated: string;
  border: string;
  badgeBg: string;
  badgeText: string;
}

export const THEMES: Record<ThemeMode, ThemeConfig> = {
  marrow: {
    name: 'Marrow',
    primary: '#00A389',
    primaryLight: '#14B8A6',
    primaryDark: '#0B7A68',
    accent: '#2DD4BF',
    gradient: ['#00A389', '#0B7A68'],
    surface: '#111827',
    surfaceElevated: '#1F2937',
    border: '#2A3447',
    badgeBg: 'rgba(0, 163, 137, 0.15)',
    badgeText: '#2DD4BF',
  },
  prepladder: {
    name: 'PrepLadder',
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4338CA',
    accent: '#A5B4FC',
    gradient: ['#6366F1', '#4338CA'],
    surface: '#111827',
    surfaceElevated: '#1F2937',
    border: '#2A3447',
    badgeBg: 'rgba(99, 102, 241, 0.15)',
    badgeText: '#A5B4FC',
  },
};

export const COMMON_COLORS = {
  bgDark: '#0B0F17',
  cardDark: '#131B2B',
  cardBorder: '#1E293B',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  gold: '#F59E0B',
  emerald: '#10B981',
  rose: '#F43F5E',
  cyan: '#06B6D4',
  purple: '#A855F7',
};
