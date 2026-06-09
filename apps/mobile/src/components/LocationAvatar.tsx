import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { isAgencyBrandLocation, locationInitials } from '../lib/locationDisplay';
import agencyLogo from '../../assets/oraia-logo.png';

type Props = {
  name?: string | null;
  logoUrl?: string | null;
  size?: number;
};

export function LocationAvatar({ name, logoUrl, size = 44 }: Props) {
  const [logoFailed, setLogoFailed] = useState(false);
  const label = name?.trim() || '?';
  const useAgencyLogo = isAgencyBrandLocation(name);
  const showRemote = !logoFailed && !!logoUrl?.trim() && !useAgencyLogo;

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl, name]);

  if (useAgencyLogo) {
    return <Image source={agencyLogo} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />;
  }

  if (showRemote) {
    return (
      <Image
        source={{ uri: logoUrl!.trim() }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => setLogoFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: size * 0.32 }]}>{locationInitials(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  initials: {
    color: theme.colors.white,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
});
