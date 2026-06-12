import {
  CommonActions,
  type EventArg,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './MainTabs';
import { buildTabStackResetRoutes, shouldResetTabStackToRoot, type NestedStackState } from './tabStackReset';

/** Walk up the tree until we find the bottom tab navigator. */
export function getTabNavigation(
  navigation: NavigationProp<ParamListBase>,
): NavigationProp<ParamListBase> | undefined {
  let current: NavigationProp<ParamListBase> | undefined = navigation;
  while (current) {
    const state = current.getState();
    if (state.type === 'tab') return current;
    current = current.getParent?.() ?? undefined;
  }
  return undefined;
}

export function navigateToTabScreen(
  navigation: NavigationProp<ParamListBase>,
  tabName: keyof MainTabParamList,
  screen: string,
  params?: object,
): void {
  const tab = getTabNavigation(navigation);
  if (!tab) return;
  tab.navigate(tabName as never, { screen, params } as never);
}

type TabRootConfig = {
  tabName: keyof MainTabParamList;
  rootScreen: string;
};

/** Collapse a tab's nested stack to a single root screen and focus that tab. */
export function resetTabStackToRoot(
  tabNavigation: NavigationProp<ParamListBase>,
  tabName: keyof MainTabParamList,
  rootScreen: string,
): boolean {
  const state = tabNavigation.getState();
  const nextRoutes = buildTabStackResetRoutes(state.routes, tabName, rootScreen);
  if (!nextRoutes) return false;

  const tabIndex = state.routes.findIndex((r) => r.name === tabName);
  tabNavigation.dispatch(
    CommonActions.reset({
      index: tabIndex,
      routes: nextRoutes,
    }),
  );
  return true;
}

/** GHL-style tab bar: tapping a tab always returns to that tab's root screen when nested. */
export function createTabPressToRootListener({ tabName, rootScreen }: TabRootConfig) {
  return ({
    navigation,
  }: {
    navigation: BottomTabNavigationProp<MainTabParamList>;
  }) => ({
    tabPress: (e: EventArg<'tabPress', true>) => {
      const state = navigation.getState();
      const tabRoute = state.routes.find((r) => r.name === tabName);
      const nestedState = tabRoute?.state as NestedStackState | undefined;
      if (!shouldResetTabStackToRoot(nestedState, rootScreen)) return;

      e.preventDefault();
      resetTabStackToRoot(navigation, tabName, rootScreen);
    },
  });
}
