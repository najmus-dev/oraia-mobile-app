import React from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemedStyles } from '../hooks/useTheme';
import { brand } from '../theme/brand';
import agencyLogo from '../../assets/oraia-logo.png';

const LOGO_WIDTH = {
  splash: 220,
  hero: 140,
  compact: 108,
} as const;

/** Logo asset is a vertical lockup (mark + wordmark). */
const LOGO_ASPECT = 0.78;
/** Brand guide: clear space = 1/4 logo width on each side. */
const CLEAR_SPACE_RATIO = 0.25;

type Size = keyof typeof LOGO_WIDTH;

type Props = {
  size?: Size;
  tagline?: string;
  style?: StyleProp<ViewStyle>;
};

/** Full ORAIA brand mark — logo image already includes the wordmark. */
export function BrandLockup({ size = 'hero', tagline = brand.tagline, style }: Props) {
  const width = LOGO_WIDTH[size];
  const clearSpace = width * CLEAR_SPACE_RATIO;
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      wrap: {
        alignItems: 'center',
        padding: clearSpace,
      },
      logo: {
        maxWidth: '88%',
        width,
        height: width * LOGO_ASPECT,
      },
      tagline: {
        marginTop: t.spacing.md,
        maxWidth: 300,
        color: t.colors.shellForegroundMuted,
        fontFamily: t.typography.fontFamily.regular,
        fontSize: t.typography.fontSize.sm,
        textAlign: 'center',
        lineHeight: t.typography.lineHeight.md,
      },
    }),
  );

  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={agencyLogo}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel={brand.productName}
      />
      {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
    </View>
  );
}
