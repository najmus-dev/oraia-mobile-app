import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../hooks/useTheme';
import type { OraiaTheme } from '../theme';
import { isAgencyBrandLocation, locationInitials } from '../lib/locationDisplay';
import agencyLogo from '../../assets/oraia-logo.png';

type Props = {
  name?: string | null;
  logoUrl?: string | null;
  size?: number;
};

/** Header avatar — no extra chip; sits on the shell header color behind it. */
export function LocationAvatar({ name, logoUrl, size = 44 }: Props) {
  const styles = useThemedStyles(createStyles);
  const [logoFailed, setLogoFailed] = useState(false);
  const label = name?.trim() || '?';
  const useAgencyLogo = isAgencyBrandLocation(name);
  const showRemote = !logoFailed && !!logoUrl?.trim() && !useAgencyLogo;

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl, name]);

  if (useAgencyLogo) {
    const markSize = Math.round(size * 1.38);
    return (
      <View
        style={[styles.agencyMark, { width: size, height: size, borderRadius: size / 2 }]}
        accessibilityRole="image"
        accessibilityLabel="ORAIA CRM"
      >
        <Image
          source={agencyLogo}
          style={{ width: markSize, height: markSize }}
          resizeMode="cover"
        />
      </View>
    );
  }

  if (showRemote) {
    return (
      <View style={[styles.remoteFrame, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image
          source={{ uri: logoUrl!.trim() }}
          style={[styles.remoteImage, { width: size, height: size, borderRadius: size / 2 }]}
          onError={() => setLogoFailed(true)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: size * 0.32 }]}>{locationInitials(label)}</Text>
    </View>
  );
}

function createStyles(theme: OraiaTheme) {
  return StyleSheet.create({
    agencyMark: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      overflow: 'hidden',
    },
    remoteFrame: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.18)',
      overflow: 'hidden',
    },
    remoteImage: {
      backgroundColor: 'transparent',
    },
    fallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.14)',
    },
    initials: {
      color: theme.colors.white,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
  });
}
