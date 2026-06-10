import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AuthShell } from './AuthShell';
import { BrandLockup } from './BrandLockup';
import { BootstrapLoader } from './BootstrapLoader';

type Props = {
  message?: string;
};

/** Full-screen bootstrap state — matches native splash layout. */
export function AppLoadingScreen({ message }: Props) {
  return (
    <AuthShell>
      <View style={styles.container}>
        <BrandLockup size="splash" />
        <BootstrapLoader message={message} />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
