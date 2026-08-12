import { useColorScheme } from 'react-native';

import { themeColors, type ResolvedTheme } from '@/constants/theme';
import { useAppSelector } from '@/store/hooks';

export function useAppTheme() {
  const preference = useAppSelector((state) => state.theme.preference);
  const systemTheme = useColorScheme();
  const resolvedTheme: ResolvedTheme =
    preference === 'system' ? (systemTheme ?? 'light') : preference;

  return {
    colors: themeColors[resolvedTheme],
    preference,
    resolvedTheme,
  };
}
