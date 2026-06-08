import { theme } from '../theme';

/** Standard FAB diameter. */
export const FAB_SIZE = 56;

/** Horizontal inset from the screen edge. */
export const FAB_RIGHT = theme.spacing.xl;

/**
 * Bottom inset on tab-root screens.
 * Tab bar lives outside the screen — only add a small gap from the content bottom.
 */
export const FAB_BOTTOM = theme.spacing.lg;

/** List/scroll padding so the last row is not hidden under the FAB. */
export const FAB_LIST_PADDING_BOTTOM = FAB_SIZE + FAB_BOTTOM + theme.spacing.md;
