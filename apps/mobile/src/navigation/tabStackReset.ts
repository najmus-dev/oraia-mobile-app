export type NestedStackState = {
  index?: number;
  routes: { name: string }[];
};

/** True when the tab's nested stack is not showing its root screen. */
export function shouldResetTabStackToRoot(
  nestedState: NestedStackState | undefined,
  rootScreen: string,
): boolean {
  if (!nestedState?.routes?.length) return false;
  const index = nestedState.index ?? 0;
  const focused = nestedState.routes[index]?.name;
  return !(index === 0 && focused === rootScreen);
}

/** Build tab navigator routes with one tab's nested stack collapsed to root. */
export function buildTabStackResetRoutes<T extends { name: string; state?: unknown }>(
  routes: T[],
  tabName: string,
  rootScreen: string,
): T[] | null {
  const tabIndex = routes.findIndex((r) => r.name === tabName);
  if (tabIndex < 0) return null;

  const nestedState = routes[tabIndex]?.state as NestedStackState | undefined;
  if (!shouldResetTabStackToRoot(nestedState, rootScreen)) return null;

  return routes.map((route, i) =>
    i === tabIndex
      ? {
          ...route,
          state: {
            routes: [{ name: rootScreen }],
            index: 0,
          },
        }
      : route,
  );
}
