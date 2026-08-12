import { ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { type Href, Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-theme';
import { useQueryLifecycle } from '@/hooks/use-query-lifecycle';
import { queryClient } from '@/lib/query-client';
import { useNotificationNavigation } from '@/lib/notifications';
import { hasCompletedOnboarding } from '@/lib/onboarding';
import { store } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { loadThemePreference } from '@/store/theme-slice';
import { navigationThemes } from '@/constants/theme';

import '../global.css';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <SafeAreaProvider>
          <RootLayoutContent />
        </SafeAreaProvider>
      </Provider>
    </QueryClientProvider>
  );
}

function RootLayoutContent() {
  const dispatch = useAppDispatch();
  const { resolvedTheme } = useAppTheme();
  const segments = useSegments();
  const [isOnboardingReady, setIsOnboardingReady] = useState(false);

  useQueryLifecycle();
  useNotificationNavigation();

  useEffect(() => {
    dispatch(loadThemePreference());
  }, [dispatch]);

  useEffect(() => {
    setIsOnboardingReady(true);
  }, []);

  useEffect(() => {
    if (!isOnboardingReady) {
      return;
    }

    // Route types are generated at dev-server startup; keep this compatible on
    // the first typecheck after adding the new screen.
    const isOnboardingRoute = segments[0] === ('onboarding' as string);
    if (!hasCompletedOnboarding() && !isOnboardingRoute) {
      router.replace('/onboarding' as Href);
    }
    if (hasCompletedOnboarding() && isOnboardingRoute) {
      router.replace('/(tabs)');
    }
  }, [isOnboardingReady, segments]);

  return (
    <ThemeProvider value={navigationThemes[resolvedTheme]}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
        <Stack.Screen name="about" options={{ title: 'About' }} />
      </Stack>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
