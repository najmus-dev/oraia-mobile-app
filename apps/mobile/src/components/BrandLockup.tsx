import React from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../theme';
import agencyLogo from '../../assets/oraia-logo.png';

const LOGO_WIDTH = {
  splash: 220,
  hero: 140,
  compact: 108,
} as const;

/** Logo asset is a vertical lockup (mark + wordmark). */
const LOGO_ASPECT = 0.78;

type Size = keyof typeof LOGO_WIDTH;

type Props = {
  size?: Size;
  tagline?: string;
  style?: StyleProp<ViewStyle>;
};

/** Full ORAIA brand mark — logo image already includes the wordmark. */
export function BrandLockup({ size = 'hero', tagline, style }: Props) {
  const width = LOGO_WIDTH[size];

  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={agencyLogo}
        style={[styles.logo, { width, height: width * LOGO_ASPECT }]}
        resizeMode="contain"
        accessibilityLabel="ORAIA CRM"
      />
      {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  logo: {
    maxWidth: '88%',
  },
  tagline: {
    marginTop: theme.spacing.md,
    maxWidth: 300,
    color: theme.colors.mutedTextOnDark,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.md,
  },
});
