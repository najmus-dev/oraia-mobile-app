import type { EventArg, NavigationProp, ParamListBase } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './MainTabs';

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

/** GHL-style tab bar: tapping a tab always returns to that tab's root screen when nested. */
export function createTabPressToRootListener({ tabName, rootScreen }: TabRootConfig) {
  return ({
    navigation,
  }: {
    navigation: BottomTabNavigationProp<MainTabParamList>;
  }) => ({
    tabPress: (_event: EventArg<'tabPress', true>) => {
      const state = navigation.getState();
      const tabRoute = state.routes.find((r) => r.name === tabName);
      const nestedState = tabRoute?.state;
      if (!nestedState?.routes?.length) return;

      const index = nestedState.index ?? 0;
      const focused = nestedState.routes[index]?.name;
      if (index === 0 && focused === rootScreen) return;

      navigation.navigate(tabName, {
        screen: rootScreen,
      } as never);
    },
  });
}
