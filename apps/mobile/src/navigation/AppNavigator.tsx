import React from 'react';
import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { AppLoadingScreen } from '../components/AppLoadingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { LocationPickerScreen } from '../screens/LocationPickerScreen';
import { useAppState } from '../state/AppState';
import { MainTabs } from './MainTabs';
import { theme } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navTheme: Theme = {
  dark: true,
  colors: {
    primary: theme.colors.primary,
    background: theme.colors.shell,
    card: theme.colors.shell,
    text: theme.colors.textOnDark,
    border: theme.colors.border,
    notification: theme.colors.danger,
  },
  fonts: {
    regular: { fontFamily: theme.typography.fontFamily.regular, fontWeight: '400' },
    medium: { fontFamily: theme.typography.fontFamily.medium, fontWeight: '500' },
    bold: { fontFamily: theme.typography.fontFamily.bold, fontWeight: '700' },
    heavy: { fontFamily: theme.typography.fontFamily.bold, fontWeight: '800' },
  },
};

export function AppNavigator() {
  const { hydrated, token, locationId } = useAppState();

  if (!hydrated) {
    return <AppLoadingScreen message="Verifying session…" />;
  }

  const navKey = !token ? 'guest' : !locationId ? 'pick-location' : 'main';

  return (
    <NavigationContainer key={navKey} theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.shell },
          animation: 'fade',
        }}
      >
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : !locationId ? (
          <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
