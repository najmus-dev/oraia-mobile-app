export const typography = {
  /**
   * Brand font is Inter. We will load it next (Expo fonts) and wire these names.
   * Until then, React Native will fall back to the system font.
   */
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
  },
  lineHeight: {
    sm: 18,
    md: 22,
    lg: 26,
    xl: 32,
  },
};

export type OraiaTypography = typeof typography;
