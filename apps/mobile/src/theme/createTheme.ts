import { brand } from './brand';
import { darkColors } from './colorsDark';
import { lightColors } from './colorsLight';
import { radius } from './radius';
import { shadowsDark, shadowsLight } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

export type ColorScheme = 'light' | 'dark';

export function createTheme(scheme: ColorScheme) {
  const colors = scheme === 'dark' ? darkColors : lightColors;
  const shadows = scheme === 'dark' ? shadowsDark : shadowsLight;
  return {
    colors,
    spacing,
    typography,
    radius,
    shadows,
    brand,
    colorScheme: scheme,
  };
}

export type OraiaTheme = ReturnType<typeof createTheme>;

export const darkTheme = createTheme('dark');
export const lightTheme = createTheme('light');
