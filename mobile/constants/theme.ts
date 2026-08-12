import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export const themeColors = {
  light: {
    background: '#F8F8FA',
    surface: '#FFFFFF',
    text: '#18181B',
    tint: '#53FC18',
    select: '#27272A',
    muted: '#71717A',
    border: '#E4E4E7',
  },
  dark: {
    background: '#0B0B0D',
    surface: '#17171A',
    text: '#F4F4F5',
    tint: '#53FC18',
    select: '#27272A',
    muted: '#A1A1AA',
    border: '#2A2A2F',
  },
} as const;

export type ResolvedTheme = keyof typeof themeColors;

export const navigationThemes = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: themeColors.light.tint,
      background: themeColors.light.background,
      card: themeColors.light.surface,
      text: themeColors.light.text,
      border: themeColors.light.border,
      notification: themeColors.light.tint,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: themeColors.dark.tint,
      background: themeColors.dark.background,
      card: themeColors.dark.surface,
      text: themeColors.dark.text,
      border: themeColors.dark.border,
      notification: themeColors.dark.tint,
    },
  },
} as const;
