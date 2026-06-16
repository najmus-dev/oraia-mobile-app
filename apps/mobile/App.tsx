import { useCallback, useEffect, useRef } from 'react';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider, useAppState } from './src/state/AppState';
import { ThemeProvider, useThemeState } from './src/state/ThemeState';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ScreenEntrance } from './src/components/ScreenEntrance';
import { useEASUpdates } from './src/hooks/useEASUpdates';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* Splash may already be hidden in dev */
});

function AppRoot() {
  const { hydrated } = useAppState();
  const { hydrated: themeHydrated } = useThemeState();
  const updatesReady = useEASUpdates();
  const splashHiddenRef = useRef(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const hideSplash = useCallback(async () => {
    if (splashHiddenRef.current) return;
    splashHiddenRef.current = true;
    await SplashScreen.hideAsync();
  }, []);

  const ready = fontsLoaded && hydrated && themeHydrated && updatesReady;

  useEffect(() => {
    if (ready) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      hideSplash();
    }
  }, [ready, hideSplash]);

  if (!ready) {
    return null;
  }

  return (
    <ScreenEntrance>
      <AppNavigator />
    </ScreenEntrance>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStateProvider>
          <AppRoot />
        </AppStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
