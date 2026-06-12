import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createTheme, type ColorScheme, type OraiaTheme } from '../theme/createTheme';

export type AppearancePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'oraia.appearance';

type ThemeStateValue = {
  hydrated: boolean;
  preference: AppearancePreference;
  colorScheme: ColorScheme;
  theme: OraiaTheme;
  setPreference: (preference: AppearancePreference) => void;
};

const ThemeStateContext = createContext<ThemeStateValue | null>(null);

function resolveColorScheme(
  preference: AppearancePreference,
  systemScheme: ColorScheme | null | undefined,
): ColorScheme {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemScheme === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [hydrated, setHydrated] = useState(false);
  const [preference, setPreferenceState] = useState<AppearancePreference>('dark');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (!alive) return;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const colorScheme = resolveColorScheme(preference, systemScheme);
  const theme = useMemo(() => createTheme(colorScheme), [colorScheme]);

  const value = useMemo<ThemeStateValue>(
    () => ({
      hydrated,
      preference,
      colorScheme,
      theme,
      setPreference: (next) => {
        setPreferenceState(next);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        SecureStore.setItemAsync(STORAGE_KEY, next);
      },
    }),
    [hydrated, preference, colorScheme, theme],
  );

  return <ThemeStateContext.Provider value={value}>{children}</ThemeStateContext.Provider>;
}

export function useThemeState() {
  const ctx = useContext(ThemeStateContext);
  if (!ctx) throw new Error('useThemeState must be used within ThemeProvider');
  return ctx;
}
