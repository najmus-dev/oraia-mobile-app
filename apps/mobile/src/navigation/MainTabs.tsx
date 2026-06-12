import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeStack } from './HomeStack';
import { InboxStack } from './InboxStack';
import { SearchStack } from './SearchStack';
import { CalendarStack } from './CalendarStack';
import { AppsStack } from './AppsStack';
import { useTheme, useThemedStyles } from '../hooks/useTheme';
import { shouldHideTabBar } from './tabBarVisibility';
import { createTabPressToRootListener } from './tabNavigation';
import { TAB_BAR_BASE_HEIGHT } from '../lib/safeArea';
import { useAppState } from '../state/AppState';
import { api, withAuthHeaders } from '../lib/api';
import { prefetchDashboardSummary } from '../lib/dashboardSummary';

export type MainTabParamList = {
  HomeTab: undefined;
  InboxTab: undefined;
  SearchTab: undefined;
  CalendarTab: undefined;
  AppsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({
  focused,
  color,
  name,
  outlineName,
}: {
  focused: boolean;
  color: string;
  name: keyof typeof Ionicons.glyphMap;
  outlineName: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useTheme();
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      iconWrap: {
        width: 40,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
      },
      iconWrapActive: {
        backgroundColor: t.colors.primary,
      },
    }),
  );

  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons
        name={focused ? name : outlineName}
        size={22}
        color={focused ? theme.colors.white : color}
      />
    </View>
  );
}

export function MainTabs() {
  const theme = useTheme();
  const { token, locationId } = useAppState();
  const [unreadCount, setUnreadCount] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (token && locationId) {
      prefetchDashboardSummary({ token, locationId });
    }
  }, [token, locationId]);

  useEffect(() => {
    let alive = true;
    async function loadUnread() {
      if (!token || !locationId) return;
      try {
        const res = await api.getJson<{ conversations: { unreadCount?: number }[] }>(
          '/api/conversations?limit=30',
          { headers: withAuthHeaders({ token, locationId }) },
        );
        const unread = (res.conversations ?? []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
        if (alive) setUnreadCount(unread);
      } catch {
        if (alive) setUnreadCount(0);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadUnread();
    const timer = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      loadUnread();
    }, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [token, locationId]);

  const tabBarHeight = TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 0);

  const baseTabBarStyle = {
    backgroundColor: theme.colors.tabBar,
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Math.max(insets.bottom, 8),
    paddingTop: 6,
    height: tabBarHeight,
  } as const;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const hideTabBar = shouldHideTabBar(route.name, route);
        return {
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        lazy: true,
        tabBarActiveTintColor: theme.colors.isDark ? theme.colors.white : theme.colors.tabActive,
        tabBarInactiveTintColor: theme.colors.foregroundMuted,
        tabBarStyle: hideTabBar ? { display: 'none' } : baseTabBarStyle,
        tabBarLabelStyle: {
          fontFamily: theme.typography.fontFamily.medium,
          fontSize: 11,
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      };
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        listeners={createTabPressToRootListener({ tabName: 'HomeTab', rootScreen: 'HomeMain' })}
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} name="home" outlineName="home-outline" />
          ),
        }}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxStack}
        listeners={createTabPressToRootListener({ tabName: 'InboxTab', rootScreen: 'InboxList' })}
        options={{
          title: 'Inbox',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.danger,
            color: theme.colors.white,
            fontFamily: theme.typography.fontFamily.semiBold,
            fontSize: 10,
            minWidth: 18,
            height: 18,
            lineHeight: 18,
          },
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              name="chatbubble-ellipses"
              outlineName="chatbubble-outline"
            />
          ),
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchStack}
        listeners={createTabPressToRootListener({ tabName: 'SearchTab', rootScreen: 'SearchMain' })}
        options={{
          title: 'Search',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} name="search" outlineName="search-outline" />
          ),
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarStack}
        listeners={createTabPressToRootListener({ tabName: 'CalendarTab', rootScreen: 'CalendarList' })}
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} name="calendar" outlineName="calendar-outline" />
          ),
        }}
      />
      <Tab.Screen
        name="AppsTab"
        component={AppsStack}
        listeners={createTabPressToRootListener({ tabName: 'AppsTab', rootScreen: 'AppsHome' })}
        options={{
          title: 'Apps',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} name="apps" outlineName="apps-outline" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
