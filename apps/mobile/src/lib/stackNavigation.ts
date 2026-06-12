import {
  CommonActions,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';

/** Screens that are part of create/edit wizards — not kept on the stack after save. */
export const WIZARD_FLOW_SCREENS = new Set([
  'PickContact',
  'PickContactForMessage',
  'OpportunityForm',
  'SelectAssignees',
  'TaskForm',
  'TaskFilters',
  'ContactForm',
  'ScanBusinessCard',
  'ScheduleAppointment',
  'AppointmentForm',
]);

export type StackRoute = { name: string; params?: object };

function trailingWizardStart(routes: StackRoute[]): number {
  let start = routes.length;
  for (let i = routes.length - 1; i >= 0; i -= 1) {
    if (WIZARD_FLOW_SCREENS.has(routes[i].name)) {
      start = i;
    } else {
      break;
    }
  }
  return start;
}

function mergeRouteParams(
  existing: object | undefined,
  incoming: object | undefined,
): object | undefined {
  if (!incoming) return existing;
  if (!existing) return incoming;
  return { ...existing, ...incoming };
}

/**
 * Return to a screen already in the stack, dropping any screens above it and merging params.
 * Avoids blank screens from navigate+merge on native stack pickers.
 */
export function returnToScreen(
  navigation: NavigationProp<ParamListBase>,
  screen: string,
  params?: object,
): void {
  const state = navigation.getState();
  const routes = state.routes as StackRoute[];
  const index = routes.findIndex((r) => r.name === screen);

  if (index < 0) {
    navigation.navigate(screen as never, params as never);
    return;
  }

  navigation.dispatch(
    CommonActions.reset({
      index,
      routes: routes.slice(0, index + 1).map((route, i) =>
        i === index
          ? { name: route.name, params: mergeRouteParams(route.params, params) }
          : { name: route.name, params: route.params },
      ),
    }),
  );
}

/**
 * After a wizard completes, collapse trailing picker/form screens and land on `target`.
 * Example: Pipeline → PickContact → OpportunityForm → save → Pipeline → OpportunityDetail.
 */
export function finishWizardFlow(
  navigation: NavigationProp<ParamListBase>,
  target: StackRoute,
): void {
  const routes = navigation.getState().routes as StackRoute[];
  if (!routes.length) {
    navigation.navigate(target.name as never, target.params as never);
    return;
  }

  const wizardStart = trailingWizardStart(routes);
  const beforeWizard = routes.slice(0, wizardStart);

  if (!beforeWizard.length) {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: target.name, params: target.params }],
      }),
    );
    return;
  }

  const anchor = beforeWizard[beforeWizard.length - 1];
  if (anchor.name === target.name) {
    navigation.dispatch(
      CommonActions.reset({
        index: beforeWizard.length - 1,
        routes: [
          ...beforeWizard.slice(0, -1),
          { name: target.name, params: target.params },
        ],
      }),
    );
    return;
  }

  navigation.dispatch(
    CommonActions.reset({
      index: beforeWizard.length,
      routes: [...beforeWizard, { name: target.name, params: target.params }],
    }),
  );
}

/** Standard back — only use finishWizardFlow on save, not on back from pickers. */
export function popWizardBack(
  navigation: NavigationProp<ParamListBase>,
  fallbackHub: string,
): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.navigate(fallbackHub as never);
}
