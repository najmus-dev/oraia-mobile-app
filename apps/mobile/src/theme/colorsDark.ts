import { palette } from './palette';

export const darkColors = {
  primary: palette.richIndigo,
  navy: palette.deepNavy,
  secondary: palette.wisteria,
  lavender: palette.pastelLavender,

  white: palette.white,
  black: palette.black,

  background: palette.deepNavy,
  backgroundDark: palette.deepNavy,
  surface: '#171C2C',
  surfaceMuted: '#222838',
  surfaceElevated: '#1E2436',

  /** Primary text on background / surface */
  text: palette.white,
  textOnDark: palette.white,
  mutedText: 'rgba(255, 255, 255, 0.65)',
  mutedTextOnDark: 'rgba(255, 255, 255, 0.65)',
  /** Text on shell chrome (headers, tab area) — always light on indigo/navy */
  shellForeground: palette.white,
  shellForegroundMuted: 'rgba(255, 255, 255, 0.75)',
  /** Alias for content areas; mirrors text / mutedText */
  foreground: palette.white,
  foregroundMuted: 'rgba(255, 255, 255, 0.65)',
  /** TextInput placeholder on background / surface (same as foregroundMuted) */
  inputPlaceholder: 'rgba(255, 255, 255, 0.65)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(14, 19, 35, 0.12)',

  shell: palette.deepNavy,
  shellElevated: '#12182A',
  /** Modal bottom sheets (BottomSheet component) */
  sheet: '#12182A',
  tabBar: '#0A0E1A',
  tabActive: palette.richIndigo,

  danger: '#EF4444',
  success: '#6EE7A0',
  warning: '#FBBF24',
  info: palette.wisteria,
  link: palette.wisteria,

  /** Loading overlay scrim on content areas */
  scrim: 'rgba(10, 14, 26, 0.78)',
  scrimForeground: palette.white,
  scrimForegroundMuted: 'rgba(255, 255, 255, 0.75)',
  scrimSpinner: palette.wisteria,

  /** Auth form card on dark shell */
  formCard: palette.white,
  formCardText: palette.deepNavy,
  formCardMuted: 'rgba(14, 19, 35, 0.65)',
  formCardBorder: 'rgba(14, 19, 35, 0.12)',

  isDark: true as const,
};

export type OraiaColors = typeof darkColors;
