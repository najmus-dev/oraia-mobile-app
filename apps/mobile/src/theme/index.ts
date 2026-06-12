import { darkTheme } from './createTheme';

/** Static dark theme for legacy imports during migration. Prefer useTheme(). */
export const theme = darkTheme;

export { palette } from './palette';
export { brand } from './brand';
export { radius } from './radius';
export { shadowsDark, shadowsLight } from './shadows';
export { darkColors } from './colorsDark';
export { lightColors } from './colorsLight';
export { createTheme, darkTheme, lightTheme } from './createTheme';
export type { OraiaTheme, ColorScheme } from './createTheme';
export type { OraiaColors } from './colorsDark';
export { spacing } from './spacing';
export { typography } from './typography';
