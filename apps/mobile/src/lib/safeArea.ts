import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

/** Extra space below the status bar on compact toolbars (AppBar, inbox header). */
export const HEADER_TOP_GUTTER = theme.spacing.sm;

/** Extra space below the status bar on hero/detail headers. */
export const HEADER_TOP_GUTTER_LARGE = theme.spacing.md;

/** Tab bar content row height (excluding home-indicator padding). */
export const TAB_BAR_BASE_HEIGHT = 56;

/** Bottom padding for lists on tab-root screens (tab bar sits outside the scene). */
export const TAB_LIST_BOTTOM_PADDING = theme.spacing['2xl'];

export function useHeaderTopPadding(large = false): number {
  const insets = useSafeAreaInsets();
  return insets.top + (large ? HEADER_TOP_GUTTER_LARGE : HEADER_TOP_GUTTER);
}

/** Bottom inset when the tab bar is hidden (full-height stack screens). */
export function useFullScreenBottomInset(extra = theme.spacing.xl): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, extra);
}

export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 8);
}

/** Bottom padding for bottom sheets and modals. */
export function useSheetBottomPadding(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, theme.spacing.lg);
}
