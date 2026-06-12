import { palette } from './palette';

export const lightColors = {
  primary: palette.richIndigo,
  navy: palette.deepNavy,
  secondary: palette.wisteria,
  lavender: palette.pastelLavender,

  white: palette.white,
  black: palette.black,

  background: palette.white,
  backgroundDark: palette.deepNavy,
  surface: '#F8F6FB',
  surfaceMuted: '#F0ECF5',
  surfaceElevated: palette.white,

  /** Primary text on background / surface */
  text: palette.deepNavy,
  textOnDark: palette.white,
  mutedText: 'rgba(14, 19, 35, 0.65)',
  mutedTextOnDark: 'rgba(255, 255, 255, 0.75)',
  /** Text on shell chrome (headers, tab area) — always light on indigo/navy */
  shellForeground: palette.white,
  shellForegroundMuted: 'rgba(255, 255, 255, 0.75)',
  /** Alias for content areas; mirrors text / mutedText */
  foreground: palette.deepNavy,
  foregroundMuted: 'rgba(14, 19, 35, 0.65)',
  /** TextInput placeholder on background / surface (same as foregroundMuted) */
  inputPlaceholder: 'rgba(14, 19, 35, 0.65)',
  border: 'rgba(14, 19, 35, 0.10)',
  borderLight: 'rgba(14, 19, 35, 0.12)',

  shell: palette.richIndigo,
  shellElevated: '#262478',
  /** Modal bottom sheets (BottomSheet component) — light panel on light UI */
  sheet: palette.white,
  tabBar: palette.white,
  tabActive: palette.richIndigo,

  danger: '#EF4444',
  success: '#15803D',
  warning: '#B45309',
  info: palette.richIndigo,
  link: '#5B4F8C',

  /** Loading overlay scrim on content areas */
  scrim: 'rgba(255, 255, 255, 0.9)',
  scrimForeground: palette.deepNavy,
  scrimForegroundMuted: 'rgba(14, 19, 35, 0.72)',
  scrimSpinner: palette.richIndigo,

  formCard: palette.white,
  formCardText: palette.deepNavy,
  formCardMuted: 'rgba(14, 19, 35, 0.65)',
  formCardBorder: 'rgba(14, 19, 35, 0.12)',

  isDark: false as const,
};

export type OraiaLightColors = typeof lightColors;
