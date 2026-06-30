import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { PendingApprovalScreen } from '../screens/PendingApprovalScreen';
import { LocationPickerScreen } from '../screens/LocationPickerScreen';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { navigationRef } from '../lib/navigationRef';
import { useAppState } from '../state/AppState';
import { isAccountPending } from '../store/auth';
import { MainTabs } from './MainTabs';
import { getActiveRouteName, NavigationStatusBar } from './NavigationStatusBar';
import { useTheme } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

function createNavTheme(theme: OraiaTheme): Theme {
  return {
    dark: theme.colorScheme === 'dark',
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.shell,
      text: theme.colors.shellForeground,
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
}

export function AppNavigator() {
  const theme = useTheme();
  const navTheme = useMemo(() => createNavTheme(theme), [theme]);
  const { token, user, locationId } = useAppState();
  usePushNotifications();

  const pending = Boolean(token && isAccountPending(user));
  const navKey = !token ? 'guest' : pending ? 'pending' : !locationId ? 'pick-location' : 'main';

  const bootstrapRoute = useMemo(() => {
    if (!token) return 'Login';
    if (pending) return 'PendingApproval';
    if (!locationId) return 'LocationPicker';
    return undefined;
  }, [token, pending, locationId]);

  const [activeRoute, setActiveRoute] = useState<string | undefined>(bootstrapRoute);

  const syncActiveRoute = useCallback(() => {
    if (!navigationRef.isReady()) return;
    setActiveRoute(getActiveRouteName(navigationRef.getRootState()));
  }, []);

  useEffect(() => {
    setActiveRoute(bootstrapRoute);
  }, [navKey, bootstrapRoute]);

  return (
    <NavigationContainer
      ref={navigationRef}
      key={navKey}
      theme={navTheme}
      onReady={syncActiveRoute}
      onStateChange={syncActiveRoute}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'fade',
        }}
      >
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : pending ? (
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        ) : !locationId ? (
          <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
      <NavigationStatusBar routeName={activeRoute} />
    </NavigationContainer>
  );
}
