import { useMemo } from 'react';
import { useThemeState } from '../state/ThemeState';
import type { OraiaTheme } from '../theme/createTheme';

export function useTheme(): OraiaTheme {
  const { theme } = useThemeState();
  return theme;
}

export function useThemedStyles<T>(factory: (theme: OraiaTheme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
